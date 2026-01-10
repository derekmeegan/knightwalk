/**
 * ETL Pipeline for Lichess Data
 *
 * Usage:
 *   npx tsx scripts/etl/import-lichess.ts <path-to-pgn-file> [--max-moves=15] [--min-elo=1800]
 *
 * Options:
 *   --max-moves=N    Only process first N moves of each game (default: 15)
 *   --min-elo=N      Only process games where both players have at least N elo (default: 0)
 *   --batch-size=N   Batch size for database inserts (default: 1000)
 *   --dry-run        Don't actually insert into database, just show stats
 *
 * This script:
 * 1. Streams PGN file (doesn't load all into memory)
 * 2. Parses each game
 * 3. Extracts positions and edges for first N moves
 * 4. Accumulates statistics (times played, wins/draws/losses)
 * 5. Batch inserts to Supabase
 */

import * as fs from "fs";
import * as readline from "readline";
import { createClient } from "@supabase/supabase-js";
import { Chess } from "chess.js";

// ============================================
// CONFIGURATION
// ============================================

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing Supabase environment variables in .env.local");
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// ZOBRIST HASHING (copied from app/lib/chess/zobrist.ts)
// ============================================

const PIECE_INDEX: Record<string, number> = {
  P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5,
  p: 6, n: 7, b: 8, r: 9, q: 10, k: 11,
};

let zobristTable: bigint[][] | null = null;
let zobristCastling: bigint[] | null = null;
let zobristEnPassant: bigint[] | null = null;
let zobristSideToMove: bigint | null = null;

function initZobristTable(): void {
  if (zobristTable !== null) return;

  let seed = BigInt("0x123456789ABCDEF0");

  function nextRandom(): bigint {
    seed ^= seed << BigInt(13);
    seed ^= seed >> BigInt(7);
    seed ^= seed << BigInt(17);
    return seed & BigInt("0xFFFFFFFFFFFFFFFF");
  }

  zobristTable = [];
  for (let piece = 0; piece < 12; piece++) {
    zobristTable[piece] = [];
    for (let square = 0; square < 64; square++) {
      zobristTable[piece][square] = nextRandom();
    }
  }

  zobristCastling = [nextRandom(), nextRandom(), nextRandom(), nextRandom()];

  zobristEnPassant = [];
  for (let file = 0; file < 8; file++) {
    zobristEnPassant[file] = nextRandom();
  }

  zobristSideToMove = nextRandom();
}

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

  const board: (string | null)[] = new Array(64).fill(null);
  let square = 56;

  for (const char of boardStr) {
    if (char === "/") {
      square -= 16;
    } else if (char >= "1" && char <= "8") {
      square += parseInt(char, 10);
    } else {
      board[square] = char;
      square++;
    }
  }

  return { board, sideToMove, castling, enPassant };
}

function computeZobristHash(fen: string): bigint {
  initZobristTable();

  const { board, sideToMove, castling, enPassant } = parseFenForZobrist(fen);
  let hash = BigInt(0);

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece !== null) {
      const pieceIdx = PIECE_INDEX[piece];
      hash ^= zobristTable![pieceIdx][sq];
    }
  }

  if (sideToMove === "b") {
    hash ^= zobristSideToMove!;
  }

  if (castling.includes("K")) hash ^= zobristCastling![0];
  if (castling.includes("Q")) hash ^= zobristCastling![1];
  if (castling.includes("k")) hash ^= zobristCastling![2];
  if (castling.includes("q")) hash ^= zobristCastling![3];

  if (enPassant !== "-") {
    const file = enPassant.charCodeAt(0) - "a".charCodeAt(0);
    hash ^= zobristEnPassant![file];
  }

  return hash;
}

function hashToPostgres(hash: bigint): string {
  const maxSigned = BigInt("0x7FFFFFFFFFFFFFFF");
  if (hash > maxSigned) {
    return (hash - BigInt("0x10000000000000000")).toString();
  }
  return hash.toString();
}

// ============================================
// TYPES
// ============================================

interface PositionStats {
  fen: string;
  zobristHash: string;
  totalGames: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  eloSum: number;
  eloCount: number;
}

interface EdgeStats {
  fromFen: string;
  toFen: string;
  moveSan: string;
  moveUci: string;
  timesPlayed: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
}

interface ParsedGame {
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: string;
  date?: string;
  event?: string;
  eco?: string;
  opening?: string;
  moves: string[];
}

// ============================================
// PGN PARSING
// ============================================

