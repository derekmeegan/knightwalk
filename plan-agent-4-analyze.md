# Agent 4: Analyze Mode (Board UI) Plan

## Project Context

You are building **Analyze Mode** for **Knightwalker**, a chess opening visualization app. Analyze Mode provides:
- Full interactive chess board
- Stockfish engine analysis panel
- Move list with opening name annotations
- Games list showing games that reached the current position

Users enter Analyze Mode from Explore Mode (by clicking "Analyze" on a position) or directly via URL.

**Main plan reference**: `/Users/d/Desktop/me/knightwalk/plan.md` (see "ANALYZE MODE", "Stockfish Integration", "Visual UX Details" sections)

---

## Important: Existing Project Context

**You are working in an existing Next.js 16 project with Tailwind v4 already configured.**

- Do NOT run `create-next-app` or initialize a new project
- The project uses the App Router (all routes in `/app/`)
- Dependencies are already partially installed by the Foundation agent
- shadcn/ui components are available in `app/components/ui/`

---

## Directory Structure Convention

This project uses **feature-based colocation** with underscore prefixes for non-routable directories.

```
/app/
├── /explore/                     # Agent 3's domain
│
├── /analyze/                     # YOUR DOMAIN - Analyze feature
│   ├── page.tsx                 # Main analyze page
│   ├── /_components/            # Analyze-specific components (NOT routable)
│   │   ├── chess-board.tsx
│   │   ├── board-controls.tsx
│   │   ├── engine-panel.tsx
│   │   ├── eval-bar.tsx
│   │   ├── pv-lines.tsx
│   │   ├── move-list.tsx
│   │   ├── games-list.tsx
│   │   └── game-card.tsx
│   ├── /_hooks/                 # Analyze-specific hooks (NOT routable)
│   └── /_lib/                   # Analyze-specific utils (NOT routable)
│
├── /components/                  # ONLY truly shared components
│   └── /ui/                     # shadcn primitives
│
├── /lib/                         # Global utilities
│   ├── cn.ts
│   ├── /chess/                  # Agent 2's domain - USE these
│   └── /db/                     # Agent 1's domain - USE these
│
├── /hooks/                       # ONLY global hooks (used by 2+ features)
│   └── use-engine.ts            # Created by Agent 2 - USE this
│
└── /stores/
    └── app-store.ts
```

**Key Rules**:
- Underscore prefix (`_`) makes directories non-routable
- Your code goes in `app/analyze/` feature folder
- Use `_components`, `_hooks`, `_lib` prefixes for non-routable subdirs

---

## Your Role

You are **Agent 4: Analyze Mode**. You handle:
- react-chessboard setup and styling
- Interactive board with drag-and-drop
- Engine analysis panel (displays Stockfish output)
- Evaluation bar visualization
- Move list component with navigation
- Opening name annotations in move list
- Games list with virtual scrolling
- Board controls (flip, reset, navigation)

---

## Boundaries

### You ARE responsible for:
- `app/analyze/_components/` - ALL Analyze-specific components
- `app/analyze/_hooks/` - ALL Analyze-specific hooks
- `app/analyze/_lib/` - ALL Analyze-specific utilities
- `app/analyze/page.tsx` - Analyze mode page

### You are NOT responsible for:
- Stockfish WASM loading and engine logic → Agent 2
- Database queries for games → Agent 1
- Graph visualization → Agent 3
- Shared components (header) → Foundation

### Sensitive Overlap Areas:

| Area | Your Role | Other Agent |
|------|-----------|-------------|
| `app/stores/app-store.ts` | Use existing fields, add analyze-specific state | Foundation created skeleton |
| `app/hooks/use-engine.ts` | You USE this hook | Agent 2 CREATED it |
| `app/hooks/use-games.ts` | You USE this hook | Agent 1 CREATED it |
| `app/lib/chess/game.ts` | You USE ChessGame class | Agent 2 CREATED it |
| Engine evaluation | You DISPLAY | Agent 2 PROVIDES via hook |
| Position from Explore | You RECEIVE via URL param | Agent 3 SENDS |

