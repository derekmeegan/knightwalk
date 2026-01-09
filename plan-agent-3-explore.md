# Agent 3: Explore Mode (Graph UI) Plan

## Project Context

You are building **Explore Mode** for **Knightwalker**, a chess opening visualization app. Explore Mode is the primary feature - a full-screen interactive graph where:
- **Nodes** = chess positions (showing opening name, stats, win rates)
- **Edges** = moves between positions (showing move notation, frequency)
- **Transpositions** = when different move orders reach the same position (branches merge)

Users navigate this graph to explore opening theory, seeing how lines branch and converge.

**Main plan reference**: `/Users/d/Desktop/me/knightwalk/plan.md` (see "EXPLORE MODE", "Progressive Disclosure", "Graph Node Design" sections)

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
├── /explore/                     # YOUR DOMAIN - Explore feature
│   ├── page.tsx                 # Main explore page
│   ├── layout.tsx               # ReactFlowProvider wrapper
│   ├── /_components/            # Explore-specific components (NOT routable)
│   │   ├── graph-node.tsx
│   │   ├── graph-edge.tsx
│   │   ├── graph-controls.tsx
│   │   ├── position-panel.tsx
│   │   └── mini-board.tsx
│   ├── /_hooks/                 # Explore-specific hooks (NOT routable)
│   │   └── use-graph.ts
│   └── /_lib/                   # Explore-specific utils (NOT routable)
│       ├── graph-layout.ts
│       └── types.ts
│
├── /analyze/                     # Agent 4's domain
│
├── /components/                  # ONLY truly shared components
│   ├── /ui/                     # shadcn primitives
│   └── win-rate-bar.tsx         # Shared - USE this
│
├── /lib/                         # Global utilities
│   ├── cn.ts
│   ├── /chess/                  # Agent 2's domain
│   └── /db/                     # Agent 1's domain
│
├── /hooks/                       # ONLY global hooks (used by 2+ features)
│
└── /stores/
    └── app-store.ts
```

**Key Rules**:
- Underscore prefix (`_`) makes directories non-routable
- Your code goes in `app/explore/` feature folder
- Use `_components`, `_hooks`, `_lib` prefixes for non-routable subdirs

---

## Your Role

You are **Agent 3: Explore Mode**. You handle:
- React Flow graph setup and configuration
- Dagre layout for stable positioning
- GraphNode component (position display)
- GraphEdge component (move display)
- Graph controls (zoom, pan, depth slider)
- Position info panel
- Mini board preview
- Keyboard navigation for graph
- Progressive disclosure (visibility depth)
- Focus mode (dim non-ancestors)

---

## Boundaries

### You ARE responsible for:
- `app/explore/_components/` - ALL Explore-specific components
- `app/explore/_hooks/` - ALL Explore-specific hooks
- `app/explore/_lib/` - ALL Explore-specific utilities and types
- `app/explore/page.tsx` - Explore mode page
- `app/explore/layout.tsx` - ReactFlowProvider wrapper

### You are NOT responsible for:
- Database queries (fetching positions/edges) → Agent 1
- Chess logic (move validation) → Agent 2
- Analyze mode UI → Agent 4
- Shared components (header, win-rate-bar) → Foundation

### Sensitive Overlap Areas:

| Area | Your Role | Other Agent |
|------|-----------|-------------|
| `app/stores/app-store.ts` | Add graph state, use existing fields | Foundation created skeleton |
| `app/explore/_lib/types.ts` | You DEFINE these types | Others may USE them |
| `app/components/win-rate-bar.tsx` | You USE this component | Foundation created it |
| Position data | You DISPLAY | Agent 1 FETCHES |
| Mini board | You CREATE simple preview | Agent 4 creates full board |

### If you need to:
- Modify `app/stores/app-store.ts` → Add your state, don't remove existing
- Add significant new dependencies → **ASK HUMAN FIRST**
- Change the graph library (React Flow) → **ASK HUMAN FIRST**
- Create a full interactive board → **STOP, use simple preview only - Agent 4 handles full board**

---

## Detailed Tasks

### 1. Define Graph Types

**File: `app/explore/_lib/types.ts`**

```typescript
import type { Node, Edge } from "reactflow";

// ============================================
// GRAPH NODE TYPES
// ============================================

