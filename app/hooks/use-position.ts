"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPositionWithEdges,
  getStartingPosition,
  type PositionWithEdges,
} from "@/app/lib/db/positions";
import {
  getCachedPosition,
  getCachedEdges,
  cachePosition,
  cacheEdges,
} from "@/app/lib/db/indexeddb";
import type { Position, Edge } from "@/app/lib/db/database.types";

interface UsePositionResult {
  position: Position | null;
  edges: Edge[];
  incomingEdgeCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and cache a position with its edges
 */
export function usePosition(positionId: string | null): UsePositionResult {
  const [data, setData] = useState<PositionWithEdges | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!positionId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      const cachedPosition = await getCachedPosition(positionId);
      const cachedEdgesData = await getCachedEdges(positionId);

      if (cachedPosition && cachedEdgesData) {
        setData({
          position: cachedPosition,
          outgoingEdges: cachedEdgesData,
          incomingEdgeCount: 0, // Would need separate cache for this
        });
        setIsLoading(false);
        return;
      }

      // Fetch from Supabase
      const result = await getPositionWithEdges(positionId);

      if (result) {
        // Cache the result
        await cachePosition(result.position);
        await cacheEdges(result.outgoingEdges);
        setData(result);
      } else {
        setError(new Error("Position not found"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch position"));
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    position: data?.position || null,
    edges: data?.outgoingEdges || [],
    incomingEdgeCount: data?.incomingEdgeCount || 0,
    isLoading,
    error,
    refresh: fetchPosition,
  };
}

/**
 * Hook to get the starting position
 */
export function useStartingPosition() {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStartingPosition().then((pos) => {
      setPosition(pos);
      setIsLoading(false);
    });
  }, []);

  return { position, isLoading };
}