### If you need to:
- Modify `app/stores/app-store.ts` → Add your state, don't remove existing
- Add significant new dependencies → **ASK HUMAN FIRST**
- Modify engine logic → **STOP, that's Agent 2's job**
- Modify database queries → **STOP, that's Agent 1's job**

---

## Detailed Tasks

### 1. Create Chess Board Component

**File: `app/analyze/_components/chess-board.tsx`**

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { Square, Piece } from "react-chessboard/dist/chessboard/types";
import { createGame } from "@/app/lib/chess";
import type { Move } from "@/app/lib/chess/types";

interface ChessBoardProps {
  fen: string;
  onMove?: (move: Move) => void;
  orientation?: "white" | "black";
  interactive?: boolean;
  showLegalMoves?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMove?: { from: string; to: string } | null;
  arrows?: Array<[string, string, string?]>;  // [from, to, color?]
}

export function ChessBoard({
  fen,
  onMove,
  orientation = "white",
  interactive = true,
  showLegalMoves = true,
  lastMove,
  bestMove,
  arrows = [],
}: ChessBoardProps) {
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  // Create game instance for move validation
  const game = useMemo(() => createGame(fen), [fen]);

  // Custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight last move
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: "rgba(247, 236, 89, 0.4)",
      };
      styles[lastMove.to] = {
        backgroundColor: "rgba(247, 236, 89, 0.4)",
      };
    }

    // Highlight selected square
    if (moveFrom) {
      styles[moveFrom] = {
        backgroundColor: "rgba(74, 144, 217, 0.4)",
      };
    }

    // Show legal move indicators
    if (showLegalMoves && legalMoves.length > 0) {
      legalMoves.forEach((square) => {
        const piece = game.get(square as any);
        styles[square] = {
          background: piece
            ? "radial-gradient(circle, rgba(0,0,0,0.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)",
          ...styles[square],
        };
      });
    }

    return styles;
  }, [lastMove, moveFrom, legalMoves, showLegalMoves, game]);

  // Custom arrows (for best move indicator)
  const customArrows = useMemo(() => {
    const result: Array<[Square, Square, string?]> = [];

    // Add best move arrow
    if (bestMove) {
      result.push([
        bestMove.from as Square,
        bestMove.to as Square,
        "rgba(164, 117, 240, 0.7)", // Purple for engine suggestion
      ]);
    }

    // Add any additional arrows
    arrows.forEach(([from, to, color]) => {
      result.push([from as Square, to as Square, color]);
    });

    return result;
  }, [bestMove, arrows]);

  // Handle square click
  const onSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) return;

      // If we have a piece selected
      if (moveFrom) {
        // Try to make the move
        if (legalMoves.includes(square)) {
          const move = game.move({ from: moveFrom, to: square });
          if (move && onMove) {
            onMove(move);
          }
        }
        // Clear selection
        setMoveFrom(null);
        setLegalMoves([]);
        return;
      }

      // Select a piece
      const piece = game.get(square as any);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        const moves = game.getLegalMovesForSquare(square as any);
        setLegalMoves(moves.map((m) => m.to as Square));
      }
    },
    [interactive, moveFrom, legalMoves, game, onMove]
  );

  // Handle drag and drop
  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece: Piece): boolean => {
      if (!interactive) return false;

      // Check if it's a promotion
      const isPromotion =
        piece[1] === "P" &&
        ((piece[0] === "w" && targetSquare[1] === "8") ||
          (piece[0] === "b" && targetSquare[1] === "1"));

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? "q" : undefined,  // Auto-promote to queen for now
      });

      if (move && onMove) {
        onMove(move);
        return true;
      }

      return false;
    },
    [interactive, game, onMove]
  );

  // Handle piece drag begin
  const onPieceDragBegin = useCallback(
    (_piece: Piece, sourceSquare: Square) => {
      if (!interactive) return;

      const moves = game.getLegalMovesForSquare(sourceSquare as any);
      setLegalMoves(moves.map((m) => m.to as Square));
      setMoveFrom(sourceSquare);
    },
    [interactive, game]
  );

  // Handle piece drag end
  const onPieceDragEnd = useCallback(() => {
    setLegalMoves([]);
    setMoveFrom(null);
  }, []);

  return (
    <div className="relative">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
        customSquareStyles={customSquareStyles}
        customArrows={customArrows}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        }}
        customDarkSquareStyle={{
          backgroundColor: "hsl(25, 35%, 52%)",  // #A67B5B
        }}
        customLightSquareStyle={{
          backgroundColor: "hsl(35, 45%, 85%)",  // #E8D5B5
        }}
        areArrowsAllowed={true}
        arePiecesDraggable={interactive}
      />
    </div>
  );
}
```

### 2. Create Board Controls Component

**File: `app/analyze/_components/board-controls.tsx`**

```typescript
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";

