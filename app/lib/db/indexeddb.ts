import Dexie, { type Table } from "dexie";
import type { Position, Edge } from "./database.types";

// Local cache for positions and edges
export interface CachedPosition extends Position {
  cachedAt: number;
}

export interface CachedEdge extends Edge {
  cachedAt: number;
}

class KnightwalkerDB extends Dexie {
  positions!: Table<CachedPosition, string>;
  edges!: Table<CachedEdge, string>;

  constructor() {
    super("knightwalker");

    this.version(1).stores({
      positions: "id, fen, zobrist_hash, cachedAt",
      edges: "id, from_position_id, to_position_id, cachedAt",
    });
  }
}

export const localDb = new KnightwalkerDB();

// Cache TTL: 1 hour
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Get position from cache, or null if not found/expired
 */
export async function getCachedPosition(id: string): Promise<Position | null> {
  const cached = await localDb.positions.get(id);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    await localDb.positions.delete(id);
    return null;
  }

  return cached;
}

/**
 * Cache a position
 */
export async function cachePosition(position: Position): Promise<void> {
  await localDb.positions.put({
    ...position,
    cachedAt: Date.now(),
  });
}

/**
 * Get edges from cache
 */
export async function getCachedEdges(fromPositionId: string): Promise<Edge[] | null> {
  const cached = await localDb.edges
    .where("from_position_id")
    .equals(fromPositionId)
    .toArray();

  if (cached.length === 0) return null;

  // Check if any are expired
  const now = Date.now();
  const valid = cached.filter((e) => now - e.cachedAt < CACHE_TTL);
  const expired = cached.filter((e) => now - e.cachedAt >= CACHE_TTL);

  // Delete only expired edges, keep valid ones
  if (expired.length > 0) {
    const expiredIds = expired.map((e) => e.id);
    await localDb.edges.bulkDelete(expiredIds);
  }

  // Return valid edges if any exist, otherwise null to trigger refetch
  return valid.length > 0 ? valid : null;
}

/**
 * Cache edges
 */
export async function cacheEdges(edges: Edge[]): Promise<void> {
  const now = Date.now();
  await localDb.edges.bulkPut(
    edges.map((e) => ({ ...e, cachedAt: now }))
  );
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  await localDb.positions.clear();
  await localDb.edges.clear();
}