export interface PositionNodeData {
  positionId: string;
  fen: string;
  moveSan: string | null;        // The move that led to this position (null for root)
  openingName: string | null;
  variationName: string | null;
  eco: string | null;
  totalGames: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  avgElo: number | null;
  incomingEdgeCount: number;     // For transposition indicator
  isExpanded: boolean;           // Are children visible?
  isSelected: boolean;
  isFocused: boolean;            // Is this in the focus path?
  isDimmed: boolean;             // Dimmed in focus mode?
}

export type PositionNode = Node<PositionNodeData, "position">;

// ============================================
// GRAPH EDGE TYPES
// ============================================

export interface MoveEdgeData {
  edgeId: string;
  moveSan: string;
  moveUci: string;
  timesPlayed: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  isMainLine: boolean;           // Most played move from parent
  isTransposition: boolean;      // Does this create a transposition?
}

export type MoveEdge = Edge<MoveEdgeData>;

// ============================================
// GRAPH STATE
// ============================================

export interface GraphState {
  nodes: PositionNode[];
  edges: MoveEdge[];
  selectedNodeId: string | null;
  visibilityDepth: number;       // How many ply to show
  focusModeEnabled: boolean;
  expandedNodeIds: Set<string>;  // Which nodes have been expanded
}

// ============================================
// LAYOUT TYPES
// ============================================

export interface LayoutConfig {
  direction: "TB" | "LR";        // Top-to-bottom or left-to-right
  nodeSep: number;               // Horizontal spacing
  rankSep: number;               // Vertical spacing
  marginX: number;
  marginY: number;
}

// ============================================
// VISIBILITY TYPES
// ============================================

export interface VisibilityInfo {
  visibleNodes: number;
  hiddenNodes: number;
  maxDepthReached: boolean;
  performanceLimited: boolean;
}
```

### 2. Create Graph State Hook

**File: `app/explore/_hooks/use-graph.ts`**

```typescript
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { PositionNode, MoveEdge, GraphState, VisibilityInfo } from "../_lib/types";
import { useAppStore } from "@/app/stores/app-store";

// Import mock data for development
import { MOCK_POSITIONS, MOCK_EDGES, getMockEdgesFromPosition } from "@/app/lib/db/mock-data";
// TODO: Replace with real data fetching when Agent 1 completes
// import { getPositionWithEdges, getStartingPosition } from "@/app/lib/db/positions";

const MAX_VISIBLE_NODES = 200;
const MAX_VISIBLE_EDGES = 400;

interface UseGraphResult {
  nodes: PositionNode[];
  edges: MoveEdge[];
  selectedNodeId: string | null;
  visibilityDepth: number;
  visibilityInfo: VisibilityInfo;
  focusModeEnabled: boolean;

  // Actions
  selectNode: (nodeId: string | null) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  setVisibilityDepth: (depth: number) => void;
  toggleFocusMode: () => void;
  navigateToParent: () => void;
  navigateToChild: (index?: number) => void;
  navigateToSibling: (direction: "prev" | "next") => void;
  resetToRoot: () => void;
}

/**
 * Hook for managing graph state and interactions
 */
