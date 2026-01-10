import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

async function main() {
  const { count: posCount } = await supabase
    .from("positions")
    .select("*", { count: "exact", head: true });

  const { count: edgeCount } = await supabase
    .from("edges")
    .select("*", { count: "exact", head: true });

  console.log(`Positions: ${posCount}`);
  console.log(`Edges: ${edgeCount}`);
}

main();
