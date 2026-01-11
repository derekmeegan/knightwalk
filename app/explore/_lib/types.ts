import type { Node, Edge } from "reactflow";

// ============================================
// GRAPH NODE TYPES
// ============================================

export interface PositionNodeData {
  positionId: string;
  fen: string;
  moveSan: string | null; // The move that led to this position (null for root)
  openingName: string | null;
  variationName: string | null;
  eco: string | null;
  totalGames: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  avgElo: number | null;
  incomingEdgeCount: number; // For transposition indicator
  isExpanded: boolean; // Are children visible?
  isSelected: boolean;
  isFocused: boolean; // Is this in the focus path?
  isDimmed: boolean; // Dimmed in focus mode?
  pathFens: string[]; // FEN positions from start to this position (for animation)
  isPathNode?: boolean; // Is this node part of the current path (ancestors + current)?
  isCurrentNode?: boolean; // Is this the current/selected node?
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
  isMainLine: boolean; // Most played move from parent
  isTransposition: boolean; // Does this create a transposition?
  isPathEdge?: boolean; // Is this edge part of the current path?
}

export type MoveEdge = Edge<MoveEdgeData>;

// ============================================
// GRAPH STATE
// ============================================

export interface GraphState {
  nodes: PositionNode[];
  edges: MoveEdge[];
  selectedNodeId: string | null;
  visibilityDepth: number; // How many ply to show
  focusModeEnabled: boolean;
  expandedNodeIds: Set<string>; // Which nodes have been expanded
}

// ============================================
// LAYOUT TYPES
// ============================================

export interface LayoutConfig {
  direction: "TB" | "LR"; // Top-to-bottom or left-to-right
  nodeSep: number; // Horizontal spacing
  rankSep: number; // Vertical spacing
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
