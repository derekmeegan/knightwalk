// Chess game wrapper using chess.js
// This provides a unified interface for chess operations

import { Chess, type Square as ChessJsSquare, type Move as ChessJsMove } from "chess.js";
import { STARTING_FEN, type Move, type Square, type PieceType, type PieceColor, type Position, type GameInfo } from "./types";
import { computeZobristHash } from "./zobrist";

export class ChessGame {
  private chess: Chess;
  private positionHistory: Position[] = [];
  private moveHistory: Move[] = [];

  constructor(fen: string = STARTING_FEN) {
    this.chess = new Chess(fen);
    this.positionHistory.push(this.getCurrentPosition());
  }

  // Get current FEN
  fen(): string {
    return this.chess.fen();
  }

  // Get current turn
  turn(): PieceColor {
    return this.chess.turn() as PieceColor;
  }

  // Get piece at square
  get(square: Square) {
    return this.chess.get(square as ChessJsSquare);
  }

  /**
   * Get current position with all metadata
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

  // Make a move
  move(moveInput: string | { from: string; to: string; promotion?: string }): Move | null {
    try {
      let result: ChessJsMove;

      if (typeof moveInput === "string") {
        result = this.chess.move(moveInput);
      } else {
        result = this.chess.move({
          from: moveInput.from as ChessJsSquare,
          to: moveInput.to as ChessJsSquare,
          promotion: moveInput.promotion,
        });
      }

      const move = this.convertMove(result);
      this.moveHistory.push(move);
      this.positionHistory.push(this.getCurrentPosition());

      return move;
    } catch {
      return null;
    }
  }

  // Get legal moves for a square
  getLegalMovesForSquare(square: Square): Move[] {
    const moves = this.chess.moves({ square: square as ChessJsSquare, verbose: true });
    return moves.map((m) => this.convertMove(m));
  }

  // Get all legal moves
  getLegalMoves(): Move[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.map((m) => this.convertMove(m));
  }

  /**
   * Check if a move is legal
   */
  isLegalMove(from: Square, to: Square): boolean {
    const moves = this.getLegalMovesForSquare(from);
    return moves.some((m) => m.to === to);
  }

  // Check game state
  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  // Undo last move
  undo(): Move | null {
    const result = this.chess.undo();
    if (!result) return null;

    this.moveHistory.pop();
    this.positionHistory.pop();

    return this.convertMove(result);
  }

  // Reset to starting position
  reset(): void {
    this.chess.reset();
    this.moveHistory = [];
    this.positionHistory = [this.getCurrentPosition()];
  }

  // Load a FEN position
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

  // Get board representation
  board() {
    return this.chess.board();
  }

  // Get PGN
  pgn(): string {
    return this.chess.pgn();
  }

  // Load PGN
  loadPgn(pgn: string): boolean {
    try {
      this.chess.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  // Get move history (SAN strings)
  history(): string[] {
    return this.chess.history();
  }

  // Get verbose move history
  historyVerbose(): Move[] {
    const history = this.chess.history({ verbose: true });
    return history.map((m) => this.convertMove(m));
  }

  /**
   * Get move history as Move objects
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

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private convertMove(m: ChessJsMove): Move {
    return {
      from: m.from as Square,
      to: m.to as Square,
      san: m.san,
      uci: m.from + m.to + (m.promotion || ""),
      piece: m.piece as PieceType,
      captured: m.captured as PieceType | undefined,
      promotion: m.promotion as PieceType | undefined,
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
 * Factory function to create a new game
 */
export function createGame(fen?: string): ChessGame {
  return new ChessGame(fen);
}

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
        date: header.Date ?? undefined,
        event: header.Event ?? undefined,
        site: header.Site ?? undefined,
        eco: header.ECO ?? undefined,
        opening: header.Opening ?? undefined,
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
