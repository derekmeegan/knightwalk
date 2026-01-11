import { supabase } from "./supabase";
import type { Position, Edge } from "./database.types";

export interface PositionWithEdges {
  position: Position;
  outgoingEdges: Edge[];
  incomingEdgeCount: number;
}

/**
 * Get the starting position (root of the graph)
 */
export async function getStartingPosition(): Promise<Position | null> {
  if (!supabase) return null;

  const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("fen", startingFen)
    .single();

  if (error) {
    // PGRST116 = "No rows found" - this is expected when database is empty
    if (error.code !== "PGRST116") {
      console.error("Error fetching starting position:", error.message, error.code);
    }
    return null;
  }

  return data;
}

/**
 * Get a position by ID with its outgoing edges
 */
export async function getPositionWithEdges(positionId: string): Promise<PositionWithEdges | null> {
  if (!supabase) return null;

  // Get position
  const { data: position, error: posError } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .single();

  if (posError || !position) {
    console.error("Error fetching position:", posError);
    return null;
  }

  // Get outgoing edges
  const { data: edges, error: edgeError } = await supabase
    .from("edges")
    .select("*")
    .eq("from_position_id", positionId)
    .order("times_played", { ascending: false });

  if (edgeError) {
    console.error("Error fetching edges:", edgeError);
    return null;
  }

  // Count incoming edges (for transposition indicator)
  const { count } = await supabase
    .from("edges")
    .select("*", { count: "exact", head: true })
    .eq("to_position_id", positionId);

  return {
    position,
    outgoingEdges: edges || [],
    incomingEdgeCount: count || 0,
  };
}

/**
 * Get a position by FEN string
 */
export async function getPositionByFen(fen: string): Promise<Position | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("fen", fen)
    .single();

  if (error) {
    console.error("Error fetching position by FEN:", error);
    return null;
  }

  return data;
}

/**
 * Get a position by Zobrist hash (faster lookup)
 * Falls back to FEN check for collision safety
 */
export async function getPositionByZobrist(hash: bigint, fen: string): Promise<Position | null> {
  if (!supabase) return null;

  // Use string representation to avoid 64-bit precision loss
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("zobrist_hash", hash.toString())
    .eq("fen", fen)
    .single();

  if (error) {
    console.error("Error fetching position by Zobrist:", error);
    return null;
  }

  return data;
}

/**
 * Get multiple positions by IDs (for batch loading graph nodes)
 */
