# Agent 2: Chess Logic Plan

## Project Context

You are building the chess logic layer for **Knightwalker**, a chess opening visualization app. The app has two modes:
- **Explore Mode**: Graph-based visualization of opening lines
- **Analyze Mode**: Chess board with Stockfish engine analysis

**Your job**: Provide all chess-related utilities - move validation, FEN handling, Zobrist hashing, and Stockfish integration. You are the "chess brain" that other agents depend on.

**Main plan reference**: `/Users/d/Desktop/me/knightwalk/plan.md` (see "Stockfish Integration", "Bottleneck Mitigations" sections)

---

## Important: Existing Project Context

**You are working in an existing Next.js 16 project with Tailwind v4 already configured.**

- Do NOT run `create-next-app` or initialize a new project
- The project uses the App Router (all routes in `/app/`)
- Dependencies are already partially installed by the Foundation agent
- shadcn/ui components are available in `app/components/ui/`

---

## Directory Structure Convention

This project uses **feature-based colocation** with underscore prefixes for non-routable directories.

```
/app/
├── /explore/                     # Explore feature
│   ├── page.tsx
│   ├── /_components/            # Explore-specific components (NOT routable)
│   ├── /_hooks/                 # Explore-specific hooks (NOT routable)
│   └── /_lib/                   # Explore-specific utils (NOT routable)
│
├── /analyze/                     # Analyze feature
│   ├── page.tsx
│   ├── /_components/
│   ├── /_hooks/
│   └── /_lib/
│
├── /components/                  # ONLY truly shared components
│   └── /ui/                     # shadcn primitives
│
├── /lib/                         # Global utilities
│   ├── cn.ts
│   ├── /chess/                  # YOUR domain - all chess logic goes here
│   └── /db/                     # Agent 1's domain
│
├── /hooks/                       # ONLY global hooks (used by 2+ features)
│
└── /stores/
    └── app-store.ts
```

**Key Rules**:
- Underscore prefix (`_`) makes directories non-routable
- Your code goes in `app/lib/chess/`
- Shared hooks go in `app/hooks/`

---

## Your Role

You are **Agent 2: Chess Logic**. You handle:
- chess.js wrapper for move validation
- FEN parsing and manipulation
- Zobrist hashing implementation
- Stockfish WASM integration
- Engine output parsing
- Focus Analysis policy (battery optimization)

---

## Boundaries

### You ARE responsible for:
- `app/lib/chess/` - ALL files in this directory
- `app/lib/chess/types.ts` - Chess type definitions
- `app/hooks/use-engine.ts` - Stockfish hook (shared)
- Engine state management

### You are NOT responsible for:
- Database queries → Agent 1
- Graph visualization → Agent 3
- Board UI components → Agent 4
- Move list UI → Agent 4

### Sensitive Overlap Areas:

| Area | Your Role | Other Agent |
|------|-----------|-------------|
| `app/lib/chess/types.ts` | You DEFINE these types | All agents USE them |
| `app/stores/app-store.ts` | Add engine state if needed | Foundation created skeleton |
| Zobrist hashing | You IMPLEMENT | Agent 1 CALLS for DB lookups |
| Move validation | You PROVIDE | Agent 4 USES for board interaction |
| Engine evaluation | You PROVIDE | Agent 4 DISPLAYS in UI |

### If you need to:
- Modify `app/stores/app-store.ts` → Add your state, don't remove existing
- Change type definitions in `app/lib/chess/types.ts` → You own this, but notify human if major changes
- Add new dependencies → **ASK HUMAN FIRST**
- Change Stockfish WASM loading approach → **ASK HUMAN FIRST**

---

## Detailed Tasks

### 1. Define Chess Types

**File: `app/lib/chess/types.ts`**

