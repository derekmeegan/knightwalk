"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameCard } from "./game-card";
import { Button } from "@/app/components/ui/button";
import type { MockGame } from "@/app/lib/db/mock-data";

interface GamesListProps {
  games: MockGame[];
  total: number;
  isLoading: boolean;
  onGameClick: (game: MockGame) => void;
  selectedGameId?: string;
  pageSize?: number;
}

export function GamesList({
  games,
  total,
  isLoading,
  onGameClick,
  selectedGameId,
  pageSize = 5,
}: GamesListProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(games.length / pageSize);
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGames = games.slice(startIndex, endIndex);

  const canGoPrev = page > 0;
  const canGoNext = page < totalPages - 1;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between flex-shrink-0">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Games</h3>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} games
        </span>
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        {paginatedGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isSelected={game.id === selectedGameId}
            onClick={() => onGameClick(game)}
            className={paginatedGames.length >= pageSize ? "flex-1" : undefined}
          />
        ))}

        {/* Empty state */}
        {games.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            No games found
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            Loading...
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-500">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