function parsePgnGame(pgnText: string): ParsedGame | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText);

    const header = chess.header();
    const moves = chess.history();

    return {
      white: header.White || "Unknown",
      black: header.Black || "Unknown",
      whiteElo: header.WhiteElo ? parseInt(header.WhiteElo, 10) : undefined,
      blackElo: header.BlackElo ? parseInt(header.BlackElo, 10) : undefined,
      result: header.Result || "*",
      date: header.Date ?? undefined,
      event: header.Event ?? undefined,
      eco: header.ECO ?? undefined,
      opening: header.Opening ?? undefined,
      moves,
    };
  } catch {
    return null;
  }
}

// ============================================
// STATISTICS ACCUMULATION
// ============================================

class StatsAccumulator {
  positions: Map<string, PositionStats> = new Map();
  edges: Map<string, EdgeStats> = new Map();
  gamesProcessed = 0;
  gamesSkipped = 0;

  processGame(game: ParsedGame, maxMoves: number): void {
    const chess = new Chess();
    const avgElo = game.whiteElo && game.blackElo
      ? Math.round((game.whiteElo + game.blackElo) / 2)
      : undefined;

    const resultDelta = {
      whiteWins: game.result === "1-0" ? 1 : 0,
      draws: game.result === "1/2-1/2" ? 1 : 0,
      blackWins: game.result === "0-1" ? 1 : 0,
    };

    // Process starting position
    let prevFen = chess.fen();
    this.addPosition(prevFen, resultDelta, avgElo);

    // Process each move up to maxMoves
    const movesToProcess = Math.min(game.moves.length, maxMoves);

    for (let i = 0; i < movesToProcess; i++) {
      const moveSan = game.moves[i];

      try {
        const moveObj = chess.move(moveSan);
        if (!moveObj) break;

        const newFen = chess.fen();
        const moveUci = moveObj.from + moveObj.to + (moveObj.promotion || "");

        // Add position
        this.addPosition(newFen, resultDelta, avgElo);

        // Add edge
        this.addEdge(prevFen, newFen, moveSan, moveUci, resultDelta);

        prevFen = newFen;
      } catch {
        break;
      }
    }

    this.gamesProcessed++;
  }

  private addPosition(
    fen: string,
    result: { whiteWins: number; draws: number; blackWins: number },
    avgElo?: number
  ): void {
    const existing = this.positions.get(fen);

    if (existing) {
      existing.totalGames++;
      existing.whiteWins += result.whiteWins;
      existing.draws += result.draws;
      existing.blackWins += result.blackWins;
      if (avgElo) {
        existing.eloSum += avgElo;
        existing.eloCount++;
      }
    } else {
      this.positions.set(fen, {
        fen,
        zobristHash: hashToPostgres(computeZobristHash(fen)),
        totalGames: 1,
        whiteWins: result.whiteWins,
        draws: result.draws,
        blackWins: result.blackWins,
        eloSum: avgElo || 0,
        eloCount: avgElo ? 1 : 0,
      });
    }
  }

  private addEdge(
    fromFen: string,
    toFen: string,
    moveSan: string,
    moveUci: string,
    result: { whiteWins: number; draws: number; blackWins: number }
  ): void {
    const key = `${fromFen}|${moveSan}`;
    const existing = this.edges.get(key);

    if (existing) {
      existing.timesPlayed++;
      existing.whiteWins += result.whiteWins;
      existing.draws += result.draws;
      existing.blackWins += result.blackWins;
    } else {
      this.edges.set(key, {
        fromFen,
        toFen,
        moveSan,
        moveUci,
        timesPlayed: 1,
        whiteWins: result.whiteWins,
        draws: result.draws,
        blackWins: result.blackWins,
      });
    }
  }

  getStats(): string {
    return `
Games processed: ${this.gamesProcessed}
Games skipped: ${this.gamesSkipped}
Unique positions: ${this.positions.size}
Unique edges: ${this.edges.size}
    `.trim();
  }
}

// ============================================
// DATABASE INSERTION
// ============================================