export function useGraph(): UseGraphResult {
  const { visibilityDepth, setVisibilityDepth: setStoreDepth } = useAppStore();

  const [nodes, setNodes] = useState<PositionNode[]>([]);
  const [edges, setEdges] = useState<MoveEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set(["start"]));
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  // Initialize with root node
  useEffect(() => {
    initializeGraph();
  }, []);

  // Rebuild visible graph when depth or expanded nodes change
  useEffect(() => {
    rebuildVisibleGraph();
  }, [visibilityDepth, expandedNodeIds]);

  /**
   * Initialize the graph with the starting position
   */
  const initializeGraph = useCallback(() => {
    // Using mock data for now
    const startPosition = MOCK_POSITIONS.find((p) => p.id === "start");
    if (!startPosition) return;

    const rootNode = createPositionNode(startPosition, null, 0);
    setNodes([rootNode]);
    setSelectedNodeId("start");
    setExpandedNodeIds(new Set(["start"]));

    // Expand initial children
    expandNodeChildren("start");
  }, []);

  /**
   * Rebuild the visible portion of the graph
   */
  const rebuildVisibleGraph = useCallback(() => {
    const newNodes: PositionNode[] = [];
    const newEdges: MoveEdge[] = [];
    const visited = new Set<string>();

    // BFS from root up to visibilityDepth
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: "start", depth: 0 }];

    while (queue.length > 0 && newNodes.length < MAX_VISIBLE_NODES) {
      const { nodeId, depth } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // Find position data
      const position = MOCK_POSITIONS.find((p) => p.id === nodeId);
      if (!position) continue;

      // Determine parent move (for display)
      const incomingEdge = MOCK_EDGES.find((e) => e.to_position_id === nodeId);

      // Create node
      const node = createPositionNode(
        position,
        incomingEdge?.move_san || null,
        depth
      );
      node.data.isSelected = nodeId === selectedNodeId;
      node.data.isExpanded = expandedNodeIds.has(nodeId);
      newNodes.push(node);

      // Add children if within depth and node is expanded
      if (depth < visibilityDepth && expandedNodeIds.has(nodeId)) {
        const childEdges = getMockEdgesFromPosition(nodeId);

        for (const edge of childEdges) {
          // Create edge
          newEdges.push(createMoveEdge(edge, childEdges[0]?.id === edge.id));

          // Queue child for processing
          if (!visited.has(edge.to_position_id)) {
            queue.push({ nodeId: edge.to_position_id, depth: depth + 1 });
          }
        }
      }
    }

    // Apply focus mode dimming
    if (focusModeEnabled && selectedNodeId) {
      applyFocusMode(newNodes, newEdges, selectedNodeId);
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [visibilityDepth, expandedNodeIds, selectedNodeId, focusModeEnabled]);

  /**
   * Create a position node from data
   */
  const createPositionNode = (
    position: typeof MOCK_POSITIONS[0],
    moveSan: string | null,
    depth: number
  ): PositionNode => {
    return {
      id: position.id,
      type: "position",
      position: { x: 0, y: 0 }, // Will be set by dagre layout
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
        incomingEdgeCount: MOCK_EDGES.filter((e) => e.to_position_id === position.id).length,
        isExpanded: false,
        isSelected: false,
        isFocused: true,
        isDimmed: false,
      },
    };
  };

  /**
   * Create a move edge from data
   */
  const createMoveEdge = (
    edge: typeof MOCK_EDGES[0],
    isMainLine: boolean
  ): MoveEdge => {
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
        isTransposition: false, // TODO: Calculate from incoming edges
      },
    };
  };

  /**
   * Apply focus mode - dim nodes not in the focus path
   */
  const applyFocusMode = (
    nodes: PositionNode[],
    edges: MoveEdge[],
    focusNodeId: string
  ) => {
    // Find ancestors of selected node
    const ancestors = new Set<string>();
    let current = focusNodeId;

    while (current) {
      ancestors.add(current);
      const parentEdge = edges.find((e) => e.target === current);
      current = parentEdge?.source || "";
    }

    // Find immediate children of selected node
    const children = new Set(
      edges.filter((e) => e.source === focusNodeId).map((e) => e.target)
    );

    // Update nodes
    for (const node of nodes) {
      const isInFocus = ancestors.has(node.id) || children.has(node.id) || node.id === focusNodeId;
      node.data.isFocused = isInFocus;
      node.data.isDimmed = !isInFocus;
    }
  };

  /**
   * Expand a node to show its children
   */
  const expandNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => new Set([...prev, nodeId]));
  }, []);

  /**
   * Expand children of a node (called after initial load)
   */
  const expandNodeChildren = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => new Set([...prev, nodeId]));
  }, []);

  /**
   * Collapse a node to hide its children
   */
  const collapseNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  /**
   * Select a node
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    // Also update app store for cross-component communication
    useAppStore.getState().setSelectedNodeId(nodeId);
  }, []);

  /**
   * Toggle focus mode
   */
  const toggleFocusMode = useCallback(() => {
    setFocusModeEnabled((prev) => !prev);
  }, []);

  /**
   * Navigate to parent node
   */
  const navigateToParent = useCallback(() => {
    if (!selectedNodeId) return;

    const parentEdge = edges.find((e) => e.target === selectedNodeId);
    if (parentEdge) {
      selectNode(parentEdge.source);
    }
  }, [selectedNodeId, edges, selectNode]);

  /**
   * Navigate to child node (by index, default first/main line)
   */
  const navigateToChild = useCallback((index = 0) => {
    if (!selectedNodeId) return;

    const childEdges = edges
      .filter((e) => e.source === selectedNodeId)
      .sort((a, b) => (b.data?.timesPlayed || 0) - (a.data?.timesPlayed || 0));

    if (childEdges[index]) {
      selectNode(childEdges[index].target);
    }
  }, [selectedNodeId, edges, selectNode]);

  /**
   * Navigate to sibling node
   */
  const navigateToSibling = useCallback((direction: "prev" | "next") => {
    if (!selectedNodeId) return;

    // Find parent
    const parentEdge = edges.find((e) => e.target === selectedNodeId);
    if (!parentEdge) return;

    // Find siblings
    const siblingEdges = edges
      .filter((e) => e.source === parentEdge.source)
      .sort((a, b) => (b.data?.timesPlayed || 0) - (a.data?.timesPlayed || 0));

    const currentIndex = siblingEdges.findIndex((e) => e.target === selectedNodeId);
    const newIndex = direction === "next"
      ? (currentIndex + 1) % siblingEdges.length
      : (currentIndex - 1 + siblingEdges.length) % siblingEdges.length;

    if (siblingEdges[newIndex]) {
      selectNode(siblingEdges[newIndex].target);
    }
  }, [selectedNodeId, edges, selectNode]);

  /**
   * Reset to root node
   */
  const resetToRoot = useCallback(() => {
    selectNode("start");
    setExpandedNodeIds(new Set(["start"]));
    setStoreDepth(2);
  }, [selectNode, setStoreDepth]);

  /**
   * Calculate visibility info
   */
  const visibilityInfo = useMemo((): VisibilityInfo => {
    const totalPossible = MOCK_POSITIONS.length; // TODO: Get from DB
    return {
      visibleNodes: nodes.length,
      hiddenNodes: totalPossible - nodes.length,
      maxDepthReached: nodes.length >= MAX_VISIBLE_NODES,
      performanceLimited: nodes.length >= MAX_VISIBLE_NODES,
    };
  }, [nodes.length]);

  return {
    nodes,
    edges,
    selectedNodeId,
    visibilityDepth,
    visibilityInfo,
    focusModeEnabled,
    selectNode,
    expandNode,
    collapseNode,
    setVisibilityDepth: setStoreDepth,
    toggleFocusMode,
    navigateToParent,
    navigateToChild,
    navigateToSibling,
    resetToRoot,
  };
}
```

### 3. Create Dagre Layout Utility

**File: `app/explore/_lib/graph-layout.ts`**

```typescript
import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { LayoutConfig } from "./types";

