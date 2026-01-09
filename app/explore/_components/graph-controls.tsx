"use client";

import { Minus, Plus, Maximize2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";

interface GraphControlsProps {
  visibilityDepth: number;
  maxDepth?: number;
  visibleNodes: number;
  onDepthChange: (depth: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function GraphControls({
  visibilityDepth,
  maxDepth = 20,
  visibleNodes,
  onDepthChange,
  onZoomIn,
  onZoomOut,
  onFitView,
}: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
      {/* Left side: Depth control */}
      <div className="pointer-events-auto bg-surface/90 backdrop-blur-sm rounded-lg border border-border-subtle p-4 shadow-md">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Depth</span>
            <span className="font-mono text-primary">{visibilityDepth}</span>
          </div>

          <Slider
            value={[visibilityDepth]}
            min={1}
            max={maxDepth}
            step={1}
            onValueChange={([value]) => onDepthChange(value)}
            className="w-48"
          />

          <div className="text-xs text-tertiary">
            {visibleNodes} positions
          </div>
        </div>
      </div>

      {/* Right side: Zoom controls */}
      <div className="pointer-events-auto">
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
      </div>
    </div>
  );
}
