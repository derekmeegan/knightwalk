"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { PositionNode, MoveEdge } from "../_lib/types";

// Database functions
import {
  getStartingPosition,
  getEdgesWithPositions,
} from "@/app/lib/db/positions";
import type { Position, Edge } from "@/app/lib/db/database.types";

// IndexedDB caching
import {
  getCachedPosition,
  getCachedEdges,
  cachePosition,
  cacheEdges,
  localDb,
} from "@/app/lib/db/indexeddb";

// Fallback mock data
import {
  MOCK_POSITIONS,
  getMockEdgesFromPosition,
} from "@/app/lib/db/mock-data";

interface UseGraphResult {
  nodes: PositionNode[];
  edges: MoveEdge[];
  currentPositionId: string | null;
  pathPositionIds: string[];
  isLoading: boolean;
  isLoadingChildren: boolean;

  // Actions
  navigateToChild: (nodeId: string) => void;
  navigateToAncestor: (nodeId: string) => void;
  navigateBack: () => void;
  resetToStart: () => void;
}

/**
 * Hook for managing graph state - simplified path + children model
 *
 * Optimizations:
 * 1. IndexedDB caching - persists across page loads
 * 2. Combined query - fetches edges + positions in one call
 * 3. Prefetching - preloads the most popular move's children
 */
