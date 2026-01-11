"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getEngine } from "@/app/lib/chess/engine";
import { getFocusPolicy } from "@/app/lib/chess/focus-analysis";
import type { EngineInfo, EngineEvaluation } from "@/app/lib/chess/types";

interface UseEngineOptions {
  autoStart?: boolean;
  depth?: number;
}

interface UseEngineResult {
  info: EngineInfo | null;
  evaluations: EngineEvaluation[];
  isReady: boolean;
  isAnalyzing: boolean;
  analyze: (fen: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setDepth: (depth: number) => void;
}

/**
 * Hook for using the Stockfish engine
 */
export function useEngine(options: UseEngineOptions = {}): UseEngineResult {
  const { autoStart = true, depth = 16 } = options;

  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentFenRef = useRef<string | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!autoStart) return;

    const engine = getEngine();

    engine.onEngineUpdate((newInfo) => {
      setInfo(newInfo);
    });

    engine.init()
      .then((success) => {
        setIsReady(success);
        if (success) {
          engine.setDepth(depth);
        }
      })
      .catch((err) => {
        console.error("Engine initialization failed:", err);
        setIsReady(false);
      });

    return () => {
      // Don't destroy engine on unmount - it's a singleton
      // Just stop current analysis
      engine.stop();
    };
  }, [autoStart, depth]);

  const analyze = useCallback((fen: string) => {
    currentFenRef.current = fen;
    const engine = getEngine();
    const policy = getFocusPolicy();

    // Check engine state before updating policy to avoid state mismatch
    const engineState = engine.getInfo().state;
    if (engineState === "paused") {
      // Don't update policy if engine won't analyze
      return;
    }

    policy.onPositionChange(fen);
    engine.analyze(fen);
  }, []);

  const stop = useCallback(() => {
    const engine = getEngine();
    engine.stop();
  }, []);

  const pause = useCallback(() => {
    const engine = getEngine();
    engine.pause();
  }, []);

  const resume = useCallback(() => {
    const engine = getEngine();
    if (currentFenRef.current) {
      engine.resume(currentFenRef.current);
    }
  }, []);

  const setEngineDepth = useCallback((newDepth: number) => {
    const engine = getEngine();
    engine.setDepth(newDepth);
  }, []);

  return {
    info,
    evaluations: info?.evaluations || [],
    isReady,
    isAnalyzing: info?.state === "analyzing",
    analyze,
    stop,
    pause,
    resume,
    setDepth: setEngineDepth,
  };
}