```typescript
// ============================================
// CORE CHESS TYPES
// ============================================

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square =
  | "a1" | "b1" | "c1" | "d1" | "e1" | "f1" | "g1" | "h1"
  | "a2" | "b2" | "c2" | "d2" | "e2" | "f2" | "g2" | "h2"
  | "a3" | "b3" | "c3" | "d3" | "e3" | "f3" | "g3" | "h3"
  | "a4" | "b4" | "c4" | "d4" | "e4" | "f4" | "g4" | "h4"
  | "a5" | "b5" | "c5" | "d5" | "e5" | "f5" | "g5" | "h5"
  | "a6" | "b6" | "c6" | "d6" | "e6" | "f6" | "g6" | "h6"
  | "a7" | "b7" | "c7" | "d7" | "e7" | "f7" | "g7" | "h7"
  | "a8" | "b8" | "c8" | "d8" | "e8" | "f8" | "g8" | "h8";

export interface Move {
  from: Square;
  to: Square;
  san: string;         // Standard Algebraic Notation (e.g., "Nf3")
  uci: string;         // UCI format (e.g., "g1f3")
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  flags: string;       // chess.js flags
}

export interface Position {
  fen: string;
  zobristHash: bigint;
  turn: PieceColor;
  moveNumber: number;
  halfmoveClock: number;
  castling: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
  enPassant: Square | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

// ============================================
// GAME TYPES
// ============================================

export interface GameInfo {
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  date?: string;
  event?: string;
  site?: string;
  eco?: string;
  opening?: string;
}

export interface GameState {
  info: GameInfo;
  moves: Move[];
  positions: Position[];  // Position after each move
  currentMoveIndex: number;
}

// ============================================
// ENGINE TYPES
// ============================================

export type EngineState = "idle" | "loading" | "ready" | "analyzing" | "paused" | "error";

export interface EngineEvaluation {
  depth: number;
  score: number;          // In centipawns, from white's perspective
  scoreType: "cp" | "mate";
  mateIn?: number;        // If scoreType is "mate"
  pv: string[];           // Principal variation (best line)
  nodes?: number;
  nps?: number;           // Nodes per second
  time?: number;          // Time spent in ms
}

export interface EngineInfo {
  name: string;
  depth: number;
  maxDepth: number;
  multiPV: number;
  state: EngineState;
  evaluations: EngineEvaluation[];  // One per PV line
}

// ============================================
// OPENING TYPES
// ============================================

export interface Opening {
  eco: string;           // ECO code (e.g., "B90")
  name: string;          // Opening name
  variation?: string;    // Variation name
  moves: string[];       // Moves to reach this opening
}
```

### 2. Create chess.js Wrapper

**File: `app/lib/chess/game.ts`**