export function useGraph(): UseGraphResult {
  // Path state: array of positions from start to current
  const [path, setPath] = useState<Position[]>([]);
  const [pathEdges, setPathEdges] = useState<Edge[]>([]);

  // Children of current position
  const [children, setChildren] = useState<Position[]>([]);
  const [childEdges, setChildEdges] = useState<Edge[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // Database availability
  const [useDatabase, setUseDatabase] = useState(true);

  // In-memory cache (supplement to IndexedDB for current session)
  const positionCacheRef = useRef<Map<string, Position>>(new Map());
  const edgeCacheRef = useRef<Map<string, Edge[]>>(new Map());

  // Track prefetch in progress to avoid duplicates
  const prefetchingRef = useRef<Set<string>>(new Set());

  // Track pending children (loaded but waiting for animation to finish)
  const pendingChildrenRef = useRef<{ edges: Edge[]; positions: Position[] } | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation duration (must match page.tsx setCenter duration)
  const ANIMATION_DURATION = 500;

  /**
   * Get current position (last in path)
   */
  const currentPosition = useMemo(() => {
    return path.length > 0 ? path[path.length - 1] : null;
  }, [path]);

  /**
   * Get position from cache (memory -> IndexedDB -> null)
   */
  const getCachedPositionFast = useCallback(async (id: string): Promise<Position | null> => {
    // Check memory first (fastest)
    const memCached = positionCacheRef.current.get(id);
    if (memCached) return memCached;

    // Check IndexedDB
    const dbCached = await getCachedPosition(id);
    if (dbCached) {
      positionCacheRef.current.set(id, dbCached);
      return dbCached;
    }

    return null;
  }, []);

  /**
   * Get edges from cache (memory -> IndexedDB -> null)
   */
  const getCachedEdgesFast = useCallback(async (positionId: string): Promise<Edge[] | null> => {
    // Check memory first
    const memCached = edgeCacheRef.current.get(positionId);
    if (memCached) return memCached;

    // Check IndexedDB
    const dbCached = await getCachedEdges(positionId);
    if (dbCached) {
      edgeCacheRef.current.set(positionId, dbCached);
      return dbCached;
    }

    return null;
  }, []);

  /**
   * Cache position in both memory and IndexedDB
   */
  const cachePositionFast = useCallback(async (position: Position) => {
    positionCacheRef.current.set(position.id, position);
    await cachePosition(position);
  }, []);

  /**
   * Cache edges in both memory and IndexedDB
   */
  const cacheEdgesFast = useCallback(async (positionId: string, edges: Edge[]) => {
    edgeCacheRef.current.set(positionId, edges);
    await cacheEdges(edges);
  }, []);

  /**
   * Prefetch children for a position (background, no blocking)
   */
  const prefetchChildren = useCallback(async (positionId: string) => {
    // Skip if already prefetching or cached
    if (prefetchingRef.current.has(positionId)) return;
    if (edgeCacheRef.current.has(positionId)) return;

    const cachedEdges = await getCachedEdges(positionId);
    if (cachedEdges) {
      edgeCacheRef.current.set(positionId, cachedEdges);
      return;
    }

    prefetchingRef.current.add(positionId);

    try {
      const { edges, positions } = await getEdgesWithPositions(positionId, 50);

      // Cache results
      await cacheEdgesFast(positionId, edges);
      for (const pos of positions) {
        await cachePositionFast(pos);
      }
    } catch (e) {
      // Silent fail for prefetch
    } finally {
      prefetchingRef.current.delete(positionId);
    }
  }, [cacheEdgesFast, cachePositionFast]);

  /**
   * Show pending children (called after animation completes)
   */
  const showPendingChildren = useCallback(() => {
    const pending = pendingChildrenRef.current;
    if (pending) {
      setChildEdges(pending.edges);
      setChildren(pending.positions);
      setIsLoadingChildren(false);
      pendingChildrenRef.current = null;

      // Prefetch the most popular move's children
      if (pending.edges.length > 0) {
        prefetchChildren(pending.edges[0].to_position_id);
      }
    }
  }, [prefetchChildren]);

  /**
   * Fetch children for a position (with caching)
   * Results are stored in pendingChildrenRef until animation completes
   */
  const fetchChildren = useCallback(async (positionId: string, waitForAnimation = false) => {
    setIsLoadingChildren(true);

    let edges: Edge[] = [];
    let positions: Position[] = [];

    // Try cache first
    const cachedEdges = await getCachedEdgesFast(positionId);

    if (cachedEdges && cachedEdges.length > 0) {
      // Get positions from cache
      const childPositions: Position[] = [];
      const missingIds: string[] = [];

      for (const edge of cachedEdges) {
        const pos = await getCachedPositionFast(edge.to_position_id);
        if (pos) {
          childPositions.push(pos);
        } else {
          missingIds.push(edge.to_position_id);
        }
      }

      // If all positions are cached, use them
      if (missingIds.length === 0) {
        edges = cachedEdges;
        positions = childPositions;
      }
    }

    // If not fully cached, fetch from database
    if (edges.length === 0) {
      const result = await getEdgesWithPositions(positionId, 50);
      edges = result.edges;
      positions = result.positions;

      // Cache everything
      await cacheEdgesFast(positionId, edges);
      for (const pos of positions) {
        await cachePositionFast(pos);
      }
    }

    // Store results - they'll be shown after animation
    if (waitForAnimation) {
      pendingChildrenRef.current = { edges, positions };
    } else {
      // No animation, show immediately
      setChildEdges(edges);
      setChildren(positions);
      setIsLoadingChildren(false);

      // Prefetch the most popular move's children
      if (edges.length > 0) {
        prefetchChildren(edges[0].to_position_id);
      }
    }
  }, [getCachedEdgesFast, getCachedPositionFast, cacheEdgesFast, cachePositionFast, prefetchChildren]);

  /**
   * Fetch children from mock data
   */
  const fetchMockChildren = useCallback((positionId: string) => {
    const mockEdges = getMockEdgesFromPosition(positionId);
    const childPositions = mockEdges
      .map(e => MOCK_POSITIONS.find(p => p.id === e.to_position_id))
      .filter((p): p is typeof MOCK_POSITIONS[0] => p !== undefined);

    const edges: Edge[] = mockEdges.map(e => ({
      ...e,
      created_at: new Date().toISOString(),
    }));

    setChildEdges(edges);
    setChildren(childPositions as unknown as Position[]);
  }, []);

  /**
   * Initialize: load starting position and its children
   */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      if (useDatabase) {
        // Try to get starting position from IndexedDB first
        const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        let startPosition: Position | null = null;

        // Check IndexedDB by FEN
        try {
          const cached = await localDb.positions
            .where("fen")
            .equals(startFen)
            .first();
          if (cached) {
            startPosition = cached;
            positionCacheRef.current.set(cached.id, cached);
          }
        } catch (e) {
          // IndexedDB not available
        }

        // If not cached, fetch from database
        if (!startPosition) {
          startPosition = await getStartingPosition();
          if (!startPosition) {
            setUseDatabase(false);
            setIsLoading(false);
            return;
          }
          await cachePositionFast(startPosition);
        }

        setPath([startPosition]);
        await fetchChildren(startPosition.id);
      } else {
        // Mock data
        const start = MOCK_POSITIONS.find(p => p.id === "start");
        if (start) {
          setPath([start as unknown as Position]);
          fetchMockChildren("start");
        }
      }

      setIsLoading(false);
    };

    init();
  }, [useDatabase, fetchChildren, fetchMockChildren, cachePositionFast]);

  /**
   * Navigate to a child node (expand into it)
   * Animation-first: update path immediately, show children after animation
   */
  const navigateToChild = useCallback((nodeId: string) => {
    const childPosition = children.find(c => c.id === nodeId);
    if (!childPosition) return;

    const edge = childEdges.find(e => e.to_position_id === nodeId);

    // Clear any pending animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // 1. Immediately update path (triggers animation)
    setPath(prev => [...prev, childPosition]);
    if (edge) {
      setPathEdges(prev => [...prev, edge]);
    }

    // 2. Clear old children
    setChildren([]);
    setChildEdges([]);

    // 3. Fetch new children (results stored in pending ref)
    if (useDatabase) {
      fetchChildren(nodeId, true);
    } else {
      fetchMockChildren(nodeId);
    }

    // 4. Show children after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      showPendingChildren();
    }, ANIMATION_DURATION + 50); // Small buffer after animation
  }, [children, childEdges, useDatabase, fetchChildren, fetchMockChildren, showPendingChildren]);

  /**
   * Navigate to an ancestor (truncate path)
   * Animation-first: update path immediately, show children after animation
   */
  const navigateToAncestor = useCallback((nodeId: string) => {
    const ancestorIndex = path.findIndex(p => p.id === nodeId);
    if (ancestorIndex === -1) return;

    // Clear any pending animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // 1. Immediately update path (triggers animation)
    const newPath = path.slice(0, ancestorIndex + 1);
    const newPathEdges = pathEdges.slice(0, ancestorIndex);

    setPath(newPath);
    setPathEdges(newPathEdges);

    // 2. Clear old children
    setChildren([]);
    setChildEdges([]);

    // 3. Fetch new children (results stored in pending ref)
    if (useDatabase) {
      fetchChildren(nodeId, true);
    } else {
      fetchMockChildren(nodeId);
    }

    // 4. Show children after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      showPendingChildren();
    }, ANIMATION_DURATION + 50);
  }, [path, pathEdges, useDatabase, fetchChildren, fetchMockChildren, showPendingChildren]);

  /**
   * Navigate back one step
   */
  const navigateBack = useCallback(() => {
    if (path.length <= 1) return;
    const parentId = path[path.length - 2].id;
    navigateToAncestor(parentId);
  }, [path, navigateToAncestor]);

  /**
   * Reset to starting position
   */
  const resetToStart = useCallback(() => {
    if (path.length > 0) {
      navigateToAncestor(path[0].id);
    }
  }, [path, navigateToAncestor]);

  /**
   * Build nodes for React Flow
   */
  const nodes = useMemo((): PositionNode[] => {
    const result: PositionNode[] = [];

    // Add path nodes (ancestors + current)
    for (let i = 0; i < path.length; i++) {
      const position = path[i];
      const isLast = i === path.length - 1;
      const edge = i > 0 ? pathEdges[i - 1] : null;

      result.push({
        id: position.id,
        type: "position",
        position: { x: 0, y: 0 },
        data: {
          positionId: position.id,
          fen: position.fen,
          moveSan: edge?.move_san || null,
          openingName: position.opening_name,
          variationName: position.variation_name,
          eco: position.eco,
          totalGames: position.total_games,
          whiteWins: position.white_wins,
          draws: position.draws,
          blackWins: position.black_wins,
          avgElo: position.avg_elo,
          incomingEdgeCount: 1,
          isExpanded: true,
          isSelected: isLast,
          isFocused: true,
          isDimmed: false,
          isPathNode: true,
          isCurrentNode: isLast,
          pathFens: path.slice(0, i + 1).map(p => p.fen),
        },
      });
    }

    // Add child nodes
    for (const child of children) {
      const edge = childEdges.find(e => e.to_position_id === child.id);

      result.push({
        id: child.id,
        type: "position",
        position: { x: 0, y: 0 },
        data: {
          positionId: child.id,
          fen: child.fen,
          moveSan: edge?.move_san || null,
          openingName: child.opening_name,
          variationName: child.variation_name,
          eco: child.eco,
          totalGames: child.total_games,
          whiteWins: child.white_wins,
          draws: child.draws,
          blackWins: child.black_wins,
          avgElo: child.avg_elo,
          incomingEdgeCount: 1,
          isExpanded: false,
          isSelected: false,
          isFocused: true,
          isDimmed: false,
          isPathNode: false,
          isCurrentNode: false,
          pathFens: currentPosition
            ? [...path.map(p => p.fen), child.fen]
            : [child.fen],
        },
      });
    }

    return result;
  }, [path, pathEdges, children, childEdges, currentPosition]);

  /**
   * Build edges for React Flow
   */
  const edges = useMemo((): MoveEdge[] => {
    const result: MoveEdge[] = [];

    // Path edges
    for (let i = 0; i < pathEdges.length; i++) {
      const edge = pathEdges[i];
      result.push({
        id: edge.id,
        source: edge.from_position_id,
        target: edge.to_position_id,
        type: "move",
        data: {
          edgeId: edge.id,
          moveSan: edge.move_san,
          moveUci: edge.move_uci,
          timesPlayed: edge.times_played,
          whiteWins: edge.white_wins,
          draws: edge.draws,
          blackWins: edge.black_wins,
          isMainLine: true,
          isTransposition: false,
          isPathEdge: true,
        },
      });
    }

    // Child edges
    if (currentPosition) {
      for (let i = 0; i < childEdges.length; i++) {
        const edge = childEdges[i];
        result.push({
          id: edge.id,
          source: edge.from_position_id,
          target: edge.to_position_id,
          type: "move",
          data: {
            edgeId: edge.id,
            moveSan: edge.move_san,
            moveUci: edge.move_uci,
            timesPlayed: edge.times_played,
            whiteWins: edge.white_wins,
            draws: edge.draws,
            blackWins: edge.black_wins,
            isMainLine: i === 0,
            isTransposition: false,
            isPathEdge: false,
          },
        });
      }
    }

    return result;
  }, [pathEdges, childEdges, currentPosition]);

  return {
    nodes,
    edges,
    currentPositionId: currentPosition?.id || null,
    pathPositionIds: path.map(p => p.id),
    isLoading,
    isLoadingChildren,
    navigateToChild,
    navigateToAncestor,
    navigateBack,
    resetToStart,
  };
}