async function insertPositions(
  positions: PositionStats[],
  batchSize: number,
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, string>> {
  const fenToId = new Map<string, string>();

  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);

    const rows = batch.map((p) => ({
      fen: p.fen,
      zobrist_hash: parseInt(p.zobristHash, 10),
      total_games: p.totalGames,
      white_wins: p.whiteWins,
      draws: p.draws,
      black_wins: p.blackWins,
      avg_elo: p.eloCount > 0 ? Math.round(p.eloSum / p.eloCount) : null,
    }));

    const { data, error } = await supabase
      .from("positions")
      .upsert(rows, { onConflict: "fen", ignoreDuplicates: false })
      .select("id, fen");

    if (error) {
      console.error("Error inserting positions:", error);
      continue;
    }

    for (const row of data || []) {
      fenToId.set(row.fen, row.id);
    }

    console.log(`  Inserted positions ${i + 1} to ${Math.min(i + batchSize, positions.length)}`);
  }

  return fenToId;
}

async function insertEdges(
  edges: EdgeStats[],
  fenToId: Map<string, string>,
  batchSize: number,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  for (let i = 0; i < edges.length; i += batchSize) {
    const batch = edges.slice(i, i + batchSize);

    const rows = batch
      .map((e) => {
        const fromId = fenToId.get(e.fromFen);
        const toId = fenToId.get(e.toFen);

        if (!fromId || !toId) return null;

        return {
          from_position_id: fromId,
          to_position_id: toId,
          move_san: e.moveSan,
          move_uci: e.moveUci,
          times_played: e.timesPlayed,
          white_wins: e.whiteWins,
          draws: e.draws,
          black_wins: e.blackWins,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from("edges")
      .upsert(rows, { onConflict: "from_position_id,move_san", ignoreDuplicates: false });

    if (error) {
      console.error("Error inserting edges:", error);
      continue;
    }

    console.log(`  Inserted edges ${i + 1} to ${Math.min(i + batchSize, edges.length)}`);
  }
}

// ============================================
// PGN FILE STREAMING
// ============================================

async function* streamPgnGames(filePath: string): AsyncGenerator<string> {
  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentGame = "";
  let inGame = false;

  for await (const line of rl) {
    if (line.startsWith("[Event ")) {
      if (currentGame.trim()) {
        yield currentGame;
      }
      currentGame = line + "\n";
      inGame = true;
    } else if (inGame) {
      currentGame += line + "\n";
    }
  }

  if (currentGame.trim()) {
    yield currentGame;
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const filePath = args.find((a) => !a.startsWith("--"));
  const maxMoves = parseInt(args.find((a) => a.startsWith("--max-moves="))?.split("=")[1] || "15", 10);
  const minElo = parseInt(args.find((a) => a.startsWith("--min-elo="))?.split("=")[1] || "0", 10);
  const batchSize = parseInt(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] || "1000", 10);
  const dryRun = args.includes("--dry-run");

  if (!filePath) {
    console.log("Usage: npx tsx scripts/etl/import-lichess.ts <path-to-pgn-file> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --max-moves=N    Only process first N moves (default: 15)");
    console.log("  --min-elo=N      Minimum elo for both players (default: 0)");
    console.log("  --batch-size=N   Database batch size (default: 1000)");
    console.log("  --dry-run        Don't insert into database");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log("=== Lichess ETL Pipeline ===");
  console.log(`File: ${filePath}`);
  console.log(`Max moves per game: ${maxMoves}`);
  console.log(`Min elo: ${minElo}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  const accumulator = new StatsAccumulator();
  let gameCount = 0;

  console.log("Processing games...");

  for await (const pgnText of streamPgnGames(filePath)) {
    const game = parsePgnGame(pgnText);

    if (!game) {
      accumulator.gamesSkipped++;
      continue;
    }

    // Filter by elo
    if (minElo > 0) {
      if (!game.whiteElo || !game.blackElo || game.whiteElo < minElo || game.blackElo < minElo) {
        accumulator.gamesSkipped++;
        continue;
      }
    }

    accumulator.processGame(game, maxMoves);
    gameCount++;

    if (gameCount % 10000 === 0) {
      console.log(`  Processed ${gameCount} games...`);
    }
  }

  console.log("");
  console.log("=== Statistics ===");
  console.log(accumulator.getStats());
  console.log("");

  if (dryRun) {
    console.log("Dry run complete. No data inserted.");
    return;
  }

  console.log("=== Inserting into database ===");

  const supabase = getSupabaseClient();

  console.log("Inserting positions...");
  const positions = Array.from(accumulator.positions.values());
  const fenToId = await insertPositions(positions, batchSize, supabase);

  console.log("Inserting edges...");
  const edges = Array.from(accumulator.edges.values());
  await insertEdges(edges, fenToId, batchSize, supabase);

  console.log("");
  console.log("=== Complete ===");
}

main().catch(console.error);
