"use client";

import { useState, useEffect, useCallback } from "react";
import { getGamesAtPosition, type GamesQueryOptions } from "@/app/lib/db/games";
import type { Game } from "@/app/lib/db/database.types";

interface UseGamesResult {
  games: Game[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => void;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

/**
 * Hook to fetch games at a position with pagination
 */
export function useGamesAtPosition(
  positionId: string | null,
  filters?: Omit<GamesQueryOptions, "positionId" | "limit" | "offset">
): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGames = useCallback(async (reset = false) => {
    if (!positionId) {
      setGames([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentOffset = reset ? 0 : offset;

    try {
      const result = await getGamesAtPosition(positionId, {
        ...filters,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      if (reset) {
        setGames(result.games);
        setOffset(PAGE_SIZE);
      } else {
        setGames((prev) => [...prev, ...result.games]);
        setOffset((prev) => prev + PAGE_SIZE);
      }
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch games"));
    } finally {
      setIsLoading(false);
    }
  }, [positionId, offset, filters]);

  // Reset when position changes
  useEffect(() => {
    setGames([]);
    setOffset(0);
    fetchGames(true);
  }, [positionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!isLoading && games.length < total) {
      fetchGames(false);
    }
  }, [isLoading, games.length, total, fetchGames]);

  return {
    games,
    total,
    isLoading,
    error,
    loadMore,
    hasMore: games.length < total,
  };
}
