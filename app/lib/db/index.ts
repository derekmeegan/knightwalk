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
