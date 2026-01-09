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

// ============================================
// CONSTANTS
// ============================================

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
