# Agent 1: Data Pipeline Plan

## Project Context

You are building the data layer for **Knightwalker**, a chess opening visualization app. The app visualizes opening lines as a graph where:
- **Nodes** = chess positions (identified by FEN/Zobrist hash)
- **Edges** = moves between positions
- **Transpositions** = different move orders reaching the same position (same node, multiple incoming edges)

The app has two modes:
- **Explore Mode**: Users navigate a graph of openings
- **Analyze Mode**: Users analyze positions with Stockfish

**Your job**: Set up the database, create the schema, build the ETL pipeline to import Lichess data, and provide query functions for the UI.

**Main plan reference**: `/Users/d/Desktop/me/knightwalk/plan.md` (see "Data Architecture" and "Database Schema" sections)

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
│   ├── /chess/                  # Agent 2's domain
│   └── /db/                     # YOUR domain - all DB code goes here
│
├── /hooks/                       # ONLY global hooks (used by 2+ features)
│
└── /stores/
    └── app-store.ts
```

**Key Rules**:
- Underscore prefix (`_`) makes directories non-routable
- Your code goes in `app/lib/db/`
- Feature-specific hooks go in feature `/_hooks/` folders

---

## Your Role

You are **Agent 1: Data Pipeline**. You handle:
- Supabase project setup and configuration
- Database schema creation
- ETL pipeline for Lichess data
- IndexedDB (Dexie) setup for client-side caching
- Query functions and hooks for data fetching

---

## Boundaries

### You ARE responsible for:
- `app/lib/db/` - ALL files in this directory
- Supabase configuration and environment variables
- Database schema (tables, indexes, RLS policies)
- ETL scripts (can be in `scripts/` folder)
- Data query functions
- Dexie/IndexedDB setup
- Mock data generation for other agents

### You are NOT responsible for:
- Chess logic (move validation, FEN parsing) → Agent 2
- Zobrist hashing implementation → Agent 2 (but you USE the hash they provide)
- UI components → Agents 3 & 4
- Stockfish integration → Agent 2

### Sensitive Overlap Areas:

| Area | Your Role | Other Agent |
|------|-----------|-------------|
| `app/stores/app-store.ts` | Add data-loading state if needed | Foundation created skeleton |
| `app/lib/chess/types.ts` | Use types defined here | Agent 2 defines types |
| Zobrist hashing | You CALL the function | Agent 2 IMPLEMENTS it |
| Position data | You FETCH and STORE | Agent 3 DISPLAYS in graph |
| Game data | You FETCH and STORE | Agent 4 DISPLAYS in list |

### If you need to:
- Modify `app/stores/app-store.ts` → Add your state, don't remove existing
- Use Zobrist hashing → Import from `@/app/lib/chess/zobrist` (Agent 2 builds this)
- Change schema significantly → **ASK HUMAN FIRST**
- Add new dependencies → **ASK HUMAN FIRST**

---

## Detailed Tasks

### 1. Create Supabase Configuration

**File: `app/lib/db/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**File: `.env.local`** (create this - it will be gitignored)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**File: `.env.example`** (create this for documentation)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Create Database Schema

Create this SQL in Supabase SQL Editor or as a migration file.

**File: `supabase/migrations/001_initial_schema.sql`** (or run directly in Supabase)