interface BoardControlsProps {
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  onReset: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function BoardControls({
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onFlip,
  onReset,
  canGoBack,
  canGoForward,
}: BoardControlsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between">
        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onFirst}
                disabled={!canGoBack}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to start (Shift+←)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous move (←)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next move (→)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onLast}
                disabled={!canGoForward}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to end (Shift+→)</TooltipContent>
          </Tooltip>
        </div>

        {/* Board controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onFlip}>
                <FlipVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flip board (F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset position</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
```

### 3. Create Engine Panel Component

**File: `app/analyze/_components/engine-panel.tsx`**

```typescript
"use client";

import { Pause, Play, Cloud, Cpu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";
import { EvalBar } from "./eval-bar";
import { PVLines } from "./pv-lines";
import type { EngineInfo } from "@/app/lib/chess/types";

interface EnginePanelProps {
  info: EngineInfo | null;
  onPause: () => void;
  onResume: () => void;
  onDepthChange: (depth: number) => void;
}

export function EnginePanel({
  info,
  onPause,
  onResume,
  onDepthChange,
}: EnginePanelProps) {
  const isAnalyzing = info?.state === "analyzing";
  const isPaused = info?.state === "paused";
  const isReady = info?.state === "ready";
  const isLoading = info?.state === "loading";

  // Get primary evaluation
  const primaryEval = info?.evaluations[0];
  const score = primaryEval?.score ?? 0;
  const scoreDisplay = formatScore(primaryEval);

  return (
    <div className="bg-surface border border-border-subtle rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-surface-hover">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-text-secondary" />
          <span className="font-medium text-text-primary">
            {info?.name || "Stockfish"}
          </span>
          <span className="text-sm text-text-tertiary">
            Depth: {info?.depth || 0}/{info?.maxDepth || 16}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Engine state indicator */}
          <EngineStateIndicator state={info?.state || "idle"} />

          {/* Pause/Resume button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isAnalyzing ? onPause : onResume}
            disabled={isLoading}
          >
            {isAnalyzing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Evaluation bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-semibold text-text-primary min-w-[60px]">
            {scoreDisplay}
          </span>
          <EvalBar score={score} />
        </div>
      </div>

      {/* Principal variations */}
      <div className="px-3 pb-3">
        <PVLines evaluations={info?.evaluations || []} />
      </div>

      {/* Depth slider */}
      <div className="px-3 pb-3 pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">Depth</span>
          <Slider
            value={[info?.maxDepth || 16]}
            min={10}
            max={22}
            step={1}
            onValueChange={([value]) => onDepthChange(value)}
            className="flex-1"
          />
          <span className="text-sm font-mono text-text-primary w-6">
            {info?.maxDepth || 16}
          </span>
        </div>
      </div>
    </div>
  );
}

function EngineStateIndicator({ state }: { state: string }) {
  const config = {
    idle: { color: "bg-text-tertiary", label: "Ready" },
    loading: { color: "bg-amber-500 animate-pulse", label: "Loading..." },
    ready: { color: "bg-chess-white-wins", label: "Ready" },
    analyzing: { color: "bg-accent animate-pulse", label: "Analyzing..." },
    paused: { color: "bg-amber-500", label: "Paused" },
    error: { color: "bg-chess-black-wins", label: "Error" },
  }[state] || { color: "bg-text-tertiary", label: state };

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.label}</span>
    </div>
  );
}