export async function getPositionsByIds(ids: string[]): Promise<Position[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("Error fetching positions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get edges from a position (children in graph)
 */
export async function getEdgesFromPosition(positionId: string, limit = 10): Promise<Edge[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("edges")
    .select("*")
    .eq("from_position_id", positionId)
    .order("times_played", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching edges:", error);
    return [];
  }

  return data || [];
}

/**
 * Get edges TO a position (for transposition detection)
 */
export async function getIncomingEdges(positionId: string): Promise<Edge[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("edges")
    .select("*")
    .eq("to_position_id", positionId)
    .order("times_played", { ascending: false });

  if (error) {
    console.error("Error fetching incoming edges:", error);
    return [];
  }

  return data || [];
}

/**
 * Search positions by opening name
 */
export async function searchPositionsByOpening(query: string, limit = 20): Promise<Position[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .ilike("opening_name", `%${query}%`)
    .order("total_games", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error searching positions:", error);
    return [];
  }

  return data || [];
}

// Type for the joined query result
interface EdgeWithPosition {
  id: string;
  from_position_id: string;
  to_position_id: string;
  move_san: string;
  move_uci: string;
  times_played: number;
  white_wins: number;
  draws: number;
  black_wins: number;
  created_at: string;
  to_position: Position | null;
}

// Type for the incoming edge query with parent position
interface IncomingEdgeWithPosition {
  id: string;
  from_position_id: string;
  to_position_id: string;
  move_san: string;
  move_uci: string;
  times_played: number;
  white_wins: number;
  draws: number;
  black_wins: number;
  created_at: string;
  from_position: Position | null;
}

/**
 * Get the path from start position to a target position (by FEN)
 * Walks backwards from target to start via most-played incoming edges
 * Returns { path, pathEdges } in forward order (start to target)
 *
 * Optimized: Uses single query per level (joins edge + parent position)
 */
export async function getPathToPosition(
  targetFen: string
): Promise<{ path: Position[]; pathEdges: Edge[] } | null> {
  if (!supabase) return null;

  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  // If target is start position, just return it
  if (targetFen === startFen) {
    const startPos = await getStartingPosition();
    return startPos ? { path: [startPos], pathEdges: [] } : null;
  }

  // Get target position
  const targetPos = await getPositionByFen(targetFen);
  if (!targetPos) return null;

  // Walk backwards to start position
  const reversePath: Position[] = [targetPos];
  const reverseEdges: Edge[] = [];
  let currentPosId = targetPos.id;
  let currentFen = targetPos.fen;
  const maxDepth = 100; // Safety limit

  for (let i = 0; i < maxDepth; i++) {
    if (currentFen === startFen) break;

    // Get best incoming edge with parent position in one query
    const { data, error } = await supabase
      .from("edges")
      .select(`
        *,
        from_position:positions!edges_from_position_id_fkey(*)
      `)
      .eq("to_position_id", currentPosId)
      .order("times_played", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No path to start - position is orphaned
      return null;
    }

    const row = data as unknown as IncomingEdgeWithPosition;

    // Build edge object
    const edge: Edge = {
      id: row.id,
      from_position_id: row.from_position_id,
      to_position_id: row.to_position_id,
      move_san: row.move_san,
      move_uci: row.move_uci,
      times_played: row.times_played,
      white_wins: row.white_wins,
      draws: row.draws,
      black_wins: row.black_wins,
      created_at: row.created_at,
    };
    reverseEdges.push(edge);

    if (!row.from_position) return null;

    reversePath.push(row.from_position);
    currentPosId = row.from_position.id;
    currentFen = row.from_position.fen;
  }

  // Reverse to get forward order (start to target)
  const path = reversePath.reverse();
  const pathEdges = reverseEdges.reverse();

  return { path, pathEdges };
}

/**
 * Get edges AND their target positions in one query
 * This avoids a second round trip to fetch positions
 */
export async function getEdgesWithPositions(
  positionId: string,
  limit = 50
): Promise<{ edges: Edge[]; positions: Position[] }> {
  if (!supabase) return { edges: [], positions: [] };

  // Get edges with their target positions in one query using foreign key join
  const { data, error } = await supabase
    .from("edges")
    .select(`
      *,
      to_position:positions!edges_to_position_id_fkey(*)
    `)
    .eq("from_position_id", positionId)
    .order("times_played", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching edges with positions:", error);
    return { edges: [], positions: [] };
  }

  if (!data) return { edges: [], positions: [] };

  // Extract edges and positions from the joined result
  const edges: Edge[] = [];
  const positions: Position[] = [];
  const seenPositions = new Set<string>();

  for (const row of data as unknown as EdgeWithPosition[]) {
    // Build edge object without the joined position
    const edge: Edge = {
      id: row.id,
      from_position_id: row.from_position_id,
      to_position_id: row.to_position_id,
      move_san: row.move_san,
      move_uci: row.move_uci,
      times_played: row.times_played,
      white_wins: row.white_wins,
      draws: row.draws,
      black_wins: row.black_wins,
      created_at: row.created_at,
    };
    edges.push(edge);

    // Extract the position if present and not seen
    if (row.to_position && !seenPositions.has(row.to_position.id)) {
      seenPositions.add(row.to_position.id);
      positions.push(row.to_position);
    }
  }

  return { edges, positions };
}