```typescript
import { Chess, type Move as ChessJsMove, type Square as ChessJsSquare } from "chess.js";
import type { Move, Position, Square, PieceColor, GameState, GameInfo } from "./types";
import { computeZobristHash } from "./zobrist";

// ============================================
// GAME CLASS WRAPPER
// ============================================

export class ChessGame {
  private chess: Chess;
  private positionHistory: Position[] = [];
  private moveHistory: Move[] = [];

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.positionHistory.push(this.getCurrentPosition());
  }

  /**
   * Get current position
   */
  getCurrentPosition(): Position {
    const fen = this.chess.fen();
    return {
      fen,
      zobristHash: computeZobristHash(fen),
      turn: this.chess.turn() as PieceColor,
      moveNumber: Math.floor(this.chess.moveNumber()),
      halfmoveClock: this.getHalfmoveClock(),
      castling: this.getCastlingRights(),
      enPassant: this.getEnPassantSquare(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
    };
  }

  /**
   * Get FEN string
   */
  fen(): string {
    return this.chess.fen();
  }

  /**
   * Get whose turn it is
   */
  turn(): PieceColor {
    return this.chess.turn() as PieceColor;
  }

  /**
   * Make a move (SAN or UCI format)
   * Returns the move if valid, null if invalid
   */
  move(moveInput: string | { from: string; to: string; promotion?: string }): Move | null {
    try {
      const result = this.chess.move(moveInput);
      if (!result) return null;

      const move = this.convertMove(result);
      this.moveHistory.push(move);
      this.positionHistory.push(this.getCurrentPosition());

      return move;
    } catch {
      return null;
    }
  }

  /**
   * Undo the last move
   */
  undo(): Move | null {
    const result = this.chess.undo();
    if (!result) return null;

    this.moveHistory.pop();
    this.positionHistory.pop();

    return this.convertMove(result);
  }

  /**
   * Get all legal moves from current position
   */
  getLegalMoves(): Move[] {
    return this.chess.moves({ verbose: true }).map((m) => this.convertMove(m));
  }

  /**
   * Get legal moves for a specific square
   */
  getLegalMovesForSquare(square: Square): Move[] {
    return this.chess
      .moves({ square: square as ChessJsSquare, verbose: true })
      .map((m) => this.convertMove(m));
  }

  /**
   * Check if a move is legal
   */
  isLegalMove(from: Square, to: Square): boolean {
    const moves = this.getLegalMovesForSquare(from);
    return moves.some((m) => m.to === to);
  }

  /**
   * Load a position from FEN
   */
  load(fen: string): boolean {
    try {
      this.chess.load(fen);
      this.moveHistory = [];
      this.positionHistory = [this.getCurrentPosition()];
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset to starting position
   */
  reset(): void {
    this.chess.reset();
    this.moveHistory = [];
    this.positionHistory = [this.getCurrentPosition()];
  }

  /**
   * Get the piece at a square
   */
  get(square: Square) {
    return this.chess.get(square as ChessJsSquare);
  }

  /**
   * Get move history
   */
  getMoveHistory(): Move[] {
    return [...this.moveHistory];
  }

  /**
   * Get position history
   */
  getPositionHistory(): Position[] {
    return [...this.positionHistory];
  }

  /**
   * Get board as 2D array
   */
  board() {
    return this.chess.board();
  }

  /**
   * Check game state
   */
  isCheck(): boolean { return this.chess.isCheck(); }
  isCheckmate(): boolean { return this.chess.isCheckmate(); }
  isStalemate(): boolean { return this.chess.isStalemate(); }
  isDraw(): boolean { return this.chess.isDraw(); }
  isGameOver(): boolean { return this.chess.isGameOver(); }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private convertMove(m: ChessJsMove): Move {
    return {
      from: m.from as Square,
      to: m.to as Square,
      san: m.san,
      uci: m.from + m.to + (m.promotion || ""),
      piece: m.piece,
      captured: m.captured,
      promotion: m.promotion,
      flags: m.flags,
    };
  }

  private getHalfmoveClock(): number {
    const parts = this.chess.fen().split(" ");
    return parseInt(parts[4] || "0", 10);
  }

  private getCastlingRights() {
    const parts = this.chess.fen().split(" ");
    const castling = parts[2] || "-";
    return {
      whiteKingside: castling.includes("K"),
      whiteQueenside: castling.includes("Q"),
      blackKingside: castling.includes("k"),
      blackQueenside: castling.includes("q"),
    };
  }

  private getEnPassantSquare(): Square | null {
    const parts = this.chess.fen().split(" ");
    const ep = parts[3];
    return ep === "-" ? null : (ep as Square);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate a FEN string
 */
export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a PGN string into game info and moves
 */
export function parsePGN(pgn: string): { info: GameInfo; moves: string[] } | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const header = chess.header();
    const moves = chess.history();

    return {
      info: {
        white: header.White || "Unknown",
        black: header.Black || "Unknown",
        whiteElo: header.WhiteElo ? parseInt(header.WhiteElo, 10) : undefined,
        blackElo: header.BlackElo ? parseInt(header.BlackElo, 10) : undefined,
        result: (header.Result as GameInfo["result"]) || "*",
        date: header.Date,
        event: header.Event,
        site: header.Site,
        eco: header.ECO,
        opening: header.Opening,
      },
      moves,
    };
  } catch {
    return null;
  }
}

/**
 * Replay moves from starting position, returning all positions
 * Used by ETL pipeline to extract positions from games
 */
export function replayMoves(moves: string[]): Position[] {
  const game = new ChessGame();
  const positions: Position[] = [game.getCurrentPosition()];

  for (const moveStr of moves) {
    const move = game.move(moveStr);
    if (!move) break;  // Invalid move, stop replay
    positions.push(game.getCurrentPosition());
  }

  return positions;
}

/**
 * Get the starting FEN
 */
export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Create a new game instance
 */
export function createGame(fen?: string): ChessGame {
  return new ChessGame(fen);
}
```

### 3. Implement Zobrist Hashing

**File: `app/lib/chess/zobrist.ts`**

