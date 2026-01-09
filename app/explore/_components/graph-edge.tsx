"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
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
  markerEnd,
}: EdgeProps<MoveEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { timesPlayed, isMainLine, isTransposition } = data || {};

  // Calculate edge thickness based on frequency (log scale)
  const thickness = Math.max(1.5, Math.min(4, Math.log10(timesPlayed || 1) + 1));

  // Determine stroke color - using direct colors for SVG compatibility
  const strokeColor = isTransposition
    ? "#d97706" // amber for transposition
    : isMainLine
      ? "#6b7280" // gray for main line
      : "#9ca3af"; // lighter gray for alternatives

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: strokeColor,
        strokeWidth: thickness,
        strokeDasharray: isTransposition ? "5 5" : undefined,
      }}
    />
  );
});
