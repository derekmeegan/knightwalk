"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";

interface BoardControlsProps {
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  onReset: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function BoardControls({
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onFlip,
  onReset,
  canGoBack,
  canGoForward,
}: BoardControlsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between">
        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onFirst}
                disabled={!canGoBack}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to start (Shift+Left)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous move (Left)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next move (Right)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onLast}
                disabled={!canGoForward}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to end (Shift+Right)</TooltipContent>
          </Tooltip>
        </div>

        {/* Board controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onFlip}>
                <FlipVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flip board (F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset position</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