```typescript
/**
 * Zobrist Hashing for Chess Positions
 *
 * Zobrist hashing creates a unique 64-bit hash for each chess position.
 * It's the standard method used by chess engines for position lookup.
 *
 * The hash is computed by XORing random numbers for:
 * - Each piece on each square (12 pieces × 64 squares = 768 values)
 * - Side to move (1 value)
 * - Castling rights (4 values)
 * - En passant file (8 values)
 *
 * Benefits:
 * - Incremental update: XOR is reversible, so we can update the hash
 *   when making/unmaking moves instead of recomputing from scratch
 * - Fast comparison: 64-bit integer comparison vs string comparison
 * - Low collision probability: ~1 in 10^18
 */

// Piece indices for the hash table
const PIECE_INDEX: Record<string, number> = {
  P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5,   // White pieces
  p: 6, n: 7, b: 8, r: 9, q: 10, k: 11, // Black pieces
};

// Pre-computed random numbers for hashing
// In production, these should be generated once and stored
// Using BigInt for 64-bit precision
let zobristTable: bigint[][] | null = null;
let zobristCastling: bigint[] | null = null;
let zobristEnPassant: bigint[] | null = null;
let zobristSideToMove: bigint | null = null;

/**
 * Initialize the Zobrist hash table with random 64-bit values
 * Uses a seeded PRNG for reproducibility
 */
function initZobristTable(): void {
  if (zobristTable !== null) return;  // Already initialized

  // Simple seeded PRNG (xorshift64)
  // Using a fixed seed for reproducibility across all clients
  let seed = BigInt("0x123456789ABCDEF0");

  function nextRandom(): bigint {
    seed ^= seed << BigInt(13);
    seed ^= seed >> BigInt(7);
    seed ^= seed << BigInt(17);
    return seed & BigInt("0xFFFFFFFFFFFFFFFF");  // Mask to 64 bits
  }

  // Initialize piece-square table (12 pieces × 64 squares)
  zobristTable = [];
  for (let piece = 0; piece < 12; piece++) {
    zobristTable[piece] = [];
    for (let square = 0; square < 64; square++) {
      zobristTable[piece][square] = nextRandom();
    }
  }

  // Castling rights (4 values: KQkq)
  zobristCastling = [nextRandom(), nextRandom(), nextRandom(), nextRandom()];

  // En passant file (8 values: a-h)
  zobristEnPassant = [];
  for (let file = 0; file < 8; file++) {
    zobristEnPassant[file] = nextRandom();
  }

  // Side to move
  zobristSideToMove = nextRandom();
}

/**
 * Convert a square string (e.g., "e4") to index (0-63)
 */
function squareToIndex(square: string): number {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);  // 0-7
  const rank = parseInt(square[1], 10) - 1;               // 0-7
  return rank * 8 + file;
}

/**
 * Parse FEN string into board state
 */
function parseFenForZobrist(fen: string): {
  board: (string | null)[];
  sideToMove: "w" | "b";
  castling: string;
  enPassant: string;
} {
  const parts = fen.split(" ");
  const boardStr = parts[0];
  const sideToMove = parts[1] as "w" | "b";
  const castling = parts[2];
  const enPassant = parts[3];

  // Parse board into 64-element array
  const board: (string | null)[] = new Array(64).fill(null);
  let square = 56;  // Start at a8

  for (const char of boardStr) {
    if (char === "/") {
      square -= 16;  // Move to next rank
    } else if (char >= "1" && char <= "8") {
      square += parseInt(char, 10);  // Skip empty squares
    } else {
      board[square] = char;
      square++;
    }
  }

  return { board, sideToMove, castling, enPassant };
}

/**
 * Compute Zobrist hash for a FEN string
 */
export function computeZobristHash(fen: string): bigint {
  initZobristTable();

  const { board, sideToMove, castling, enPassant } = parseFenForZobrist(fen);
  let hash = BigInt(0);

  // Hash pieces on squares
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece !== null) {
      const pieceIdx = PIECE_INDEX[piece];
      hash ^= zobristTable![pieceIdx][sq];
    }
  }

  // Hash side to move (only if black to move)
  if (sideToMove === "b") {
    hash ^= zobristSideToMove!;
  }

  // Hash castling rights
  if (castling.includes("K")) hash ^= zobristCastling![0];
  if (castling.includes("Q")) hash ^= zobristCastling![1];
  if (castling.includes("k")) hash ^= zobristCastling![2];
  if (castling.includes("q")) hash ^= zobristCastling![3];

  // Hash en passant file
  if (enPassant !== "-") {
    const file = enPassant.charCodeAt(0) - "a".charCodeAt(0);
    hash ^= zobristEnPassant![file];
  }

  return hash;
}

/**
 * Convert BigInt hash to a string that can be stored in PostgreSQL
 * PostgreSQL BIGINT is signed 64-bit, so we need to handle this
 */
export function hashToPostgres(hash: bigint): string {
  // Convert to signed 64-bit for PostgreSQL compatibility
  const maxSigned = BigInt("0x7FFFFFFFFFFFFFFF");
  if (hash > maxSigned) {
    // Convert to negative number for PostgreSQL
    return (hash - BigInt("0x10000000000000000")).toString();
  }
  return hash.toString();
}

/**
 * Convert PostgreSQL BIGINT back to unsigned BigInt
 */
export function postgresqlToHash(value: number | string): bigint {
  const n = BigInt(value);
  if (n < 0) {
    return n + BigInt("0x10000000000000000");
  }
  return n;
}
```