```sql
-- ============================================
-- KNIGHTWALKER DATABASE SCHEMA
-- ============================================

-- Positions table (graph nodes)
-- Each unique FEN is one node - transpositions naturally merge here
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fen TEXT NOT NULL UNIQUE,
  zobrist_hash BIGINT NOT NULL,
  total_games INT DEFAULT 0,
  white_wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  black_wins INT DEFAULT 0,
  avg_elo INT,
  eco TEXT,
  opening_name TEXT,
  variation_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for positions
CREATE INDEX idx_positions_zobrist ON positions(zobrist_hash);
CREATE INDEX idx_positions_eco ON positions(eco);
CREATE INDEX idx_positions_opening ON positions(opening_name);
CREATE INDEX idx_positions_games ON positions(total_games DESC);

-- Edges table (moves between positions)
-- Multiple edges can point TO the same position (transpositions!)
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  to_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  move_san TEXT NOT NULL,
  move_uci TEXT NOT NULL,
  times_played INT DEFAULT 0,
  white_wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  black_wins INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_position_id, move_san)
);

-- Indexes for edges
CREATE INDEX idx_edges_from ON edges(from_position_id);
CREATE INDEX idx_edges_to ON edges(to_position_id);
CREATE INDEX idx_edges_times_played ON edges(times_played DESC);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lichess_id TEXT UNIQUE,
  white_player TEXT,
  black_player TEXT,
  white_elo INT,
  black_elo INT,
  result TEXT,
  date DATE,
  event TEXT,
  site TEXT,
  eco TEXT,
  opening_name TEXT,
  moves TEXT[],
  pgn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for games
CREATE INDEX idx_games_white ON games(white_player);
CREATE INDEX idx_games_black ON games(black_player);
CREATE INDEX idx_games_eco ON games(eco);
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_games_elo ON games(GREATEST(white_elo, black_elo) DESC);

-- Junction table: which games reach which positions
CREATE TABLE game_positions (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  PRIMARY KEY (game_id, position_id)
);

CREATE INDEX idx_game_positions_position ON game_positions(position_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_positions ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required for reading)
CREATE POLICY "Public read access" ON positions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON edges FOR SELECT USING (true);
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON game_positions FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get position with child edges
CREATE OR REPLACE FUNCTION get_position_with_edges(pos_id UUID)
RETURNS TABLE (
  position_data JSONB,
  outgoing_edges JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(p.*) as position_data,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'move_san', e.move_san,
          'move_uci', e.move_uci,
          'to_position_id', e.to_position_id,
          'times_played', e.times_played,
          'white_wins', e.white_wins,
          'draws', e.draws,
          'black_wins', e.black_wins
        ) ORDER BY e.times_played DESC
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'::jsonb
    ) as outgoing_edges
  FROM positions p
  LEFT JOIN edges e ON e.from_position_id = p.id
  WHERE p.id = pos_id
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Get incoming edges (for transposition detection)
CREATE OR REPLACE FUNCTION get_incoming_edges(pos_id UUID)
RETURNS TABLE (
  edge_id UUID,
  from_position_id UUID,
  from_opening_name TEXT,
  move_san TEXT,
  times_played INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.from_position_id,
    p.opening_name,
    e.move_san,
    e.times_played
  FROM edges e
  JOIN positions p ON p.id = e.from_position_id
  WHERE e.to_position_id = pos_id
  ORDER BY e.times_played DESC;
END;
$$ LANGUAGE plpgsql;
```

### 3. Generate TypeScript Types from Schema

**File: `app/lib/db/database.types.ts`**

```typescript
// Generated types for Supabase
// In production, use: npx supabase gen types typescript --project-id <id> > database.types.ts

export interface Database {
  public: {
    Tables: {
      positions: {
        Row: {
          id: string;
          fen: string;
          zobrist_hash: number;
          total_games: number;
          white_wins: number;
          draws: number;
          black_wins: number;
          avg_elo: number | null;
          eco: string | null;
          opening_name: string | null;
          variation_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["positions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["positions"]["Insert"]>;
      };
      edges: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["edges"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["edges"]["Insert"]>;
      };
      games: {
        Row: {
          id: string;
          lichess_id: string | null;
          white_player: string | null;
          black_player: string | null;
          white_elo: number | null;
          black_elo: number | null;
          result: string | null;
          date: string | null;
          event: string | null;
          site: string | null;
          eco: string | null;
          opening_name: string | null;
          moves: string[] | null;
          pgn: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["games"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
      };
      game_positions: {
        Row: {
          game_id: string;
          position_id: string;
          move_number: number;
        };
        Insert: Database["public"]["Tables"]["game_positions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["game_positions"]["Insert"]>;
      };
    };
  };
}

// Convenience types
export type Position = Database["public"]["Tables"]["positions"]["Row"];
export type Edge = Database["public"]["Tables"]["edges"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GamePosition = Database["public"]["Tables"]["game_positions"]["Row"];
```

### 4. Create Query Functions

**File: `app/lib/db/positions.ts`**

```typescript
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
  const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("fen", startingFen)
    .single();

  if (error) {
    console.error("Error fetching starting position:", error);
    return null;
  }

  return data;
}

/**
 * Get a position by ID with its outgoing edges
 */
export async function getPositionWithEdges(positionId: string): Promise<PositionWithEdges | null> {
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
```

**File: `app/lib/db/games.ts`**

