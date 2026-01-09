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

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("zobrist_hash", Number(hash))
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