### 4. Implement Stockfish Integration

**File: `app/lib/chess/engine.ts`**

```typescript
import type { EngineState, EngineEvaluation, EngineInfo } from "./types";

// ============================================
// STOCKFISH ENGINE WRAPPER
// ============================================

type EngineEventCallback = (info: EngineInfo) => void;
type BestMoveCallback = (move: string, ponder?: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private state: EngineState = "idle";
  private currentDepth = 16;
  private maxDepth = 22;
  private multiPV = 3;
  private evaluations: EngineEvaluation[] = [];
  private onUpdate: EngineEventCallback | null = null;
  private onBestMove: BestMoveCallback | null = null;
  private lastUpdateTime = 0;
  private throttleMs = 100;  // Throttle UI updates

  /**
   * Initialize the Stockfish WASM engine
   */
  async init(): Promise<boolean> {
    if (this.worker) return true;

    this.state = "loading";
    this.notifyUpdate();

    try {
      // Load Stockfish as a Web Worker
      // Using the stockfish.js WASM build
      this.worker = new Worker("/stockfish/stockfish.js");

      return new Promise((resolve) => {
        this.worker!.onmessage = (e) => {
          const line = e.data as string;

          if (line === "uciok") {
            // Engine is ready, configure it
            this.sendCommand("setoption name Threads value 2");
            this.sendCommand("setoption name Hash value 64");
            this.sendCommand(`setoption name MultiPV value ${this.multiPV}`);
            this.sendCommand("isready");
          } else if (line === "readyok") {
            this.state = "ready";
            this.notifyUpdate();
            resolve(true);
          } else {
            this.handleEngineOutput(line);
          }
        };

        this.worker!.onerror = (e) => {
          console.error("Stockfish error:", e);
          this.state = "error";
          this.notifyUpdate();
          resolve(false);
        };

        // Start UCI protocol
        this.sendCommand("uci");
      });
    } catch (error) {
      console.error("Failed to load Stockfish:", error);
      this.state = "error";
      this.notifyUpdate();
      return false;
    }
  }

  /**
   * Analyze a position
   */
  analyze(fen: string, depth?: number): void {
    if (!this.worker || this.state === "loading" || this.state === "error") {
      console.warn("Engine not ready");
      return;
    }

    const targetDepth = depth ?? this.currentDepth;

    // Stop any ongoing analysis
    this.stop();

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
    if (this.worker && this.state === "analyzing") {
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
    if (this.worker) {
      this.sendCommand(`setoption name MultiPV value ${this.multiPV}`);
    }
  }

  /**
   * Get current engine info
   */
  getInfo(): EngineInfo {
    return {
      name: "Stockfish 16",
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
    if (this.worker) {
      this.sendCommand("quit");
      this.worker.terminate();
      this.worker = null;
    }
    this.state = "idle";
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private sendCommand(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private handleEngineOutput(line: string): void {
    // Parse "info" lines (analysis updates)
    if (line.startsWith("info") && line.includes("score")) {
      const evaluation = this.parseInfoLine(line);
      if (evaluation) {
        this.updateEvaluation(evaluation);
      }
    }

    // Parse "bestmove" lines
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const bestMove = parts[1];
      const ponderMove = parts[3];  // After "ponder" keyword
      this.state = "ready";
      this.notifyUpdate();
      if (this.onBestMove) {
        this.onBestMove(bestMove, ponderMove);
      }
    }
  }

  private parseInfoLine(line: string): EngineEvaluation | null {
    const parts = line.split(" ");

    // Must have depth and score
    const depthIdx = parts.indexOf("depth");
    const scoreIdx = parts.indexOf("score");
    const pvIdx = parts.indexOf("pv");
    const multipvIdx = parts.indexOf("multipv");

    if (depthIdx === -1 || scoreIdx === -1) return null;

    const depth = parseInt(parts[depthIdx + 1], 10);
    const scoreType = parts[scoreIdx + 1] as "cp" | "mate";
    const scoreValue = parseInt(parts[scoreIdx + 2], 10);

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

    return {
      depth,
      score: scoreType === "mate" ? (scoreValue > 0 ? Infinity : -Infinity) : scoreValue,
      scoreType,
      mateIn: scoreType === "mate" ? scoreValue : undefined,
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
```

