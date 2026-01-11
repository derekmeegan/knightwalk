import type { EngineState, EngineEvaluation, EngineInfo } from "./types";
import { isValidFen } from "./game";

// ============================================
// STOCKFISH ENGINE WRAPPER
// ============================================

// Type for the lichess stockfish.wasm factory
interface StockfishInstance {
  addMessageListener: (callback: (line: string) => void) => void;
  postMessage: (command: string) => void;
}

declare global {
  interface Window {
    Stockfish?: () => Promise<StockfishInstance>;
  }
}

type EngineEventCallback = (info: EngineInfo) => void;
type BestMoveCallback = (move: string, ponder?: string) => void;

export class StockfishEngine {
  private engine: StockfishInstance | null = null;
  private state: EngineState = "idle";
  private currentDepth = 16;
  private maxDepth = 22;
  private multiPV = 3;
  private evaluations: EngineEvaluation[] = [];
  private onUpdate: EngineEventCallback | null = null;
  private onBestMove: BestMoveCallback | null = null;
  private lastUpdateTime = 0;
  private throttleMs = 100;  // Throttle UI updates
  private initPromise: Promise<boolean> | null = null;
  private currentFen: string | null = null;  // Track current position for score normalization

  /**
   * Initialize the Stockfish WASM engine
   * Uses the lichess stockfish.wasm factory function
   */
  async init(): Promise<boolean> {
    // Return existing initialization if in progress
    if (this.initPromise) return this.initPromise;
    if (this.engine) return true;

    this.state = "loading";
    this.notifyUpdate();

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    try {
      // Load stockfish.js script if not already loaded
      if (typeof window !== "undefined" && !window.Stockfish) {
        await this.loadScript("/stockfish/stockfish.js");
      }

      // Check if Stockfish factory is available
      if (typeof window === "undefined" || !window.Stockfish) {
        console.error("Stockfish factory not found");
        this.state = "error";
        this.notifyUpdate();
        return false;
      }

      // Create engine instance using the factory
      this.engine = await window.Stockfish();

      return new Promise((resolve) => {
        let uciOk = false;
        let initComplete = false;

        const messageListener = (line: string) => {
          // Handle init-specific messages only before init completes
          if (!initComplete) {
            if (line === "uciok") {
              uciOk = true;
              // Engine is ready, configure it
              this.sendCommand("setoption name Threads value 2");
              this.sendCommand("setoption name Hash value 64");
              this.sendCommand(`setoption name MultiPV value ${this.multiPV}`);
              this.sendCommand("isready");
              return;
            } else if (line === "readyok" && uciOk) {
              initComplete = true;
              this.state = "ready";
              this.notifyUpdate();
              resolve(true);
              return;
            }
          }

          // Always process analysis output (info, bestmove lines)
          this.handleEngineOutput(line);
        };

        this.engine!.addMessageListener(messageListener);

        // Start UCI protocol
        this.sendCommand("uci");

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.state === "loading" && !initComplete) {
            initComplete = true;
            console.error("Stockfish initialization timeout");
            this.state = "error";
            this.notifyUpdate();
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error("Failed to load Stockfish:", error);
      this.state = "error";
      this.notifyUpdate();
      return false;
    }
  }

  /**
   * Load a script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Analyze a position
   */
  analyze(fen: string, depth?: number): void {
    if (!this.engine || this.state === "loading" || this.state === "error") {
      console.warn("Engine not ready");
      return;
    }

    // Validate FEN before sending to engine
    if (!isValidFen(fen)) {
      console.warn("Invalid FEN, skipping analysis:", fen);
      return;
    }

    const targetDepth = depth ?? this.currentDepth;

    // Stop any ongoing analysis
    this.stop();

    // Store FEN for score normalization (UCI reports from side-to-move perspective)
    this.currentFen = fen;

    // Clear previous evaluations
    this.evaluations = [];

    // Set up new position and start analysis
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${targetDepth}`);
    this.state = "analyzing";
    this.notifyUpdate();
  }

  /**
   * Stop the current analysis
   */
  stop(): void {
    if (this.engine && this.state === "analyzing") {
      this.sendCommand("stop");
      this.state = "ready";
      this.notifyUpdate();
    }
  }

  /**
   * Pause analysis (for Focus Analysis policy)
   */
  pause(): void {
    this.stop();
    this.state = "paused";
    this.notifyUpdate();
  }

  /**
   * Resume analysis
   */
  resume(fen: string): void {
    if (this.state === "paused") {
      this.state = "ready";
      this.analyze(fen);
    }
  }

  /**
   * Set analysis depth
   */
  setDepth(depth: number): void {
    this.currentDepth = Math.min(Math.max(depth, 10), this.maxDepth);
  }

  /**
   * Set number of principal variations
   */
  setMultiPV(count: number): void {
    this.multiPV = Math.min(Math.max(count, 1), 5);
    if (this.engine) {
      this.sendCommand(`setoption name MultiPV value ${this.multiPV}`);
    }
  }

  /**
   * Get current engine info
   */
  getInfo(): EngineInfo {
    return {
      name: "Stockfish",
      depth: this.evaluations[0]?.depth || 0,
      maxDepth: this.currentDepth,
      multiPV: this.multiPV,
      state: this.state,
      evaluations: [...this.evaluations],
    };
  }

  /**
   * Set callback for engine updates
   */
  onEngineUpdate(callback: EngineEventCallback): void {
    this.onUpdate = callback;
  }

  /**
   * Set callback for best move
   */
  onEngineBestMove(callback: BestMoveCallback): void {
    this.onBestMove = callback;
  }

  /**
   * Destroy the engine
   */
  destroy(): void {
    if (this.engine) {
      this.sendCommand("quit");
      this.engine = null;
    }
    this.state = "idle";
    this.initPromise = null;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private sendCommand(cmd: string): void {
    if (this.engine) {
      this.engine.postMessage(cmd);
    }
  }

  private handleEngineOutput(line: string): void {
    // Parse "info" lines (analysis updates)
    if (line.startsWith("info") && line.includes("score")) {
      // Determine if black is to move (for score normalization)
      const isBlackToMove = this.currentFen ? this.currentFen.split(" ")[1] === "b" : false;
      const evaluation = this.parseInfoLine(line, isBlackToMove);
      if (evaluation) {
        this.updateEvaluation(evaluation);
      }
    }

    // Parse "bestmove" lines
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const bestMove = parts[1] ?? null;
      const ponderIdx = parts.indexOf("ponder");
      const ponderMove = ponderIdx !== -1 ? parts[ponderIdx + 1] : undefined;
      this.state = "ready";
      this.notifyUpdate();
      if (this.onBestMove && bestMove) {
        this.onBestMove(bestMove, ponderMove);
      }
    }
  }

  private parseInfoLine(line: string, isBlackToMove: boolean): EngineEvaluation | null {
    const parts = line.split(" ");

    // Must have depth and score
    const depthIdx = parts.indexOf("depth");
    const scoreIdx = parts.indexOf("score");
    const pvIdx = parts.indexOf("pv");
    const multipvIdx = parts.indexOf("multipv");

    if (depthIdx === -1 || scoreIdx === -1) return null;

    const depth = parseInt(parts[depthIdx + 1], 10);
    const scoreType = parts[scoreIdx + 1] as "cp" | "mate";
    let scoreValue = parseInt(parts[scoreIdx + 2], 10);

    // UCI reports scores from side-to-move perspective
    // Normalize to white's perspective by flipping when black to move
    if (isBlackToMove) {
      scoreValue = -scoreValue;
    }

    // Get PV (principal variation)
    const pv: string[] = [];
    if (pvIdx !== -1) {
      for (let i = pvIdx + 1; i < parts.length; i++) {
        // PV moves are in UCI format (e.g., "e2e4")
        if (parts[i].match(/^[a-h][1-8][a-h][1-8][qrbn]?$/)) {
          pv.push(parts[i]);
        } else {
          break;
        }
      }
    }

    // Get MultiPV index (1-based)
    const pvNumber = multipvIdx !== -1 ? parseInt(parts[multipvIdx + 1], 10) : 1;

    // Get additional info
    const nodesIdx = parts.indexOf("nodes");
    const npsIdx = parts.indexOf("nps");
    const timeIdx = parts.indexOf("time");

    // For mate scores, use large centipawn values instead of Infinity
    // to avoid breaking math operations. 50000cp = winning, -50000cp = losing
    // The actual mate-in count is preserved in mateIn field
    const MATE_SCORE = 50000;
    const normalizedScore = scoreType === "mate"
      ? (scoreValue > 0 ? MATE_SCORE : -MATE_SCORE)
      : scoreValue;

    // mateIn should be absolute (number of moves), but preserve sign for display
    const mateIn = scoreType === "mate" ? scoreValue : undefined;

    return {
      depth,
      score: normalizedScore,
      scoreType,
      mateIn,
      pv,
      nodes: nodesIdx !== -1 ? parseInt(parts[nodesIdx + 1], 10) : undefined,
      nps: npsIdx !== -1 ? parseInt(parts[npsIdx + 1], 10) : undefined,
      time: timeIdx !== -1 ? parseInt(parts[timeIdx + 1], 10) : undefined,
    };
  }

  private updateEvaluation(evaluation: EngineEvaluation): void {
    // Find existing evaluation for this PV or add new one
    const existingIdx = this.evaluations.findIndex((e) => e.depth === evaluation.depth);

    if (existingIdx !== -1) {
      this.evaluations[existingIdx] = evaluation;
    } else {
      this.evaluations.push(evaluation);
      // Keep only most recent evaluations, sorted by depth
      this.evaluations.sort((a, b) => b.depth - a.depth);
      if (this.evaluations.length > this.multiPV) {
        this.evaluations = this.evaluations.slice(0, this.multiPV);
      }
    }

    // Throttle UI updates
    const now = Date.now();
    if (now - this.lastUpdateTime >= this.throttleMs) {
      this.lastUpdateTime = now;
      this.notifyUpdate();
    }
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getInfo());
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let engineInstance: StockfishEngine | null = null;

/**
 * Get the global Stockfish engine instance
 */
export function getEngine(): StockfishEngine {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

/**
 * Destroy the global engine instance
 */
export function destroyEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

/**
 * Check if SharedArrayBuffer is available (required for stockfish.wasm)
 * Returns false if COOP/COEP headers are not set correctly
 */
export function isSharedArrayBufferAvailable(): boolean {
  try {
    return typeof SharedArrayBuffer !== "undefined";
  } catch {
    return false;
  }
}
