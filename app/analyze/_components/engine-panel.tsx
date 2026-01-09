"use client";

import { Pause, Play, Cpu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { EvalBar } from "./eval-bar";
import { PVLines } from "./pv-lines";
import type { EngineInfo } from "@/app/lib/chess/types";

interface EnginePanelProps {
  info: EngineInfo | null;
  onPause: () => void;
  onResume: () => void;
}

export function EnginePanel({
  info,
  onPause,
  onResume,
}: EnginePanelProps) {
  const isAnalyzing = info?.state === "analyzing";
  const isLoading = info?.state === "loading";

  // Get primary evaluation
  const primaryEval = info?.evaluations[0];
  const score = primaryEval?.score ?? 0;
  const scoreDisplay = formatScore(primaryEval);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden min-h-[140px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-zinc-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {info?.name || "Stockfish"}
          </span>
          <span className="text-sm text-zinc-500">
            Depth: {info?.depth || 0}/{info?.maxDepth || 16}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Engine state indicator */}
          <EngineStateIndicator state={info?.state || "idle"} />

          {/* Pause/Resume button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isAnalyzing ? onPause : onResume}
            disabled={isLoading}
          >
            {isAnalyzing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Evaluation bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-semibold text-zinc-900 dark:text-zinc-100 min-w-[60px]">
            {scoreDisplay}
          </span>
          <EvalBar score={score} />
        </div>
      </div>

      {/* Principal variations */}
      <div className="px-3 pb-3">
        <PVLines evaluations={info?.evaluations || []} />
      </div>
    </div>
  );
}

function EngineStateIndicator({ state }: { state: string }) {
  const config = {
    idle: { color: "bg-zinc-400", label: "Ready" },
    loading: { color: "bg-amber-500 animate-pulse", label: "Loading..." },
    ready: { color: "bg-emerald-500", label: "Ready" },
    analyzing: { color: "bg-blue-500 animate-pulse", label: "Analyzing..." },
    paused: { color: "bg-amber-500", label: "Paused" },
    error: { color: "bg-red-500", label: "Error" },
  }[state] || { color: "bg-zinc-400", label: state };

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.label}</span>
    </div>
  );
}

function formatScore(evaluation?: { score: number; scoreType: string; mateIn?: number }): string {
  if (!evaluation) return "0.00";

  if (evaluation.scoreType === "mate" && evaluation.mateIn !== undefined) {
    return evaluation.mateIn > 0 ? `M${evaluation.mateIn}` : `-M${Math.abs(evaluation.mateIn)}`;
  }

  const score = evaluation.score / 100; // Convert centipawns to pawns
  const sign = score >= 0 ? "+" : "";
  return `${sign}${score.toFixed(2)}`;
}