const DEFAULT_CONFIG: LayoutConfig = {
  direction: "TB",
  nodeSep: 80,
  rankSep: 120,
  marginX: 20,
  marginY: 20,
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;

/**
 * Apply dagre layout to nodes and edges
 * Preserves existing positions for nodes that haven't moved
 */
export function applyDagreLayout<T extends Node, E extends Edge>(
  nodes: T[],
  edges: E[],
  config: Partial<LayoutConfig> = {},
  existingPositions?: Map<string, { x: number; y: number }>
): T[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: finalConfig.direction,
    nodesep: finalConfig.nodeSep,
    ranksep: finalConfig.rankSep,
    marginx: finalConfig.marginX,
    marginy: finalConfig.marginY,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run layout
  dagre.layout(g);

  // Apply positions
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    // If we have an existing position and this isn't a new node,
    // keep the existing position (prevents jitter)
    const existing = existingPositions?.get(node.id);
    const isNewNode = !existing;

    const position = {
      x: dagreNode.x - NODE_WIDTH / 2,
      y: dagreNode.y - NODE_HEIGHT / 2,
    };

    return {
      ...node,
      position: isNewNode ? position : existing,
      // Store target position for animation
      data: {
        ...node.data,
        targetPosition: position,
      },
    };
  });
}

/**
 * Animate nodes to their target positions
 * Call this after applying layout to smoothly transition
 */
export function animateToTargetPositions<T extends Node>(
  nodes: T[],
  duration = 300
): Promise<T[]> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const startPositions = new Map(
      nodes.map((n) => [n.id, { ...n.position }])
    );

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      const updatedNodes = nodes.map((node) => {
        const start = startPositions.get(node.id)!;
        const target = (node.data as any).targetPosition || node.position;

        return {
          ...node,
          position: {
            x: start.x + (target.x - start.x) * eased,
            y: start.y + (target.y - start.y) * eased,
          },
        };
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve(updatedNodes);
      }
    };

    requestAnimationFrame(animate);
  });
}

// Ease-out timing function
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

### 4. Create GraphNode Component

**File: `app/explore/_components/graph-node.tsx`**

