"use client";

import { useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Chessboard } from "react-chessboard";
import { cn } from "@/app/lib/cn";
import { useTransitionStore } from "@/app/stores/transition-store";

interface MiniBoardProps {
  fen: string;
  size?: number;
  /** When true, board is focused: shows hover effects and is clickable to analyze */
  focused?: boolean;
  onAnalyze?: () => void;
}

/**
 * Mini board for graph nodes.
 *
 * Focus state controls all interactivity:
 * - Hover effects (scale, ring, shadow) via CSS :hover
 * - Clickability (navigate to analyze page)
 * - View transition target
 */
export function MiniBoard({
  fen,
  size = 154,
  focused = false,
  onAnalyze,
}: MiniBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const isNavigating = useRef(false);
  const searchParams = useSearchParams();
  const setTransitioning = useTransitionStore((s) => s.setTransitioning);

  // Check if this board is the target of a return transition from Analyze
  const focusFen = searchParams.get("focus")
    ? decodeURIComponent(searchParams.get("focus")!)
    : null;
  const isReturnTarget = focusFen === fen;

  // View transition name: apply when focused OR returning from analyze
  // Computed directly (not memoized) to ensure it's always in sync with focused state
  const viewTransitionName = focused || isReturnTarget ? "chess-board" : undefined;

  // Handle click to navigate to analyze page
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (!focused || !onAnalyze) return;
      e.stopPropagation();

      if (isNavigating.current) return;
      isNavigating.current = true;

      // Ensure viewTransitionName is applied to DOM before starting transition
      if (boardRef.current) {
        boardRef.current.style.viewTransitionName = "chess-board";
      }

      // Wait for the browser to paint the viewTransitionName before starting transition
      // Double rAF ensures we're past the paint
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      if (document.startViewTransition) {
        setTransitioning(true);
        const transition = document.startViewTransition(() => {
          onAnalyze();
          return new Promise<void>((resolve) => setTimeout(resolve, 50));
        });
        transition.finished.then(() => {
          setTransitioning(false);
          isNavigating.current = false;
        });
      } else {
        onAnalyze();
        setTimeout(() => {
          isNavigating.current = false;
        }, 500);
      }
    },
    [focused, onAnalyze, setTransitioning]
  );

  return (
    <div
      ref={boardRef}
      data-focused={focused}
      className={cn(
        "relative rounded-lg mx-auto transition-all duration-200",
        "data-[focused=true]:cursor-pointer",
        "data-[focused=true]:hover:ring-2 data-[focused=true]:hover:ring-accent",
        "data-[focused=true]:hover:shadow-lg data-[focused=true]:hover:scale-[1.02]"
      )}
      style={{
        width: size,
        height: size,
        viewTransitionName,
      }}
      onClick={handleClick}
    >
      {/* Pointer-events-none ensures mouse events bubble to parent */}
      <div className="pointer-events-none rounded-lg overflow-hidden">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: "white",
            allowDragging: false,
            showNotation: false,
            boardStyle: { borderRadius: "8px" },
            darkSquareStyle: { backgroundColor: "#A67B5B" },
            lightSquareStyle: { backgroundColor: "#E8D5B5" },
          }}
        />
      </div>
    </div>
  );
}
