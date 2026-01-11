"use client";

import { memo } from "react";

interface EvalBarProps {
  score: number; // In centipawns
  orientation?: "horizontal" | "vertical";
  size?: number; // width for vertical, height for horizontal
}

export const EvalBar = memo(function EvalBar({
  score,
  orientation = "horizontal",
  size = 24
}: EvalBarProps) {
  // Handle Infinity/large mate scores (50000cp = winning side)
  // These come from engine when position is checkmate
  let percentage: number;
  if (!isFinite(score) || Math.abs(score) >= 50000) {
    // Decisive position - show full bar for winning side
    percentage = score > 0 ? 100 : 0;
  } else {
    // Clamp score to +/-1000 centipawns (+/-10 pawns) for display
    const clampedScore = Math.max(-1000, Math.min(1000, score));
    // Convert to percentage (0 = black winning, 50 = equal, 100 = white winning)
    // Using a sigmoid-like transformation for better visualization
    percentage = scoreToPercentage(clampedScore);
  }

  if (orientation === "vertical") {
    // Vertical bar - white fills from bottom, black from top
    return (
      <div
        className="rounded overflow-hidden bg-zinc-800 h-full relative"
        style={{ width: size }}
      >
        <div
          className="w-full bg-zinc-100 transition-all duration-200 ease-out absolute bottom-0 left-0"
          style={{ height: `${percentage}%` }}
        />
      </div>
    );
  }

  // Horizontal bar
  return (
    <div
      className="flex-1 rounded-full overflow-hidden bg-zinc-800"
      style={{ height: size }}
    >
      <div
        className="h-full bg-zinc-100 transition-all duration-200 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});

// Convert centipawn score to display percentage
function scoreToPercentage(score: number): number {
  // Use a sigmoid function for smooth transition
  // At +/-500cp (+/-5 pawns), it's roughly 90%/10%
  const k = 0.004; // Steepness factor
  const percentage = 100 / (1 + Math.exp(-k * score));
  return percentage;
}