```typescript
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
  const games = data?.map((row: any) => row.games as Game) || [];

  return { games, total: count || 0 };
}

/**
 * Get a single game by ID
 */
export async function getGameById(gameId: string): Promise<Game | null> {
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
```

### 5. Set Up IndexedDB Cache (Dexie)

**File: `app/lib/db/indexeddb.ts`**

```typescript
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

  if (valid.length !== cached.length) {
    // Some expired, clear and return null
    await localDb.edges
      .where("from_position_id")
      .equals(fromPositionId)
      .delete();
    return null;
  }

  return valid;
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
```

### 6. Create Data Hooks

**File: `app/hooks/use-position.ts`** (shared hook - used by multiple features)

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPositionWithEdges,
  getStartingPosition,
  type PositionWithEdges,
} from "@/app/lib/db/positions";
import {
  getCachedPosition,
  getCachedEdges,
  cachePosition,
  cacheEdges,
} from "@/app/lib/db/indexeddb";
import type { Position, Edge } from "@/app/lib/db/database.types";

interface UsePositionResult {
  position: Position | null;
  edges: Edge[];
  incomingEdgeCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and cache a position with its edges
 */
export function usePosition(positionId: string | null): UsePositionResult {
  const [data, setData] = useState<PositionWithEdges | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!positionId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      const cachedPosition = await getCachedPosition(positionId);
      const cachedEdges = await getCachedEdges(positionId);

      if (cachedPosition && cachedEdges) {
        setData({
          position: cachedPosition,
          outgoingEdges: cachedEdges,
          incomingEdgeCount: 0, // Would need separate cache for this
        });
        setIsLoading(false);
        return;
      }

      // Fetch from Supabase
      const result = await getPositionWithEdges(positionId);

      if (result) {
        // Cache the result
        await cachePosition(result.position);
        await cacheEdges(result.outgoingEdges);
        setData(result);
      } else {
        setError(new Error("Position not found"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch position"));
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    position: data?.position || null,
    edges: data?.outgoingEdges || [],
    incomingEdgeCount: data?.incomingEdgeCount || 0,
    isLoading,
    error,
    refresh: fetchPosition,
  };
}

/**
 * Hook to get the starting position
 */
export function useStartingPosition() {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStartingPosition().then((pos) => {
      setPosition(pos);
      setIsLoading(false);
    });
  }, []);

  return { position, isLoading };
}
```

**File: `app/hooks/use-games.ts`** (shared hook - used by multiple features)

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { getGamesAtPosition, type GamesQueryOptions } from "@/app/lib/db/games";
import type { Game } from "@/app/lib/db/database.types";

interface UseGamesResult {
  games: Game[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => void;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

/**
 * Hook to fetch games at a position with pagination
 */
export function useGamesAtPosition(
  positionId: string | null,
  filters?: Omit<GamesQueryOptions, "positionId" | "limit" | "offset">
): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGames = useCallback(async (reset = false) => {
    if (!positionId) {
      setGames([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentOffset = reset ? 0 : offset;

    try {
      const result = await getGamesAtPosition(positionId, {
        ...filters,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      if (reset) {
        setGames(result.games);
        setOffset(PAGE_SIZE);
      } else {
        setGames((prev) => [...prev, ...result.games]);
        setOffset((prev) => prev + PAGE_SIZE);
      }
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch games"));
    } finally {
      setIsLoading(false);
    }
  }, [positionId, offset, filters]);

  // Reset when position changes
  useEffect(() => {
    setGames([]);
    setOffset(0);
    fetchGames(true);
  }, [positionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!isLoading && games.length < total) {
      fetchGames(false);
    }
  }, [isLoading, games.length, total, fetchGames]);

  return {
    games,
    total,
    isLoading,
    error,
    loadMore,
    hasMore: games.length < total,
  };
}
```

### 7. Create Mock Data for Other Agents

Other agents need data to work with before ETL is complete. Create mock data file.

**File: `app/lib/db/mock-data.ts`**

```typescript
import type { Position, Edge, Game } from "./database.types";

// Starting position
export const STARTING_POSITION: Position = {
  id: "start",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  zobrist_hash: 0,
  total_games: 5000000,
  white_wins: 1900000,
  draws: 1700000,
  black_wins: 1400000,
  avg_elo: 1800,
  eco: null,
  opening_name: "Starting Position",
  variation_name: null,
  created_at: new Date().toISOString(),
};

// First moves
export const MOCK_POSITIONS: Position[] = [
  STARTING_POSITION,
  {
    id: "e4",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    zobrist_hash: 1,
    total_games: 2500000,
    white_wins: 950000,
    draws: 850000,
    black_wins: 700000,
    avg_elo: 1850,
    eco: "B00",
    opening_name: "King's Pawn Opening",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "d4",
    fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
    zobrist_hash: 2,
    total_games: 1800000,
    white_wins: 680000,
    draws: 650000,
    black_wins: 470000,
    avg_elo: 1900,
    eco: "A40",
    opening_name: "Queen's Pawn Opening",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "c4",
    fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1",
    zobrist_hash: 3,
    total_games: 800000,
    white_wins: 310000,
    draws: 280000,
    black_wins: 210000,
    avg_elo: 1950,
    eco: "A10",
    opening_name: "English Opening",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "Nf3",
    fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
    zobrist_hash: 4,
    total_games: 500000,
    white_wins: 190000,
    draws: 180000,
    black_wins: 130000,
    avg_elo: 1920,
    eco: "A04",
    opening_name: "Réti Opening",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
  // After 1.e4 e5
  {
    id: "e4-e5",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    zobrist_hash: 5,
    total_games: 1200000,
    white_wins: 460000,
    draws: 420000,
    black_wins: 320000,
    avg_elo: 1850,
    eco: "C20",
    opening_name: "Open Game",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
  // After 1.e4 c5 (Sicilian)
  {
    id: "e4-c5",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    zobrist_hash: 6,
    total_games: 900000,
    white_wins: 340000,
    draws: 290000,
    black_wins: 270000,
    avg_elo: 1900,
    eco: "B20",
    opening_name: "Sicilian Defense",
    variation_name: null,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_EDGES: Edge[] = [
  // From starting position
  {
    id: "start-e4",
    from_position_id: "start",
    to_position_id: "e4",
    move_san: "e4",
    move_uci: "e2e4",
    times_played: 2500000,
    white_wins: 950000,
    draws: 850000,
    black_wins: 700000,
    created_at: new Date().toISOString(),
  },
  {
    id: "start-d4",
    from_position_id: "start",
    to_position_id: "d4",
    move_san: "d4",
    move_uci: "d2d4",
    times_played: 1800000,
    white_wins: 680000,
    draws: 650000,
    black_wins: 470000,
    created_at: new Date().toISOString(),
  },
  {
    id: "start-c4",
    from_position_id: "start",
    to_position_id: "c4",
    move_san: "c4",
    move_uci: "c2c4",
    times_played: 800000,
    white_wins: 310000,
    draws: 280000,
    black_wins: 210000,
    created_at: new Date().toISOString(),
  },
  {
    id: "start-Nf3",
    from_position_id: "start",
    to_position_id: "Nf3",
    move_san: "Nf3",
    move_uci: "g1f3",
    times_played: 500000,
    white_wins: 190000,
    draws: 180000,
    black_wins: 130000,
    created_at: new Date().toISOString(),
  },
  // From 1.e4
  {
    id: "e4-e5-edge",
    from_position_id: "e4",
    to_position_id: "e4-e5",
    move_san: "e5",
    move_uci: "e7e5",
    times_played: 1200000,
    white_wins: 460000,
    draws: 420000,
    black_wins: 320000,
    created_at: new Date().toISOString(),
  },
  {
    id: "e4-c5-edge",
    from_position_id: "e4",
    to_position_id: "e4-c5",
    move_san: "c5",
    move_uci: "c7c5",
    times_played: 900000,
    white_wins: 340000,
    draws: 290000,
    black_wins: 270000,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_GAMES: Game[] = [
  {
    id: "game-1",
    lichess_id: "abc123",
    white_player: "Magnus Carlsen",
    black_player: "Fabiano Caruana",
    white_elo: 2847,
    black_elo: 2820,
    result: "1-0",
    date: "2024-01-15",
    event: "Sinquefield Cup",
    site: "Saint Louis",
    eco: "B90",
    opening_name: "Sicilian Defense, Najdorf Variation",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
    created_at: new Date().toISOString(),
  },
  {
    id: "game-2",
    lichess_id: "def456",
    white_player: "Hikaru Nakamura",
    black_player: "Ding Liren",
    white_elo: 2789,
    black_elo: 2780,
    result: "1/2-1/2",
    date: "2024-01-14",
    event: "Norway Chess",
    site: "Stavanger",
    eco: "C65",
    opening_name: "Ruy Lopez, Berlin Defense",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"],
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6",
    created_at: new Date().toISOString(),
  },
];

// Helper to get mock data (used when Supabase is not configured)
export function getMockPosition(id: string): Position | undefined {
  return MOCK_POSITIONS.find((p) => p.id === id);
}

export function getMockEdgesFromPosition(positionId: string): Edge[] {
  return MOCK_EDGES.filter((e) => e.from_position_id === positionId);
}

export function getMockEdgesToPosition(positionId: string): Edge[] {
  return MOCK_EDGES.filter((e) => e.to_position_id === positionId);
}
```

### 8. Export Index File

**File: `app/lib/db/index.ts`**

```typescript
// Supabase client
export { supabase } from "./supabase";

// Types
export type { Database, Position, Edge, Game, GamePosition } from "./database.types";

// Query functions
export * from "./positions";
export * from "./games";

// IndexedDB cache
export * from "./indexeddb";

// Mock data (for development)
export * from "./mock-data";
```

---

## ETL Pipeline (Separate Script)

Create a Node.js script to import Lichess data. This runs separately from the Next.js app.

**File: `scripts/etl/import-lichess.ts`**

```typescript
/**
 * ETL Pipeline for Lichess Data
 *
 * Usage:
 *   npx ts-node scripts/etl/import-lichess.ts <path-to-pgn-file>
 *
 * This script:
 * 1. Streams PGN file (doesn't load all into memory)
 * 2. Parses each game
 * 3. Extracts positions and edges
 * 4. Filters by popularity threshold
 * 5. Batch inserts to Supabase
 *
 * IMPORTANT: This is a placeholder. Full implementation requires:
 * - PGN parsing library (chess.js or pgn-parser)
 * - Zobrist hashing (from Agent 2's implementation)
 * - Streaming file reader
 * - Batch insert logic
 *
 * Agent 2 must provide:
 * - computeZobristHash(fen: string): bigint
 * - parsePGN(pgn: string): Game
 * - replayMoves(moves: string[]): Position[]
 */

// TODO: Implement full ETL pipeline
// For now, this is a structural placeholder

console.log("ETL Pipeline - Not yet implemented");
console.log("Waiting for Agent 2 to provide chess logic utilities");
console.log("");
console.log("Required from Agent 2:");
console.log("  - src/lib/chess/zobrist.ts (computeZobristHash)");
console.log("  - src/lib/chess/game.ts (parsePGN, replayMoves)");
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] `app/lib/db/supabase.ts` - Supabase client configured
- [ ] `app/lib/db/database.types.ts` - Types generated
- [ ] `app/lib/db/positions.ts` - Position queries working
- [ ] `app/lib/db/games.ts` - Game queries working
- [ ] `app/lib/db/indexeddb.ts` - Dexie cache working
- [ ] `app/lib/db/mock-data.ts` - Mock data available
- [ ] `app/hooks/use-position.ts` - Hook working
- [ ] `app/hooks/use-games.ts` - Hook working
- [ ] Schema SQL ready for Supabase
- [ ] `.env.local` created with Supabase credentials
- [ ] `npm run dev` works without errors

---

## Notes for Other Agents

### For Agent 2 (Chess Logic):
I need you to implement in `app/lib/chess/zobrist.ts`:
```typescript
export function computeZobristHash(fen: string): bigint
```

### For Agent 3 (Explore Mode):
Use these to fetch graph data:
```typescript
import { usePosition, useStartingPosition } from "@/app/hooks/use-position";
import { MOCK_POSITIONS, MOCK_EDGES } from "@/app/lib/db/mock-data";
```

### For Agent 4 (Analyze Mode):
Use these to fetch games:
```typescript
import { useGamesAtPosition } from "@/app/hooks/use-games";
import { MOCK_GAMES } from "@/app/lib/db/mock-data";
```

---

## Import Path Convention

This project uses `@/` as an alias for the project root. All imports should use:
- `@/app/lib/db/...` for database utilities
- `@/app/hooks/...` for shared hooks
- `@/app/stores/...` for Zustand stores
- `@/app/components/...` for shared components

ETL pipeline will require coordination with Agent 2 and may extend beyond initial build.