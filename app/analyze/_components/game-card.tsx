"use client";

import { cn } from "@/app/lib/cn";
import type { MockGame } from "@/app/lib/db/mock-data";

interface GameCardProps {
  game: MockGame;
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
    "1-0": { text: "1-0", color: "text-emerald-600 dark:text-emerald-400" },
    "0-1": { text: "0-1", color: "text-red-600 dark:text-red-400" },
    "1/2-1/2": { text: "1/2-1/2", color: "text-zinc-600 dark:text-zinc-400" },
  }[result || ""] || { text: result || "?", color: "text-zinc-500" };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-3 text-left transition-colors border-b border-zinc-200 dark:border-zinc-800",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      )}
    >
      {/* Players row */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {white_player || "Unknown"}
            </span>
            {white_elo && (
              <span className="text-xs text-zinc-500">
                ({white_elo})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400 truncate">
              {black_player || "Unknown"}
            </span>
            {black_elo && (
              <span className="text-xs text-zinc-500">
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
      <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
        <span className="truncate">{event || "Unknown event"}</span>
        <span>{date || "?"}</span>
      </div>
    </button>
  );
}