```typescript
"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/app/lib/cn";
import { WinRateBar } from "@/app/components/win-rate-bar";
import type { PositionNodeData } from "../_lib/types";

/**
 * Custom node component for positions in the graph
 */
export const GraphNode = memo(function GraphNode({
  data,
  selected,
}: NodeProps<PositionNodeData>) {
  const {
    moveSan,
    openingName,
    totalGames,
    whiteWins,
    draws,
    blackWins,
    incomingEdgeCount,
    isDimmed,
  } = data;

  // Format game count
  const formattedGames = formatNumber(totalGames);

  // Has transpositions?
  const hasTranspositions = incomingEdgeCount > 1;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-surface p-4 shadow-sm transition-all duration-normal",
        "w-[200px]",
        selected && "border-accent ring-2 ring-accent/20 shadow-lg",
        !selected && "border-border-subtle hover:border-border hover:shadow-md",
        isDimmed && "opacity-40"
      )}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border-strong !w-3 !h-3 !border-2 !border-surface"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border-strong !w-3 !h-3 !border-2 !border-surface"
      />

      {/* Move that led here */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-semibold font-mono text-text-primary">
          {moveSan || "Start"}
        </span>

        {/* Transposition badge */}
        {hasTranspositions && (
          <span
            className="flex items-center gap-1 text-xs text-chess-transposition"
            title={`${incomingEdgeCount} paths lead here`}
          >
            <span>⑂</span>
            <span>{incomingEdgeCount}</span>
          </span>
        )}
      </div>

      {/* Opening name */}
      {openingName && (
        <p className="text-sm text-text-secondary truncate mb-3" title={openingName}>
          {openingName}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-border-subtle my-2" />

      {/* Stats */}
      <div className="space-y-2">
        <p className="text-xs text-text-tertiary">
          {formattedGames} games
        </p>

        {/* Win rate bar */}
        <WinRateBar
          whiteWins={whiteWins}
          draws={draws}
          blackWins={blackWins}
        />

        {/* Win percentages */}
        <div className="flex justify-between text-xs text-text-secondary">
          <span className="text-chess-white-wins">
            {((whiteWins / totalGames) * 100).toFixed(0)}%
          </span>
          <span className="text-chess-draw">
            {((draws / totalGames) * 100).toFixed(0)}%
          </span>
          <span className="text-chess-black-wins">
            {((blackWins / totalGames) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
});

// Format large numbers (1,234,567 → 1.2M)
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
```

### 5. Create GraphEdge Component

**File: `app/explore/_components/graph-edge.tsx`**

```typescript
"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { cn } from "@/app/lib/cn";
import type { MoveEdgeData } from "../_lib/types";

/**
 * Custom edge component for moves in the graph
 */
export const GraphEdge = memo(function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<MoveEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { moveSan, timesPlayed, isMainLine, isTransposition } = data || {};

  // Calculate edge thickness based on frequency
  const maxThickness = 4;
  const minThickness = 1;
  // Using log scale for thickness
  const thickness = Math.max(
    minThickness,
    Math.min(maxThickness, Math.log10(timesPlayed || 1))
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "transition-all duration-fast",
          isTransposition && "stroke-chess-transposition",
          !isTransposition && isMainLine && "stroke-text-secondary",
          !isTransposition && !isMainLine && "stroke-border-strong"
        )}
        style={{
          strokeWidth: thickness,
          strokeDasharray: isTransposition ? "5 5" : undefined,
        }}
      />

      {/* Edge label (move notation) */}
      <EdgeLabelRenderer>
        <div
          className={cn(
            "absolute px-2 py-0.5 rounded text-xs font-mono pointer-events-none",
            "bg-surface border border-border-subtle shadow-sm",
            "transform -translate-x-1/2 -translate-y-1/2",
            "opacity-0 transition-opacity duration-fast",
            selected && "opacity-100"
          )}
          style={{
            left: labelX,
            top: labelY,
          }}
        >
          {moveSan}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
```

### 6. Create Graph Controls Component

**File: `app/explore/_components/graph-controls.tsx`**

