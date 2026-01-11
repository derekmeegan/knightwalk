"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  Suspense,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ChessBoard } from "./_components/chess-board";
import { BoardControls } from "./_components/board-controls";
import { EvalBar } from "./_components/eval-bar";
import { PVLines } from "./_components/pv-lines";
import { useEngine } from "@/app/hooks/use-engine";
import { createGame, STARTING_FEN } from "@/app/lib/chess";
import { useTransitionStore } from "@/app/stores/transition-store";
import type { Move, EngineEvaluation } from "@/app/lib/chess/types";

// Memoized score display component to prevent re-renders
const ScoreDisplay = memo(function ScoreDisplay({
  evaluation,
}: {
  evaluation?: EngineEvaluation;
}) {
  if (!evaluation)
    return <span className="font-mono text-lg font-semibold">0.00</span>;

  const { score, scoreType, mateIn } = evaluation;

  if (scoreType === "mate" && mateIn !== undefined) {
    return (
      <span className="font-mono text-lg font-semibold">
        {mateIn > 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`}
      </span>
    );
  }

  const pawnScore = score / 100;
  const sign = pawnScore >= 0 ? "+" : "";
  return (
    <span className="font-mono text-lg font-semibold">
      {sign}
      {pawnScore.toFixed(2)}
    </span>
  );
});

// Memoized engine status indicator
const EngineStatus = memo(function EngineStatus({ state }: { state: string }) {
  const statusColor =
    {
      idle: "bg-zinc-400",
      loading: "bg-amber-500 animate-pulse",
      ready: "bg-emerald-500",
      analyzing: "bg-blue-500 animate-pulse",
      paused: "bg-amber-500",
      error: "bg-red-500",
    }[state] || "bg-zinc-400";

  return <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />;
});

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setTransitioning = useTransitionStore((s) => s.setTransitioning);

  // Get initial FEN from URL params (from Explore mode)
  const initialFen = searchParams.get("fen")
    ? decodeURIComponent(searchParams.get("fen")!)
    : STARTING_FEN;

  // Handle back navigation with View Transitions (returns to same position)
  const handleBackToExplore = useCallback(async () => {
    const targetUrl = `/explore?focus=${encodeURIComponent(initialFen)}`;

    if (document.startViewTransition) {
      setTransitioning(true);

      const transition = document.startViewTransition(() => {
        router.push(targetUrl);
        return new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
      });

      transition.finished
        .then(() => {
          setTransitioning(false);
        })
        .catch(() => {
          // Handle navigation failure gracefully
          setTransitioning(false);
        });
    } else {
      router.push(targetUrl);
    }
  }, [initialFen, router, setTransitioning]);

  // Handle escape - goes to clean /explore URL
  const handleEscape = useCallback(() => {
    router.push("/explore");
  }, [router]);

  // Game state
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [orientation, setOrientation] = useState<"white" | "black">("white");

  // Engine hook
  const { info: engineInfo, isReady, analyze, pause, resume } = useEngine();

  // Current position FEN - memoized to avoid recalculating
  const currentFen = useMemo(() => {
    if (currentMoveIndex < 0) return initialFen;
    // Replay moves up to current index
    const tempGame = createGame(initialFen);
    for (let i = 0; i <= currentMoveIndex; i++) {
      tempGame.move(moves[i].san);
    }
    return tempGame.fen();
  }, [initialFen, moves, currentMoveIndex]);

  // Last move for highlighting
  const lastMove = useMemo(() => {
    if (currentMoveIndex < 0) return null;
    const move = moves[currentMoveIndex];
    return move ? { from: move.from, to: move.to } : null;
  }, [moves, currentMoveIndex]);

  // Best move from engine
  const bestMove = useMemo(() => {
    const pv = engineInfo?.evaluations[0]?.pv;
    if (!pv || pv.length === 0) return null;
    const move = pv[0];
    // UCI format: e2e4
    return {
      from: move.slice(0, 2),
      to: move.slice(2, 4),
    };
  }, [engineInfo]);

  // Analyze current position when it changes or engine becomes ready
  useEffect(() => {
    if (isReady && currentFen) {
      analyze(currentFen);
    }
  }, [currentFen, isReady, analyze]);

  // Handle user move
  const handleMove = useCallback(
    (move: Move) => {
      // Truncate future moves if we're not at the end
      const newMoves = moves.slice(0, currentMoveIndex + 1);
      newMoves.push(move);
      setMoves(newMoves);
      setCurrentMoveIndex(newMoves.length - 1);
    },
    [moves, currentMoveIndex],
  );

  // Navigation functions
  const goToStart = useCallback(() => setCurrentMoveIndex(-1), []);
  const goToEnd = useCallback(
    () => setCurrentMoveIndex(moves.length - 1),
    [moves.length],
  );
  const goToPrevious = useCallback(() => {
    setCurrentMoveIndex((i) => Math.max(-1, i - 1));
  }, []);
  const goToNext = useCallback(() => {
    setCurrentMoveIndex((i) => Math.min(moves.length - 1, i + 1));
  }, [moves.length]);
  const goToMove = useCallback((index: number) => {
    setCurrentMoveIndex(index);
  }, []);

  // Board controls
  const flipBoard = useCallback(() => {
    setOrientation((o) => (o === "white" ? "black" : "white"));
  }, []);

  const resetBoard = useCallback(() => {
    setMoves([]);
    setCurrentMoveIndex(-1);
  }, []);

  // Handle clicking a move in the PV lines - applies moves up to that point
  const handlePVMoveClick = useCallback(
    (uciMoves: string[]) => {
      // Start from current position and apply the UCI moves
      const tempGame = createGame(currentFen);
      const newMoves: Move[] = [];

      for (const uciMove of uciMoves) {
        // Parse UCI move (e.g., "e2e4" or "e7e8q" for promotion)
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        const move = tempGame.move({ from, to, promotion });
        if (move) {
          newMoves.push(move);
        } else {
          break; // Stop if move is invalid
        }
      }

      if (newMoves.length > 0) {
        // Append the new moves to current move list (truncating any future moves)
        const existingMoves = moves.slice(0, currentMoveIndex + 1);
        setMoves([...existingMoves, ...newMoves]);
        setCurrentMoveIndex(existingMoves.length + newMoves.length - 1);
      }
    },
    [currentFen, moves, currentMoveIndex],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          handleEscape();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            goToStart();
          } else {
            goToPrevious();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            goToEnd();
          } else {
            goToNext();
          }
          break;
        case "f":
          e.preventDefault();
          flipBoard();
          break;
        case " ":
          e.preventDefault();
          if (engineInfo?.state === "analyzing") {
            pause();
          } else {
            resume();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    goToStart,
    goToEnd,
    goToPrevious,
    goToNext,
    flipBoard,
    pause,
    resume,
    engineInfo?.state,
    handleEscape,
  ]);

  // Extract score for memoized components
  const primaryEval = engineInfo?.evaluations[0];
  const score = primaryEval?.score ?? 0;
  const evaluations = engineInfo?.evaluations ?? [];

  return (
    <div className="flex-1 px-4 py-2 lg:py-6 flex flex-col justify-center items-center overflow-hidden">
      <div className="flex flex-col gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToExplore}
          className="px-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Board with vertical eval bar */}
        <div className="flex-shrink-0">
          <div className="flex gap-4 lg:gap-6 xl:gap-8">
            {/* Vertical Eval Bar with engine status */}
            <div className="w-8 lg:w-10 flex flex-col items-center flex-shrink-0">
              <ScoreDisplay evaluation={primaryEval} />
              <div className="flex-1 w-full mt-2">
                <EvalBar score={score} orientation="vertical" size={32} />
              </div>
              <div className="mt-2">
                <EngineStatus state={engineInfo?.state || "idle"} />
              </div>
            </div>

            {/* Chess board - responsive sizing based on viewport */}
            {/* Mobile: constrain by width, Desktop: constrain by height */}
            <div className="flex-1 max-w-[min(calc(100vw-80px),calc(100vh-320px),400px)] lg:max-w-[min(calc(100vh-240px),700px)]">
              <ChessBoard
                fen={currentFen}
                onMove={handleMove}
                orientation={orientation}
                lastMove={lastMove}
                bestMove={bestMove}
              />
            </div>
          </div>
        </div>

        {/* Board controls */}
        <div className="flex-shrink-0 max-w-[min(calc(100vw-80px),calc(100vh-320px),400px)] lg:max-w-[min(calc(100vh-240px),700px)] pl-12 lg:pl-16 box-content">
          <BoardControls
            onFirst={goToStart}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onLast={goToEnd}
            onFlip={flipBoard}
            onReset={resetBoard}
            canGoBack={currentMoveIndex >= 0}
            canGoForward={currentMoveIndex < moves.length - 1}
          />
        </div>

        {/* Suggested moves (PVLines) - below board */}
        <div className="flex-shrink-0 max-w-[min(calc(100vw-80px),calc(100vh-320px),400px)] lg:max-w-[min(calc(100vh-240px),700px)] pl-12 lg:pl-16 box-content">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <h3 className="text-xs font-medium text-zinc-500 mb-2">
              Best Lines
            </h3>
            <PVLines
              evaluations={evaluations}
              maxLines={3}
              currentFen={currentFen}
              onMoveClick={handlePVMoveClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            {/* Placeholder with viewTransitionName to ensure smooth transition */}
            <div
              className="w-[400px] h-[400px] bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4 mx-auto"
              style={{ viewTransitionName: "chess-board" }}
            />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4" />
            <p className="text-zinc-500">Loading analyze mode...</p>
          </div>
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