### 5. Implement Focus Analysis Policy

**File: `app/lib/chess/focus-analysis.ts`**

```typescript
import { getEngine, destroyEngine } from "./engine";
import type { EngineState } from "./types";

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
  private panTimeout: NodeJS.Timeout | null = null;

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
    }

    this.panTimeout = setTimeout(() => {
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
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.panTimeout) {
      clearTimeout(this.panTimeout);
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
```

### 6. Create Engine Hook

**File: `app/hooks/use-engine.ts`** (shared hook - used by multiple features)

```typescript
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

    engine.init().then((success) => {
      setIsReady(success);
      if (success) {
        engine.setDepth(depth);
      }
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

    policy.onPositionChange(fen);

    if (engine.getInfo().state !== "paused") {
      engine.analyze(fen);
    }
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
```

### 7. Create Index Export

**File: `app/lib/chess/index.ts`**

```typescript
// Game logic
export { ChessGame, createGame, isValidFen, parsePGN, replayMoves, STARTING_FEN } from "./game";

// Zobrist hashing
export { computeZobristHash, hashToPostgres, postgresqlToHash } from "./zobrist";

// Engine
export { StockfishEngine, getEngine, destroyEngine } from "./engine";

// Focus Analysis Policy
export { getFocusPolicy } from "./focus-analysis";

// Re-export types
export type {
  Move,
  Position,
  Square,
  PieceType,
  PieceColor,
  GameInfo,
  GameState,
  EngineState,
  EngineEvaluation,
  EngineInfo,
  Opening,
} from "./types";
```

### 8. Set Up Stockfish WASM Files

**IMPORTANT**: Stockfish WASM files need to be placed in the public directory.

Create directory and add placeholder:

**File: `public/stockfish/.gitkeep`**

You'll need to download Stockfish WASM files:

1. Download from: https://github.com/nichlasacc/stockfish.wasm
2. Place `stockfish.js` and `stockfish.wasm` in `public/stockfish/`

Or use a CDN version by modifying the Worker URL in `engine.ts`.

---

## Verification Checklist

Before marking complete, verify:

- [ ] `app/lib/chess/types.ts` - All types defined
- [ ] `app/lib/chess/game.ts` - ChessGame class working
- [ ] `app/lib/chess/zobrist.ts` - Zobrist hashing working
- [ ] `app/lib/chess/engine.ts` - Stockfish wrapper working
- [ ] `app/lib/chess/focus-analysis.ts` - Policy implemented
- [ ] `app/hooks/use-engine.ts` - Hook working
- [ ] `public/stockfish/` - WASM files present (or CDN configured)
- [ ] `npm run dev` works without errors

### Test Commands:

```typescript
// Test in browser console or a test file:

// Test chess.js wrapper
import { createGame } from "@/app/lib/chess";
const game = createGame();
game.move("e4");
console.log(game.fen());  // Should show position after 1.e4

// Test Zobrist hashing
import { computeZobristHash } from "@/app/lib/chess";
const hash = computeZobristHash("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
console.log(hash);  // Should be a BigInt

// Test engine (requires WASM files)
import { getEngine } from "@/app/lib/chess";
const engine = getEngine();
await engine.init();
engine.onEngineUpdate(info => console.log(info));
engine.analyze("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
```

---

## Notes for Other Agents

### For Agent 1 (Data):
Use Zobrist hashing for position lookups:
```typescript
import { computeZobristHash, hashToPostgres } from "@/app/lib/chess";
const hash = computeZobristHash(fen);
const dbValue = hashToPostgres(hash);
```

### For Agent 3 (Explore):
You likely won't need chess logic directly - you display positions from the database.

### For Agent 4 (Analyze):
Use these for board interaction:
```typescript
import { createGame } from "@/app/lib/chess";
import { useEngine } from "@/app/hooks/use-engine";

// For move validation
const game = createGame(currentFen);
const legalMoves = game.getLegalMovesForSquare("e2");

// For engine analysis
const { info, analyze, stop } = useEngine();
analyze(currentFen);
```

---

## Import Path Convention

This project uses `@/` as an alias for the project root. All imports should use:
- `@/app/lib/chess/...` for chess utilities
- `@/app/hooks/...` for shared hooks
- `@/app/stores/...` for Zustand stores
- `@/app/components/...` for shared components

Stockfish WASM setup may require additional attention if there are loading issues.