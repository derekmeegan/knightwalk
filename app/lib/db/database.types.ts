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
