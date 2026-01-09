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