```typescript
"use client";

import { Minus, Plus, Home, Focus, Maximize2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";
import { cn } from "@/app/lib/cn";

interface GraphControlsProps {
  visibilityDepth: number;
  maxDepth?: number;
  focusModeEnabled: boolean;
  visibleNodes: number;
  hiddenNodes: number;
  onDepthChange: (depth: number) => void;
  onFocusModeToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetToRoot: () => void;
}

export function GraphControls({
  visibilityDepth,
  maxDepth = 5,
  focusModeEnabled,
  visibleNodes,
  hiddenNodes,
  onDepthChange,
  onFocusModeToggle,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetToRoot,
}: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
      {/* Left side: Depth control */}
      <div className="pointer-events-auto bg-surface/90 backdrop-blur-sm rounded-lg border border-border-subtle p-4 shadow-md">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Visibility Depth</span>
            <span className="font-mono text-text-primary">{visibilityDepth} ply</span>
          </div>

          <Slider
            value={[visibilityDepth]}
            min={1}
            max={maxDepth}
            step={1}
            onValueChange={([value]) => onDepthChange(value)}
            className="w-48"
          />

          <div className="text-xs text-text-tertiary">
            Showing {visibleNodes} nodes · {hiddenNodes} hidden
          </div>
        </div>
      </div>

      {/* Right side: View controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Focus mode toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFocusModeToggle}
          className={cn(
            "gap-2",
            focusModeEnabled && "bg-accent-light border-accent text-accent"
          )}
        >
          <Focus className="h-4 w-4" />
          Focus
        </Button>

        {/* Zoom controls */}
        <div className="flex items-center bg-surface/90 backdrop-blur-sm rounded-lg border border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="rounded-r-none"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="rounded-none border-x border-border-subtle"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFitView}
            className="rounded-l-none"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Reset button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onResetToRoot}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
```

### 7. Create Position Panel Component

**File: `app/explore/_components/position-panel.tsx`**

```typescript
"use client";

import { X, ExternalLink } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { WinRateBar } from "@/app/components/win-rate-bar";
import { MiniBoard } from "./mini-board";
import type { PositionNodeData } from "../_lib/types";

interface PositionPanelProps {
  data: PositionNodeData | null;
  onClose: () => void;
  onAnalyze: () => void;
}

export function PositionPanel({ data, onClose, onAnalyze }: PositionPanelProps) {
  if (!data) return null;

  const {
    fen,
    openingName,
    variationName,
    eco,
    totalGames,
    whiteWins,
    draws,
    blackWins,
    avgElo,
    incomingEdgeCount,
  } = data;

  const whitePercent = ((whiteWins / totalGames) * 100).toFixed(1);
  const drawPercent = ((draws / totalGames) * 100).toFixed(1);
  const blackPercent = ((blackWins / totalGames) * 100).toFixed(1);

  return (
    <div className="absolute right-4 top-4 w-80 bg-surface border border-border-subtle rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div>
          {eco && (
            <span className="text-xs font-mono text-text-tertiary mr-2">
              {eco}
            </span>
          )}
          <h3 className="text-lg font-semibold text-text-primary">
            {openingName || "Position"}
          </h3>
          {variationName && (
            <p className="text-sm text-text-secondary">{variationName}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mini board */}
      <div className="p-4 bg-surface-hover">
        <MiniBoard fen={fen} />
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Games count */}
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Total games</span>
          <span className="font-semibold text-text-primary">
            {totalGames.toLocaleString()}
          </span>
        </div>

        {/* Win rates */}
        <div className="space-y-2">
          <WinRateBar
            whiteWins={whiteWins}
            draws={draws}
            blackWins={blackWins}
            showLabels
          />
          <div className="flex justify-between text-xs">
            <span className="text-chess-white-wins">
              White: {whitePercent}% ({whiteWins.toLocaleString()})
            </span>
            <span className="text-chess-black-wins">
              Black: {blackPercent}% ({blackWins.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Average Elo */}
        {avgElo && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Avg rating</span>
            <span className="font-mono text-text-primary">{avgElo}</span>
          </div>
        )}

        {/* Transpositions */}
        {incomingEdgeCount > 1 && (
          <div className="p-3 bg-accent-light rounded-md">
            <div className="flex items-center gap-2 text-sm text-accent">
              <span>⑂</span>
              <span>{incomingEdgeCount} paths lead to this position</span>
            </div>
            {/* TODO: Show actual paths when data is available */}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-subtle">
        <Button onClick={onAnalyze} className="w-full gap-2">
          <ExternalLink className="h-4 w-4" />
          Analyze Position
        </Button>
      </div>
    </div>
  );
}
```

### 8. Create Mini Board Component

**File: `app/explore/_components/mini-board.tsx`**

