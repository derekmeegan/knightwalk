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

export function PositionPanel({
  data,
  onClose,
  onAnalyze,
}: PositionPanelProps) {
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
            <span className="text-xs font-mono text-tertiary mr-2">{eco}</span>
          )}
          <h3 className="text-lg font-semibold text-primary">
            {openingName || "Position"}
          </h3>
          {variationName && (
            <p className="text-sm text-secondary">{variationName}</p>
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
          <span className="text-secondary">Total games</span>
          <span className="font-semibold text-primary">
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
            <span className="text-white-wins">
              White: {whitePercent}%
            </span>
            <span className="text-draw">
              Draw: {drawPercent}%
            </span>
            <span className="text-black-wins">
              Black: {blackPercent}%
            </span>
          </div>
        </div>

        {/* Average Elo */}
        {avgElo && (
          <div className="flex justify-between text-sm">
            <span className="text-secondary">Avg rating</span>
            <span className="font-mono text-primary">{avgElo}</span>
          </div>
        )}

        {/* Transpositions */}
        {incomingEdgeCount > 1 && (
          <div className="p-3 bg-accent-light rounded-md">
            <div className="flex items-center gap-2 text-sm text-accent">
              <span>⑂</span>
              <span>{incomingEdgeCount} paths lead to this position</span>
            </div>
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
