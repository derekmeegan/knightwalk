"use client";

import { memo, useCallback } from "react";
import type { EngineEvaluation } from "@/app/lib/chess/types";

interface PVLinesProps {
  evaluations: EngineEvaluation[];
  maxLines?: number;
  currentFen?: string;
  onMoveClick?: (uciMoves: string[]) => void;
}

export const PVLines = memo(function PVLines({
  evaluations,
  maxLines = 3,
  currentFen,
  onMoveClick
}: PVLinesProps) {
  // Fixed height container to prevent layout shift
  const minHeight = maxLines * 24 + (maxLines - 1) * 4; // 24px per line + 4px gaps

  if (evaluations.length === 0) {
    return (
      <div className="space-y-1" style={{ minHeight }}>
        {Array.from({ length: maxLines }).map((_, i) => (
          <div
            key={i}
            className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1" style={{ minHeight }}>
      {evaluations.slice(0, maxLines).map((evaluation, index) => (
        <PVLine
          key={index}
          evaluation={evaluation}
          rank={index + 1}
          onMoveClick={onMoveClick}
        />
      ))}
    </div>
  );
});

interface PVLineProps {
  evaluation: EngineEvaluation;
  rank: number;
  onMoveClick?: (uciMoves: string[]) => void;
}

function PVLine({ evaluation, rank, onMoveClick }: PVLineProps) {
  const { pv, score, scoreType, mateIn, depth } = evaluation;

  // Get first 8 moves for display
  const displayMoves = pv.slice(0, 8);

  // Format score
  const scoreDisplay = scoreType === "mate" && mateIn !== undefined
    ? (mateIn > 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`)
    : `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;

  const handleMoveClick = useCallback((moveIndex: number) => {
    if (onMoveClick) {
      // Pass all moves up to and including the clicked one
      onMoveClick(pv.slice(0, moveIndex + 1));
    }
  }, [onMoveClick, pv]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 w-4">{rank}.</span>
      <span className="font-mono text-zinc-600 dark:text-zinc-400 min-w-[50px]">
        {scoreDisplay}
      </span>
      <div className="font-mono flex flex-wrap gap-x-1 truncate">
        {displayMoves.map((move, index) => (
          <button
            key={index}
            onClick={() => handleMoveClick(index)}
            className="text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-0.5 rounded transition-colors cursor-pointer"
            title={`Go to position after ${move}`}
          >
            {move}
          </button>
        ))}
        {pv.length > 8 && (
          <span className="text-zinc-400">...</span>
        )}
      </div>
      <span className="text-xs text-zinc-500 ml-auto flex-shrink-0">
        d{depth}
      </span>
    </div>
  );
}
