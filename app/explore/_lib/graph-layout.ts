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

const NODE_WIDTH = 180;
const NODE_HEIGHT = 280;

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
  if (nodes.length === 0) return nodes;

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
        const target = (node.data as Record<string, unknown>).targetPosition as
          | { x: number; y: number }
          | undefined;
        const targetPos = target || node.position;

        return {
          ...node,
          position: {
            x: start.x + (targetPos.x - start.x) * eased,
            y: start.y + (targetPos.y - start.y) * eased,
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