function formatScore(eval_?: { score: number; scoreType: string; mateIn?: number }): string {
  if (!eval_) return "0.00";

  if (eval_.scoreType === "mate" && eval_.mateIn !== undefined) {
    return eval_.mateIn > 0 ? `M${eval_.mateIn}` : `-M${Math.abs(eval_.mateIn)}`;
  }

  const score = eval_.score / 100;  // Convert centipawns to pawns
  const sign = score >= 0 ? "+" : "";
  return `${sign}${score.toFixed(2)}`;
}
```

### 4. Create Evaluation Bar Component

**File: `app/analyze/_components/eval-bar.tsx`**

```typescript
"use client";

interface EvalBarProps {
  score: number;  // In centipawns
  height?: number;
}

export function EvalBar({ score, height = 24 }: EvalBarProps) {
  // Clamp score to ±1000 centipawns (±10 pawns) for display
  const clampedScore = Math.max(-1000, Math.min(1000, score));

  // Convert to percentage (0 = black winning, 50 = equal, 100 = white winning)
  // Using a sigmoid-like transformation for better visualization
  const percentage = scoreToPercentage(clampedScore);

  return (
    <div
      className="flex-1 rounded-full overflow-hidden bg-text-primary"
      style={{ height }}
    >
      <div
        className="h-full bg-surface transition-all duration-200 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Convert centipawn score to display percentage
function scoreToPercentage(score: number): number {
  // Use a sigmoid function for smooth transition
  // At ±500cp (±5 pawns), it's roughly 90%/10%
  const k = 0.004;  // Steepness factor
  const percentage = 100 / (1 + Math.exp(-k * score));
  return percentage;
}
```

### 5. Create PV Lines Component

**File: `app/analyze/_components/pv-lines.tsx`**

```typescript
"use client";

import type { EngineEvaluation } from "@/app/lib/chess/types";

interface PVLinesProps {
  evaluations: EngineEvaluation[];
  maxLines?: number;
}

export function PVLines({ evaluations, maxLines = 3 }: PVLinesProps) {
  if (evaluations.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: maxLines }).map((_, i) => (
          <div
            key={i}
            className="h-6 bg-surface-hover rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {evaluations.slice(0, maxLines).map((eval_, index) => (
        <PVLine key={index} evaluation={eval_} rank={index + 1} />
      ))}
    </div>
  );
}

function PVLine({ evaluation, rank }: { evaluation: EngineEvaluation; rank: number }) {
  const { pv, score, scoreType, mateIn, depth } = evaluation;

  // Format the principal variation (first 8 moves)
  const displayPV = formatPV(pv.slice(0, 8));

  // Format score
  const scoreDisplay = scoreType === "mate" && mateIn !== undefined
    ? (mateIn > 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`)
    : `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-tertiary w-4">{rank}.</span>
      <span className="font-mono text-text-secondary min-w-[50px]">
        {scoreDisplay}
      </span>
      <span className="font-mono text-text-primary truncate">
        {displayPV}
      </span>
      <span className="text-xs text-text-tertiary ml-auto">
        d{depth}
      </span>
    </div>
  );
}

// Format UCI moves to display format
// TODO: Convert to SAN when chess.js integration is complete
function formatPV(moves: string[]): string {
  // For now, just show UCI format
  // Agent 2's chess logic can convert to SAN
  return moves.join(" ");
}
```

### 6. Create Move List Component

**File: `app/analyze/_components/move-list.tsx`**

```typescript
"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { cn } from "@/app/lib/cn";
import type { Move } from "@/app/lib/chess/types";

interface MoveWithAnnotation extends Move {
  openingName?: string;  // Opening name that begins at this move
}

interface MoveListProps {
  moves: MoveWithAnnotation[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export function MoveList({ moves, currentMoveIndex, onMoveClick }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to current move
  useEffect(() => {
    if (currentMoveRef.current) {
      currentMoveRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentMoveIndex]);

  // Group moves into pairs (white + black)
  const movePairs: Array<{
    number: number;
    white: MoveWithAnnotation | null;
    black: MoveWithAnnotation | null;
    whiteIndex: number;
    blackIndex: number;
  }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i] || null,
      black: moves[i + 1] || null,
      whiteIndex: i,
      blackIndex: i + 1,
    });
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle bg-surface-hover">
        <h3 className="font-medium text-text-primary">Moves</h3>
      </div>

