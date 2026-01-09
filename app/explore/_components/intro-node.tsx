"use client";

import { memo } from "react";
import { type NodeProps } from "reactflow";

/**
 * Intro node component - displays app info next to start position
 */
export const IntroNode = memo(function IntroNode({}: NodeProps) {
  return (
    <div className="w-[240px] text-right pr-4">
      <h1 className="text-2xl font-bold text-primary mb-2">Knightwalk</h1>
      <p className="text-sm text-secondary mb-4">
        Explore chess openings as an interactive graph. Navigate through moves
        and discover transpositions.
      </p>
      <div className="text-xs text-tertiary space-y-1">
        <p>
          <span className="text-secondary">←→</span> Navigate moves
        </p>
        <p className="flex items-center justify-end gap-1">
          <svg className="w-3 h-3 text-secondary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4l16 8-7 2-2 7z" />
          </svg>
          <span>Analyze position</span>
        </p>
        <p>
          <span className="text-secondary">Esc</span> Return to start
        </p>
      </div>
    </div>
  );
});
