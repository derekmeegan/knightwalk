import { getEngine, destroyEngine } from "./engine";

/**
 * Focus Analysis Policy
 *
 * Controls when the engine runs to conserve battery:
 * - Only active in Analyze mode
 * - Pauses when user is panning the graph
 * - Stops when tab is hidden
 * - Throttled updates to reduce UI re-renders
 *
 * See plan.md "Bottleneck Mitigations" section for details.
 */

type Mode = "explore" | "analyze";

class FocusAnalysisPolicy {
  private currentMode: Mode = "explore";
  private currentFen: string | null = null;
  private isPanning = false;
  private panTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor() {
    // Listen for tab visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Called when the app mode changes
   */
  onModeChange(mode: Mode): void {
    this.currentMode = mode;

    const engine = getEngine();

    if (mode === "explore") {
      // In Explore mode, pause the engine
      engine.pause();
    } else if (mode === "analyze" && this.currentFen) {
      // In Analyze mode, resume analysis
      engine.resume(this.currentFen);
    }
  }

  /**
   * Called when the user selects a position to analyze
   */
  onPositionChange(fen: string): void {
    this.currentFen = fen;

    if (this.currentMode === "analyze") {
      const engine = getEngine();
      engine.analyze(fen);
    }
  }

  /**
   * Called when user starts panning the graph
   */
  onGraphPanStart(): void {
    this.isPanning = true;

    if (this.currentMode === "analyze") {
      const engine = getEngine();
      engine.pause();
    }
  }

  /**
   * Called when user stops panning the graph
   */
  onGraphPanEnd(): void {
    this.isPanning = false;

    // Debounce resume - wait 2 seconds after panning stops
    if (this.panTimeout) {
      clearTimeout(this.panTimeout);
      this.panTimeout = null;
    }

    this.panTimeout = setTimeout(() => {
      // Check if destroyed before resuming
      if (this.isDestroyed) return;
      if (this.currentMode === "analyze" && this.currentFen && !this.isPanning) {
        const engine = getEngine();
        engine.resume(this.currentFen);
      }
    }, 2000);
  }

  /**
   * Handle tab visibility changes
   */
  private handleVisibilityChange = (): void => {
    const engine = getEngine();

    if (document.hidden) {
      // Tab is hidden - stop engine completely
      engine.stop();
    } else {
      // Tab is visible again - don't auto-resume
      // Wait for user interaction
    }
  };

  /**
   * Clean up
   */
  destroy(): void {
    this.isDestroyed = true;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.panTimeout) {
      clearTimeout(this.panTimeout);
      this.panTimeout = null;
    }
    destroyEngine();
  }
}

// Singleton instance
let policyInstance: FocusAnalysisPolicy | null = null;

export function getFocusPolicy(): FocusAnalysisPolicy {
  if (!policyInstance) {
    policyInstance = new FocusAnalysisPolicy();
  }
  return policyInstance;
}
