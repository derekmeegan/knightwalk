"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  PositionNode,
  MoveEdge,
  VisibilityInfo,
} from "../_lib/types";
import { useAppStore } from "@/app/stores/app-store";

// Database functions
import {
  getStartingPosition,
  getEdgesFromPosition,
} from "@/app/lib/db/positions";
import type { Position, Edge } from "@/app/lib/db/database.types";

// Fallback mock data
import {
  MOCK_POSITIONS,
  MOCK_EDGES,
  getMockEdgesFromPosition,
} from "@/app/lib/db/mock-data";

const MAX_VISIBLE_NODES = 200;

interface UseGraphResult {
  nodes: PositionNode[];
  edges: MoveEdge[];
  selectedNodeId: string | null;
  visibilityDepth: number;
  visibilityInfo: VisibilityInfo;
  focusModeEnabled: boolean;
  isLoading: boolean;

  // Actions
  selectNode: (nodeId: string | null) => void;
  setVisibilityDepth: (depth: number) => void;
  toggleFocusMode: () => void;
}

/**
 * Hook for managing graph state and interactions
 */
export function useGraph(): UseGraphResult {
  const { visibilityDepth, setVisibilityDepth: setStoreDepth } = useAppStore();

  const [nodes, setNodes] = useState<PositionNode[]>([]);
  const [edges, setEdges] = useState<MoveEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useDatabase, setUseDatabase] = useState(true);

  // Cache for positions and edges from database
  const [positionCache, setPositionCache] = useState<Map<string, Position>>(new Map());
  const [edgeCache, setEdgeCache] = useState<Map<string, Edge[]>>(new Map());

  /**
   * Create a position node from database data
   */
  const createPositionNode = useCallback(
    (position: Position, moveSan: string | null, incomingCount: number, pathFens: string[]): PositionNode => {
      return {
        id: position.id,
        type: "position",
        position: { x: 0, y: 0 },
        data: {
          positionId: position.id,
          fen: position.fen,
          moveSan,
          openingName: position.opening_name,
          variationName: position.variation_name,
          eco: position.eco,
          totalGames: position.total_games,
          whiteWins: position.white_wins,
          draws: position.draws,
          blackWins: position.black_wins,
          avgElo: position.avg_elo,
          incomingEdgeCount: incomingCount,
          isExpanded: false,
          isSelected: false,
          isFocused: true,
          isDimmed: false,
          pathFens,
        },
      };
    },
    []
  );

  /**
   * Create a position node from mock data
   */
  const createMockPositionNode = useCallback(
    (position: (typeof MOCK_POSITIONS)[0], moveSan: string | null, pathFens: string[]): PositionNode => {
      return {
        id: position.id,
        type: "position",
        position: { x: 0, y: 0 },
        data: {
          positionId: position.id,
          fen: position.fen,
          moveSan,
          openingName: position.opening_name,
          variationName: position.variation_name,
          eco: position.eco,
          totalGames: position.total_games,
          whiteWins: position.white_wins,
          draws: position.draws,
          blackWins: position.black_wins,
          avgElo: position.avg_elo,
          incomingEdgeCount: MOCK_EDGES.filter(
            (e) => e.to_position_id === position.id
          ).length,
          isExpanded: false,
          isSelected: false,
          isFocused: true,
          isDimmed: false,
          pathFens,
        },
      };
    },
    []
  );

  /**
   * Create a move edge from data
   */
  const createMoveEdge = useCallback(
    (edge: Edge | (typeof MOCK_EDGES)[0], isMainLine: boolean): MoveEdge => {
      return {
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
          isMainLine,
          isTransposition: false,
        },
      };
    },
    []
  );

  /**
   * Apply focus mode - dim nodes not in the focus path
   */
  const applyFocusMode = useCallback(
    (nodesList: PositionNode[], edgesList: MoveEdge[], focusNodeId: string) => {
      const ancestors = new Set<string>();
      let current = focusNodeId;

      while (current) {
        ancestors.add(current);
        const parentEdge = edgesList.find((e) => e.target === current);
        current = parentEdge?.source || "";
      }

      const children = new Set(
        edgesList.filter((e) => e.source === focusNodeId).map((e) => e.target)
      );

      for (const node of nodesList) {
        const isInFocus =
          ancestors.has(node.id) ||
          children.has(node.id) ||
          node.id === focusNodeId;
        node.data.isFocused = isInFocus;
        node.data.isDimmed = !isInFocus;
      }
    },
    []
  );

  /**
   * Build graph from database
   */
  const buildGraphFromDatabase = useCallback(async () => {
    setIsLoading(true);
    const newNodes: PositionNode[] = [];
    const newEdges: MoveEdge[] = [];
    const visited = new Set<string>();
    const newPositionCache = new Map(positionCache);
    const newEdgeCache = new Map(edgeCache);

    // Get starting position
    let startPosition = newPositionCache.get("start");
    if (!startPosition) {
      const dbStart = await getStartingPosition();
      if (!dbStart) {
        // Database is empty, fall back to mock data
        setUseDatabase(false);
        setIsLoading(false);
        return;
      }
      startPosition = dbStart;
      newPositionCache.set("start", dbStart);
      newPositionCache.set(dbStart.id, dbStart);
    }

    // BFS from root up to visibilityDepth
    const queue: Array<{ position: Position; depth: number; parentEdge: Edge | null; pathFens: string[] }> = [
      { position: startPosition, depth: 0, parentEdge: null, pathFens: [startPosition.fen] },
    ];

    while (queue.length > 0 && newNodes.length < MAX_VISIBLE_NODES) {
      const { position, depth, parentEdge, pathFens } = queue.shift()!;

      if (visited.has(position.id)) continue;
      visited.add(position.id);

      // Create node
      const node = createPositionNode(
        position,
        parentEdge?.move_san || null,
        1, // TODO: Count incoming edges
        pathFens
      );
      node.data.isSelected = position.id === selectedNodeId;
      node.data.isExpanded = depth < visibilityDepth;
      newNodes.push(node);

      // Add children if within visibility depth
      if (depth < visibilityDepth) {
        let childEdges = newEdgeCache.get(position.id);
        if (!childEdges) {
          childEdges = await getEdgesFromPosition(position.id, 20);
          newEdgeCache.set(position.id, childEdges);
        }

        for (let i = 0; i < childEdges.length; i++) {
          const edge = childEdges[i];
          newEdges.push(createMoveEdge(edge, i === 0));

          // Get child position
          let childPosition = newPositionCache.get(edge.to_position_id);
          if (!childPosition) {
            // Fetch child position - for now skip if not cached
            // In a real app we'd batch fetch these
            continue;
          }

          if (!visited.has(childPosition.id)) {
            queue.push({
              position: childPosition,
              depth: depth + 1,
              parentEdge: edge,
              pathFens: [...pathFens, childPosition.fen],
            });
          }
        }
      }
    }

    // Apply focus mode dimming
    if (focusModeEnabled && selectedNodeId) {
      applyFocusMode(newNodes, newEdges, selectedNodeId);
    }

    setPositionCache(newPositionCache);
    setEdgeCache(newEdgeCache);
    setNodes(newNodes);
    setEdges(newEdges);
    setIsLoading(false);
  }, [
    visibilityDepth,
    selectedNodeId,
    focusModeEnabled,
    positionCache,
    edgeCache,
    createPositionNode,
    createMoveEdge,
    applyFocusMode,
  ]);

  /**
   * Build graph from mock data (fallback)
   */
  const buildGraphFromMockData = useCallback(() => {
    const newNodes: PositionNode[] = [];
    const newEdges: MoveEdge[] = [];
    const visited = new Set<string>();

    // Find starting position FEN
    const startPosition = MOCK_POSITIONS.find((p) => p.id === "start");
    const startFen = startPosition?.fen || "";

    const queue: Array<{ nodeId: string; depth: number; pathFens: string[] }> = [
      { nodeId: "start", depth: 0, pathFens: [startFen] },
    ];

    while (queue.length > 0 && newNodes.length < MAX_VISIBLE_NODES) {
      const { nodeId, depth, pathFens } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const position = MOCK_POSITIONS.find((p) => p.id === nodeId);
      if (!position) continue;

      const incomingEdge = MOCK_EDGES.find((e) => e.to_position_id === nodeId);

      const node = createMockPositionNode(
        position,
        incomingEdge?.move_san || null,
        pathFens
      );
      node.data.isSelected = nodeId === selectedNodeId;
      node.data.isExpanded = depth < visibilityDepth;
      newNodes.push(node);

      if (depth < visibilityDepth) {
        const childEdges = getMockEdgesFromPosition(nodeId);

        for (const edge of childEdges) {
          newEdges.push(createMoveEdge(edge, childEdges[0]?.id === edge.id));

          if (!visited.has(edge.to_position_id)) {
            // Get child position FEN
            const childPosition = MOCK_POSITIONS.find((p) => p.id === edge.to_position_id);
            const childPathFens = childPosition
              ? [...pathFens, childPosition.fen]
              : pathFens;
            queue.push({ nodeId: edge.to_position_id, depth: depth + 1, pathFens: childPathFens });
          }
        }
      }
    }

    if (focusModeEnabled && selectedNodeId) {
      applyFocusMode(newNodes, newEdges, selectedNodeId);
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setIsLoading(false);
  }, [
    visibilityDepth,
    selectedNodeId,
    focusModeEnabled,
    createMockPositionNode,
    createMoveEdge,
    applyFocusMode,
  ]);

  /**
   * Rebuild graph based on data source
   */
  useEffect(() => {
    if (useDatabase) {
      buildGraphFromDatabase();
    } else {
      buildGraphFromMockData();
    }
  }, [useDatabase, buildGraphFromDatabase, buildGraphFromMockData]);

  /**
   * Select a node
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    useAppStore.getState().setSelectedNodeId(nodeId);
  }, []);

  /**
   * Toggle focus mode
   */
  const toggleFocusMode = useCallback(() => {
    setFocusModeEnabled((prev) => !prev);
  }, []);

  /**
   * Calculate visibility info
   */
  const visibilityInfo = useMemo((): VisibilityInfo => {
    const totalPossible = useDatabase ? 1000 : MOCK_POSITIONS.length;
    return {
      visibleNodes: nodes.length,
      hiddenNodes: Math.max(0, totalPossible - nodes.length),
      maxDepthReached: nodes.length >= MAX_VISIBLE_NODES,
      performanceLimited: nodes.length >= MAX_VISIBLE_NODES,
    };
  }, [nodes.length, useDatabase]);

  return {
    nodes,
    edges,
    selectedNodeId,
    visibilityDepth,
    visibilityInfo,
    focusModeEnabled,
    isLoading,
    selectNode,
    setVisibilityDepth: setStoreDepth,
    toggleFocusMode,
  };
}
