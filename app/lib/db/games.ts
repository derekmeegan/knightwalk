import { supabase } from "./supabase";
import type { Game } from "./database.types";

export interface GamesQueryOptions {
  positionId?: string;
  player?: string;
  minElo?: number;
  maxElo?: number;
  eco?: string;
  result?: "1-0" | "0-1" | "1/2-1/2";
  limit?: number;
  offset?: number;
}

/**
 * Get games that reached a specific position
 */
export async function getGamesAtPosition(
  positionId: string,
  options: Omit<GamesQueryOptions, "positionId"> = {}
): Promise<{ games: Game[]; total: number }> {
  if (!supabase) return { games: [], total: 0 };

  const { limit = 20, offset = 0, player, minElo, result } = options;

  // Build query for game_positions join
  let query = supabase
    .from("game_positions")
    .select(`
      game_id,
      games!inner (*)
    `, { count: "exact" })
    .eq("position_id", positionId);

  // Apply filters
  if (player) {
    query = query.or(`white_player.ilike.%${player}%,black_player.ilike.%${player}%`, {
      foreignTable: "games"
    });
  }

  if (minElo) {
    query = query.gte("games.white_elo", minElo).gte("games.black_elo", minElo);
  }

  if (result) {
    query = query.eq("games.result", result);
  }

  // Pagination and ordering
  query = query
    .order("date", { foreignTable: "games", ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching games at position:", error);
    return { games: [], total: 0 };
  }

  // Extract games from the join result
  const games = data?.map((row: Record<string, unknown>) => row.games as Game) || [];

  return { games, total: count || 0 };
}

/**
 * Get a single game by ID
 */
export async function getGameById(gameId: string): Promise<Game | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) {
    console.error("Error fetching game:", error);
    return null;
  }

  return data;
}

/**
 * Search games by player name
 */
export async function searchGamesByPlayer(
  playerName: string,
  limit = 20
): Promise<Game[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(`white_player.ilike.%${playerName}%,black_player.ilike.%${playerName}%`)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error searching games:", error);
    return [];
  }

  return data || [];
}
