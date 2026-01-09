"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/app/lib/cn";
import { WinRateBar } from "@/app/components/win-rate-bar";
import { MiniBoard } from "./mini-board";
import type { PositionNodeData } from "../_lib/types";

/**
 * Custom node component for positions in the graph
 */
export const GraphNode = memo(function GraphNode({
  data,
  selected,
}: NodeProps<PositionNodeData>) {
  const router = useRouter();
  const {
    positionId,
    fen,
    moveSan,
    openingName,
    totalGames,
    whiteWins,
    draws,
    blackWins,
    incomingEdgeCount,
    isDimmed,
    isExpanded,
  } = data;

  // Format game count
  const formattedGames = formatNumber(totalGames);

  // Has transpositions?
  const hasTranspositions = incomingEdgeCount > 1;

  // Navigate to analyze page
  const handleAnalyze = () => {
    router.push(`/analyze?fen=${encodeURIComponent(fen)}`);
  };

  // Is this a leaf node (no children visible)?
  const isLeafNode = !isExpanded;

  return (
    <div
      className={cn(
        "relative rounded-lg bg-surface p-3 shadow-sm transition-all duration-200 cursor-pointer",
        "w-[180px]",
        selected && "border border-accent ring-2 ring-accent/20 shadow-xl shadow-black/25",
        !selected && "border-transparent hover:shadow-md",
        isDimmed && "opacity-40"
      )}
    >
      {/* Connection handles - horizontal layout */}
      {/* Target handle (incoming) - always visible except for root */}
      {moveSan && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-border-strong !w-2.5 !h-2.5 !border-2 !border-surface"
        />
      )}
      {/* Source handle (outgoing) - only visible if node is expanded (has children) */}
      {!isLeafNode && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-border-strong !w-2.5 !h-2.5 !border-2 !border-surface"
        />
      )}

      {/* Move that led here */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold font-mono text-primary">
          {moveSan || "Start"}
        </span>

        {/* Transposition badge */}
        {hasTranspositions && (
          <span
            className="flex items-center gap-0.5 text-xs text-transposition"
            title={`${incomingEdgeCount} paths lead here`}
          >
            <span>⑂</span>
            <span>{incomingEdgeCount}</span>
          </span>
        )}
      </div>

      {/* Mini board - focused when selected (enables hover + click to analyze) */}
      <div className="mb-2">
        <MiniBoard
          fen={fen}
          size={154}
          focused={selected}
          onAnalyze={handleAnalyze}
        />
      </div>

      {/* Opening name */}
      {openingName && (
        <p
          className="text-xs text-secondary truncate mb-1"
          title={openingName}
        >
          {openingName}
        </p>
      )}

      {/* Stats */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-tertiary">{formattedGames} games</p>
        </div>

        {/* Win rate bar */}
        <WinRateBar whiteWins={whiteWins} draws={draws} blackWins={blackWins} />

        {/* Win percentages */}
        <div className="flex justify-between text-[10px] text-secondary">
          <span className="text-white-wins">
            {((whiteWins / totalGames) * 100).toFixed(0)}%
          </span>
          <span className="text-draw">
            {((draws / totalGames) * 100).toFixed(0)}%
          </span>
          <span className="text-black-wins">
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
