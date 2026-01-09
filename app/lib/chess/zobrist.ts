/**
 * Zobrist Hashing for Chess Positions
 *
 * Zobrist hashing creates a unique 64-bit hash for each chess position.
 * It's the standard method used by chess engines for position lookup.
 *
 * The hash is computed by XORing random numbers for:
 * - Each piece on each square (12 pieces x 64 squares = 768 values)
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

  // Initialize piece-square table (12 pieces x 64 squares)
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
