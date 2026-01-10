/**
 * Schema setup script for Supabase
 *
 * This script checks if tables exist and provides instructions for setup.
 * Schema must be run directly in Supabase SQL Editor since anon key can't create tables.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("=== Checking Supabase Tables ===\n");

  // Try to query each table
  const tables = ["positions", "edges", "games", "game_positions"];
  const results: Record<string, { exists: boolean; count?: number; error?: string }> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true, count: count || 0 };
      }
    } catch (e) {
      results[table] = { exists: false, error: String(e) };
    }
  }

  // Display results
  let allExist = true;
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`✓ ${table}: exists (${result.count} rows)`);
    } else {
      console.log(`✗ ${table}: ${result.error}`);
      allExist = false;
    }
  }

  console.log("");

  if (!allExist) {
    console.log("=== Schema Setup Required ===\n");
    console.log("Some tables are missing. Please run the schema SQL in Supabase SQL Editor:");
    console.log("");
    console.log("1. Go to: https://supabase.com/dashboard/project/rsmckhhsgnpoumzfoeor/sql");
    console.log("2. Copy and paste the contents of: supabase/migrations/001_initial_schema.sql");
    console.log("3. Click 'Run'");
    console.log("");
    console.log("After that, you also need to add INSERT policies for the ETL to work.");
    console.log("Add these policies in the SQL Editor:");
    console.log("");
    console.log(`
-- Allow inserts for ETL (add to your SQL Editor)
CREATE POLICY "Allow insert" ON positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON positions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert" ON edges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON edges FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON game_positions FOR INSERT WITH CHECK (true);
    `);
    return false;
  }

  console.log("All tables exist! Ready for ETL.\n");
  return true;
}

async function testInsert() {
  console.log("=== Testing Insert Permission ===\n");

  // Try a test insert
  const testFen = "test/position/fen w - - 0 1";

  const { error } = await supabase
    .from("positions")
    .insert({
      fen: testFen,
      zobrist_hash: 0,
      total_games: 0,
      white_wins: 0,
      draws: 0,
      black_wins: 0,
    });

  if (error) {
    console.log("✗ Insert test failed:", error.message);
    console.log("");
    console.log("You need to add INSERT policies. Run this in Supabase SQL Editor:");
    console.log(`
CREATE POLICY "Allow insert" ON positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON positions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert" ON edges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON edges FOR UPDATE USING (true) WITH CHECK (true);
    `);
    return false;
  }

  // Clean up test row
  await supabase.from("positions").delete().eq("fen", testFen);

  console.log("✓ Insert test passed! ETL is ready to run.\n");
  return true;
}

async function main() {
  const tablesExist = await checkTables();

  if (tablesExist) {
    await testInsert();
  }
}

main().catch(console.error);