```typescript
"use client";

import { useMemo } from "react";

interface MiniBoardProps {
  fen: string;
  size?: number;
}

/**
 * Simple static mini board for position preview
 * This is NOT an interactive board - just a visual preview
 *
 * Note: Agent 4 builds the full interactive board.
 * This is intentionally simple.
 */
export function MiniBoard({ fen, size = 200 }: MiniBoardProps) {
  const squareSize = size / 8;

  const board = useMemo(() => parseFenToBoard(fen), [fen]);

  return (
    <div
      className="relative border border-border rounded overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* Squares */}
      {Array.from({ length: 64 }).map((_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isLight = (row + col) % 2 === 0;
        const piece = board[7 - row][col];

        return (
          <div
            key={i}
            className={`absolute ${isLight ? "bg-square-light" : "bg-square-dark"}`}
            style={{
              left: col * squareSize,
              top: row * squareSize,
              width: squareSize,
              height: squareSize,
            }}
          >
            {piece && (
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl select-none"
                style={{ fontSize: squareSize * 0.7 }}
              >
                {getPieceUnicode(piece)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Parse FEN board string to 2D array
function parseFenToBoard(fen: string): (string | null)[][] {
  const board: (string | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const [boardPart] = fen.split(" ");
  const rows = boardPart.split("/");

  rows.forEach((row, rowIdx) => {
    let colIdx = 0;
    for (const char of row) {
      if (char >= "1" && char <= "8") {
        colIdx += parseInt(char, 10);
      } else {
        board[rowIdx][colIdx] = char;
        colIdx++;
      }
    }
  });

  return board;
}

// Get Unicode chess piece
function getPieceUnicode(piece: string): string {
  const pieces: Record<string, string> = {
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
  };
  return pieces[piece] || "";
}
```

### 9. Create Main Explore Page

**File: `app/explore/page.tsx`**

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraph } from "./_hooks/use-graph";
import { GraphNode } from "./_components/graph-node";
import { GraphEdge } from "./_components/graph-edge";
import { GraphControls } from "./_components/graph-controls";
import { PositionPanel } from "./_components/position-panel";
import { applyDagreLayout } from "./_lib/graph-layout";
import { useRouter } from "next/navigation";

// Define custom node and edge types
const nodeTypes: NodeTypes = {
  position: GraphNode,
};

const edgeTypes: EdgeTypes = {
  move: GraphEdge,
};

export default function ExplorePage() {
  const router = useRouter();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const previousPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const {
    nodes,
    edges,
    selectedNodeId,
    visibilityDepth,
    visibilityInfo,
    focusModeEnabled,
    selectNode,
    expandNode,
    collapseNode,
    setVisibilityDepth,
    toggleFocusMode,
    navigateToParent,
    navigateToChild,
    navigateToSibling,
    resetToRoot,
  } = useGraph();

  // Apply dagre layout to nodes
  const layoutedNodes = applyDagreLayout(
    nodes,
    edges,
    { direction: "TB" },
    previousPositions.current
  );

  // Store positions for next render
  useEffect(() => {
    const newPositions = new Map<string, { x: number; y: number }>();
    layoutedNodes.forEach((node) => {
      newPositions.set(node.id, node.position);
    });
    previousPositions.current = newPositions;
  }, [layoutedNodes]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle node double click (expand/collapse)
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      if (nodes.find((n) => n.id === node.id)?.data.isExpanded) {
        collapseNode(node.id);
      } else {
        expandNode(node.id);
      }
    },
    [nodes, expandNode, collapseNode]
  );

  // Handle background click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          navigateToParent();
          break;
        case "ArrowDown":
          e.preventDefault();
          navigateToChild();
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateToSibling("prev");
          break;
        case "ArrowRight":
          if (e.shiftKey) {
            e.preventDefault();
            navigateToChild(); // Main line
          } else {
            e.preventDefault();
            navigateToSibling("next");
          }
          break;
        case " ": // Space
          e.preventDefault();
          if (selectedNodeId) {
            const node = nodes.find((n) => n.id === selectedNodeId);
            if (node?.data.isExpanded) {
              collapseNode(selectedNodeId);
            } else {
              expandNode(selectedNodeId);
            }
          }
          break;
        case "[":
          e.preventDefault();
          setVisibilityDepth(Math.max(1, visibilityDepth - 1));
          break;
        case "]":
          e.preventDefault();
          setVisibilityDepth(Math.min(5, visibilityDepth + 1));
          break;
        case "f":
          e.preventDefault();
          toggleFocusMode();
          break;
        case "Home":
          e.preventDefault();
          resetToRoot();
          break;
        case "a":
          e.preventDefault();
          if (selectedNodeId) {
            handleAnalyze();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    visibilityDepth,
    nodes,
    navigateToParent,
    navigateToChild,
    navigateToSibling,
    expandNode,
    collapseNode,
    setVisibilityDepth,
    toggleFocusMode,
    resetToRoot,
  ]);

  // Handle analyze button
  const handleAnalyze = useCallback(() => {
    if (selectedNodeId) {
      const node = nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        // Navigate to analyze mode with this position
        const fen = encodeURIComponent(node.data.fen);
        router.push(`/analyze?fen=${fen}`);
      }
    }
  }, [selectedNodeId, nodes, router]);

  // Get selected node data
  const selectedNodeData = nodes.find((n) => n.id === selectedNodeId)?.data || null;

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <ReactFlow
        nodes={layoutedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "move",
        }}
      >
        <Background color="hsl(var(--border-subtle))" gap={20} />
        <MiniMap
          nodeColor={(node) =>
            node.data?.isSelected
              ? "hsl(var(--accent))"
              : "hsl(var(--border-default))"
          }
          className="!bg-surface !border-border-subtle"
        />
      </ReactFlow>

      {/* Controls */}
      <GraphControls
        visibilityDepth={visibilityDepth}
        focusModeEnabled={focusModeEnabled}
        visibleNodes={visibilityInfo.visibleNodes}
        hiddenNodes={visibilityInfo.hiddenNodes}
        onDepthChange={setVisibilityDepth}
        onFocusModeToggle={toggleFocusMode}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView()}
        onResetToRoot={resetToRoot}
      />

      {/* Position panel */}
      <PositionPanel
        data={selectedNodeData}
        onClose={() => selectNode(null)}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}