      <ScrollArea className="h-[300px]" ref={scrollRef}>
        <div className="p-2 space-y-0.5">
          {movePairs.map((pair) => (
            <div key={pair.number}>
              {/* Opening annotation */}
              {pair.white?.openingName && (
                <div className="px-2 py-1 text-xs text-accent font-medium">
                  {pair.white.openingName}
                </div>
              )}
              {pair.black?.openingName && !pair.white?.openingName && (
                <div className="px-2 py-1 text-xs text-accent font-medium">
                  {pair.black.openingName}
                </div>
              )}

              {/* Move row */}
              <div className="flex items-center">
                {/* Move number */}
                <span className="w-8 text-sm text-text-tertiary font-mono">
                  {pair.number}.
                </span>

                {/* White's move */}
                {pair.white && (
                  <button
                    ref={pair.whiteIndex === currentMoveIndex ? currentMoveRef : null}
                    onClick={() => onMoveClick(pair.whiteIndex)}
                    className={cn(
                      "flex-1 px-2 py-1 text-left text-sm font-mono rounded transition-colors",
                      pair.whiteIndex === currentMoveIndex
                        ? "bg-accent text-white"
                        : "hover:bg-surface-hover text-text-primary"
                    )}
                  >
                    {pair.white.san}
                  </button>
                )}

                {/* Black's move */}
                {pair.black && (
                  <button
                    ref={pair.blackIndex === currentMoveIndex ? currentMoveRef : null}
                    onClick={() => onMoveClick(pair.blackIndex)}
                    className={cn(
                      "flex-1 px-2 py-1 text-left text-sm font-mono rounded transition-colors",
                      pair.blackIndex === currentMoveIndex
                        ? "bg-accent text-white"
                        : "hover:bg-surface-hover text-text-primary"
                    )}
                  >
                    {pair.black.san}
                  </button>
                )}

                {/* Empty cell if no black move */}
                {!pair.black && pair.white && <div className="flex-1" />}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {moves.length === 0 && (
            <div className="text-center text-text-tertiary py-8">
              No moves yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 7. Create Games List Component

**File: `app/analyze/_components/games-list.tsx`**

```typescript
"use client";

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { GameCard } from "./game-card";
import type { Game } from "@/app/lib/db/database.types";

interface GamesListProps {
  games: Game[];
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onGameClick: (game: Game) => void;
  selectedGameId?: string;
}

export function GamesList({
  games,
  total,
  isLoading,
  hasMore,
  onLoadMore,
  onGameClick,
  selectedGameId,
}: GamesListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: games.length + (hasMore ? 1 : 0),  // +1 for loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,  // Estimated row height
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  // Load more when scrolling near the end
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  return (
    <div className="bg-surface border border-border-subtle rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle bg-surface-hover flex items-center justify-between">
        <h3 className="font-medium text-text-primary">Games</h3>
        <span className="text-sm text-text-secondary">
          {total.toLocaleString()} games
        </span>
      </div>

      <div
        ref={parentRef}
        className="h-[300px] overflow-auto"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {items.map((virtualItem) => {
            const isLoaderRow = virtualItem.index >= games.length;

            if (isLoaderRow) {
              return (
                <div
                  key="loader"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="flex items-center justify-center h-[72px]"
                >
                  <div className="text-sm text-text-tertiary">
                    {isLoading ? "Loading..." : "Load more"}
                  </div>
                </div>
              );
            }

            const game = games[virtualItem.index];

            return (
              <div
                key={game.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <GameCard
                  game={game}
                  isSelected={game.id === selectedGameId}
                  onClick={() => onGameClick(game)}
                />
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {games.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            No games found
          </div>
        )}
      </div>
    </div>
  );
}
```

### 8. Create Game Card Component

**File: `app/analyze/_components/game-card.tsx`**

```typescript
"use client";

import { cn } from "@/app/lib/cn";
import type { Game } from "@/app/lib/db/database.types";

interface GameCardProps {
  game: Game;
  isSelected: boolean;
  onClick: () => void;
}

export function GameCard({ game, isSelected, onClick }: GameCardProps) {
  const {
    white_player,
    black_player,
    white_elo,
    black_elo,
    result,
    date,
    event,
  } = game;

  // Format result
  const resultDisplay = {
    "1-0": { text: "1-0", color: "text-chess-white-wins" },
    "0-1": { text: "0-1", color: "text-chess-black-wins" },
    "1/2-1/2": { text: "½-½", color: "text-chess-draw" },
  }[result || ""] || { text: result || "?", color: "text-text-secondary" };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2 text-left transition-colors border-b border-border-subtle",
        isSelected
          ? "bg-accent-light"
          : "hover:bg-surface-hover"
      )}
    >
      {/* Players row */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">
              {white_player || "Unknown"}
            </span>
            {white_elo && (
              <span className="text-xs text-text-tertiary">
                ({white_elo})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary truncate">
              {black_player || "Unknown"}
            </span>
            {black_elo && (
              <span className="text-xs text-text-tertiary">
                ({black_elo})
              </span>
            )}
          </div>
        </div>

        {/* Result */}
        <span className={cn("font-mono font-semibold", resultDisplay.color)}>
          {resultDisplay.text}
        </span>
      </div>

      {/* Event and date */}
      <div className="flex items-center justify-between mt-1 text-xs text-text-tertiary">
        <span className="truncate">{event || "Unknown event"}</span>
        <span>{date || "?"}</span>
      </div>
    </button>
  );
}
```

### 9. Create Analyze Page

**File: `app/analyze/page.tsx`**

```typescript
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ChessBoard } from "./_components/chess-board";
import { BoardControls } from "./_components/board-controls";
import { EnginePanel } from "./_components/engine-panel";
import { MoveList } from "./_components/move-list";
import { GamesList } from "./_components/games-list";
import { useEngine } from "@/app/hooks/use-engine";
import { createGame, STARTING_FEN } from "@/app/lib/chess";
import type { Move } from "@/app/lib/chess/types";

// Import mock data for development
import { MOCK_GAMES } from "@/app/lib/db/mock-data";
// TODO: Replace with real data when Agent 1 completes
// import { useGamesAtPosition } from "@/app/hooks/use-games";

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial FEN from URL params (from Explore mode)
  const initialFen = searchParams.get("fen")
    ? decodeURIComponent(searchParams.get("fen")!)
    : STARTING_FEN;

  // Game state
  const [game] = useState(() => createGame(initialFen));
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [orientation, setOrientation] = useState<"white" | "black">("white");

  // Engine hook
  const {
    info: engineInfo,
    analyze,
    stop,
    pause,
    resume,
    setDepth,
    isReady,
  } = useEngine();

  // Current position FEN
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

  // Analyze current position when it changes
  useEffect(() => {
    if (isReady) {
      analyze(currentFen);
    }
  }, [currentFen, isReady, analyze]);

  // Handle user move
  const handleMove = useCallback((move: Move) => {
    // Truncate future moves if we're not at the end
    const newMoves = moves.slice(0, currentMoveIndex + 1);
    newMoves.push(move);
    setMoves(newMoves);
    setCurrentMoveIndex(newMoves.length - 1);
  }, [moves, currentMoveIndex]);

  // Navigation functions
  const goToStart = useCallback(() => setCurrentMoveIndex(-1), []);
  const goToEnd = useCallback(() => setCurrentMoveIndex(moves.length - 1), [moves.length]);
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

  // Game selection (mock for now)
  const handleGameClick = useCallback((game: typeof MOCK_GAMES[0]) => {
    // Load game moves
    if (game.moves) {
      const tempGame = createGame();
      const loadedMoves: Move[] = [];
      for (const moveSan of game.moves) {
        const move = tempGame.move(moveSan);
        if (move) loadedMoves.push(move);
      }
      setMoves(loadedMoves);
      setCurrentMoveIndex(loadedMoves.length - 1);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
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
  }, [goToStart, goToEnd, goToPrevious, goToNext, flipBoard, pause, resume, engineInfo?.state]);

  return (
    <div className="h-[calc(100vh-3.5rem)] p-4">
      {/* Back button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/explore")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 h-[calc(100%-48px)]">
        {/* Left column: Board and engine */}
        <div className="space-y-4">
          {/* Engine panel */}
          <EnginePanel
            info={engineInfo}
            onPause={pause}
            onResume={resume}
            onDepthChange={setDepth}
          />

          {/* Chess board */}
          <div className="flex justify-center">
            <div className="w-full max-w-[500px]">
              <ChessBoard
                fen={currentFen}
                onMove={handleMove}
                orientation={orientation}
                lastMove={lastMove}
                bestMove={bestMove}
              />
            </div>
          </div>

          {/* Board controls */}
          <div className="max-w-[500px] mx-auto">
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
        </div>

        {/* Right column: Moves and games */}
        <div className="space-y-4 overflow-hidden">
          {/* Move list */}
          <MoveList
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={goToMove}
          />

          {/* Games list */}
          <GamesList
            games={MOCK_GAMES}  // TODO: Use real data from useGamesAtPosition
            total={MOCK_GAMES.length}
            isLoading={false}
            hasMore={false}
            onLoadMore={() => {}}
            onGameClick={handleGameClick}
          />
        </div>
      </div>
    </div>
  );
}
```

### 10. Create Index Export

**File: `app/analyze/_components/index.ts`**

```typescript
export { ChessBoard } from "./chess-board";
export { BoardControls } from "./board-controls";
export { EnginePanel } from "./engine-panel";
export { EvalBar } from "./eval-bar";
export { PVLines } from "./pv-lines";
export { MoveList } from "./move-list";
export { GamesList } from "./games-list";
export { GameCard } from "./game-card";
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] `app/analyze/_components/chess-board.tsx` - Board renders and accepts moves
- [ ] `app/analyze/_components/board-controls.tsx` - Navigation buttons work
- [ ] `app/analyze/_components/engine-panel.tsx` - Shows engine state
- [ ] `app/analyze/_components/eval-bar.tsx` - Bar visualizes score
- [ ] `app/analyze/_components/pv-lines.tsx` - Shows principal variations
- [ ] `app/analyze/_components/move-list.tsx` - Move navigation works
- [ ] `app/analyze/_components/games-list.tsx` - Virtual scrolling works
- [ ] `app/analyze/_components/game-card.tsx` - Game info displays
- [ ] `app/analyze/page.tsx` - Page loads with all components
- [ ] Keyboard navigation works (arrows, f, space)
- [ ] Can receive FEN from URL params (from Explore mode)
- [ ] `npm run dev` works without errors

### Test the Explore → Analyze flow:
1. Go to `/explore`
2. Click on a node
3. Click "Analyze Position" in the panel
4. Verify Analyze mode loads with that position

---

## Notes for Other Agents

### For Agent 2 (Chess):
I need these from your implementations:
```typescript
import { createGame, STARTING_FEN } from "@/app/lib/chess";
import { useEngine } from "@/app/hooks/use-engine";
import type { Move, EngineInfo } from "@/app/lib/chess/types";
```

### For Agent 1 (Data):
When your hooks are ready, I need to replace mock data:
```typescript
// Replace:
import { MOCK_GAMES } from "@/app/lib/db/mock-data";

// With:
import { useGamesAtPosition } from "@/app/hooks/use-games";
```

### For Agent 3 (Explore):
I receive FEN from your navigation via URL:
```typescript
const fen = searchParams.get("fen");
```
Make sure you encode it: `encodeURIComponent(fen)`

---

## Import Path Convention

This project uses `@/` as an alias for the project root. All imports should use:
- `@/app/analyze/_components/...` for Analyze components
- `@/app/analyze/_hooks/...` for Analyze hooks
- `@/app/analyze/_lib/...` for Analyze utilities
- `@/app/lib/chess/...` for chess utilities (Agent 2)
- `@/app/lib/db/...` for database utilities (Agent 1)
- `@/app/hooks/...` for shared hooks
- `@/app/components/...` for shared components
- `@/app/stores/...` for Zustand stores

For imports within the analyze feature, use relative paths:
- `./_components/chess-board` from `page.tsx`
- `./eval-bar` from `engine-panel.tsx`
