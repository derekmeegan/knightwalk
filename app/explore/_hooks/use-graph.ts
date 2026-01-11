"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { PositionNode, MoveEdge } from "../_lib/types";

// Database functions
import {
  getStartingPosition,
  getEdgesFromPosition,
  getPositionsByIds,
} from "@/app/lib/db/positions";
import type { Position, Edge } from "@/app/lib/db/database.types";

// Fallback mock data
import {
  MOCK_POSITIONS,
  MOCK_EDGES,
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
 * Only displays:
 * 1. Path nodes: Start → ... → Current (linear chain)
 * 2. Child nodes: All possible next moves from current position
 */
export function useGraph(): UseGraphResult {
  // Path state: array of positions from start to current
  const [path, setPath] = useState<Position[]>([]);
  const [pathEdges, setPathEdges] = useState<Edge[]>([]); // Edges along the path

  // Children of current position
  const [children, setChildren] = useState<Position[]>([]);
  const [childEdges, setChildEdges] = useState<Edge[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // Database availability
  const [useDatabase, setUseDatabase] = useState(true);

  // Cache for positions (avoid re-fetching)
  const positionCacheRef = useRef<Map<string, Position>>(new Map());
  const edgeCacheRef = useRef<Map<string, Edge[]>>(new Map());

  /**
   * Get current position (last in path)
   */
  const currentPosition = useMemo(() => {
    return path.length > 0 ? path[path.length - 1] : null;
  }, [path]);

  /**
   * Fetch children for a position
   */
  const fetchChildren = useCallback(async (positionId: string) => {
    setIsLoadingChildren(true);

    const edgeCache = edgeCacheRef.current;
    const positionCache = positionCacheRef.current;

    // Check cache first
    let edges = edgeCache.get(positionId);
    if (!edges) {
      edges = await getEdgesFromPosition(positionId, 50); // Get more moves
      edgeCache.set(positionId, edges);
    }

    // Get child position IDs
    const childIds = edges.map(e => e.to_position_id);
    const missingIds = childIds.filter(id => !positionCache.has(id));

    // Batch fetch missing positions
    if (missingIds.length > 0) {
      const fetched = await getPositionsByIds(missingIds);
      for (const pos of fetched) {
        positionCache.set(pos.id, pos);
      }
    }

    // Build children array
    const childPositions: Position[] = [];
    for (const id of childIds) {
      const pos = positionCache.get(id);
      if (pos) childPositions.push(pos);
    }

    setChildEdges(edges);
    setChildren(childPositions);
    setIsLoadingChildren(false);
  }, []);

  /**
   * Fetch children from mock data
   */
  const fetchMockChildren = useCallback((positionId: string) => {
    const mockEdges = getMockEdgesFromPosition(positionId);
    const childPositions = mockEdges
      .map(e => MOCK_POSITIONS.find(p => p.id === e.to_position_id))
      .filter((p): p is typeof MOCK_POSITIONS[0] => p !== undefined);

    // Convert mock edges to Edge type (add created_at)
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
        const start = await getStartingPosition();
        if (!start) {
          // Database empty, fall back to mock
          setUseDatabase(false);
          setIsLoading(false);
          return;
        }

        positionCacheRef.current.set(start.id, start);
        setPath([start]);
        await fetchChildren(start.id);
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
  }, [useDatabase, fetchChildren, fetchMockChildren]);

  /**
   * Navigate to a child node (expand into it)
   */
  const navigateToChild = useCallback(async (nodeId: string) => {
    // Find the child position
    const childPosition = children.find(c => c.id === nodeId);
    if (!childPosition) return;

    // Find the edge that leads to this child
    const edge = childEdges.find(e => e.to_position_id === nodeId);

    // Add to path
    setPath(prev => [...prev, childPosition]);
    if (edge) {
      setPathEdges(prev => [...prev, edge]);
    }

    // Clear current children and load new ones
    setChildren([]);
    setChildEdges([]);

    if (useDatabase) {
      await fetchChildren(nodeId);
    } else {
      fetchMockChildren(nodeId);
    }
  }, [children, childEdges, useDatabase, fetchChildren, fetchMockChildren]);

  /**
   * Navigate to an ancestor (truncate path)
   */
  const navigateToAncestor = useCallback(async (nodeId: string) => {
    const ancestorIndex = path.findIndex(p => p.id === nodeId);
    if (ancestorIndex === -1) return;

    // Truncate path to ancestor
    const newPath = path.slice(0, ancestorIndex + 1);
    const newPathEdges = pathEdges.slice(0, ancestorIndex);

    setPath(newPath);
    setPathEdges(newPathEdges);

    // Load children of the ancestor
    setChildren([]);
    setChildEdges([]);

    if (useDatabase) {
      await fetchChildren(nodeId);
    } else {
      fetchMockChildren(nodeId);
    }
  }, [path, pathEdges, useDatabase, fetchChildren, fetchMockChildren]);

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
        position: { x: 0, y: 0 }, // Layout will set this
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

    // Path edges (between ancestors)
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

    // Child edges (from current to children)
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