```

### 10. Wrap Page with ReactFlowProvider

**File: `app/explore/layout.tsx`**

```typescript
"use client";

import { ReactFlowProvider } from "reactflow";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
```

### 11. Create Index Export

**File: `app/explore/_components/index.ts`**

```typescript
export { GraphNode } from "./graph-node";
export { GraphEdge } from "./graph-edge";
export { GraphControls } from "./graph-controls";
export { PositionPanel } from "./position-panel";
export { MiniBoard } from "./mini-board";
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] `app/explore/_lib/types.ts` - Types defined
- [ ] `app/explore/_hooks/use-graph.ts` - Hook working with mock data
- [ ] `app/explore/_lib/graph-layout.ts` - Dagre layout working
- [ ] `app/explore/_components/graph-node.tsx` - Node renders correctly
- [ ] `app/explore/_components/graph-edge.tsx` - Edge renders correctly
- [ ] `app/explore/_components/graph-controls.tsx` - Controls working
- [ ] `app/explore/_components/position-panel.tsx` - Panel shows on selection
- [ ] `app/explore/_components/mini-board.tsx` - Board preview renders
- [ ] `app/explore/page.tsx` - Page loads with graph
- [ ] Keyboard navigation works (arrows, space, brackets)
- [ ] Visibility depth slider works
- [ ] Focus mode toggles correctly
- [ ] `npm run dev` works without errors

---

## Notes for Other Agents

### For Agent 1 (Data):
When your queries are ready, I need to replace mock data imports:
```typescript
// Replace:
import { MOCK_POSITIONS, MOCK_EDGES } from "@/app/lib/db/mock-data";

// With:
import { getPositionWithEdges, getStartingPosition } from "@/app/lib/db/positions";
```

### For Agent 4 (Analyze):
I pass the FEN to Analyze mode via URL:
```typescript
router.push(`/analyze?fen=${encodeURIComponent(fen)}`);
```
Please handle this query parameter on your page.

---

## Import Path Convention

This project uses `@/` as an alias for the project root. All imports should use:
- `@/app/explore/_components/...` for Explore components
- `@/app/explore/_hooks/...` for Explore hooks
- `@/app/explore/_lib/...` for Explore utilities
- `@/app/lib/db/...` for database utilities (Agent 1)
- `@/app/components/...` for shared components
- `@/app/stores/...` for Zustand stores

For imports within the explore feature, use relative paths:
- `../_lib/types` from `_components/`
- `./_components/graph-node` from `page.tsx`
