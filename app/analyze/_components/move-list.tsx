"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { cn } from "@/app/lib/cn";
import type { Move } from "@/app/lib/chess/types";

interface MoveWithAnnotation extends Move {
  openingName?: string;
}

interface MoveListProps {
  moves: MoveWithAnnotation[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export function MoveList({ moves, currentMoveIndex, onMoveClick }: MoveListProps) {
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Moves</h3>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="p-2 space-y-0.5">
          {movePairs.map((pair) => (
            <div key={pair.number}>
              {/* Opening annotation */}
              {pair.white?.openingName && (
                <div className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {pair.white.openingName}
                </div>
              )}
              {pair.black?.openingName && !pair.white?.openingName && (
                <div className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {pair.black.openingName}
                </div>
              )}

              {/* Move row */}
              <div className="flex items-center">
                {/* Move number */}
                <span className="w-8 text-sm text-zinc-500 font-mono">
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
                        ? "bg-blue-600 text-white"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
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
                        ? "bg-blue-600 text-white"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
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
            <div className="text-center text-zinc-500 py-8">
              No moves yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
