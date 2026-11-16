// Supabase (Postgres) data access. Handlers only talk to this small interface,
// so tests can swap in an in-memory version (tests/fakeDb.js).
import { createClient } from "@supabase/supabase-js";
import { GameError } from "./game.js";

let client;
function supabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new GameError("The server is not configured yet (missing database keys).", 503);
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

function fail(error) {
  console.error("Database error:", error);
  throw new GameError("The database is unavailable. Please try again.", 503);
}

export const db = {
  async insertGame(state) {
    const { error } = await supabase().from("games").insert({
      id: state.id,
      version: state.version,
      status: state.status,
      state,
    });
    if (error) fail(error);
  },

  async getGame(id) {
    const { data, error } = await supabase()
      .from("games")
      .select("state")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error);
    return data ? data.state : null;
  },

  // Optimistic locking: only saves if nobody changed the game in between.
  async saveGame(state, expectedVersion) {
    const { data, error } = await supabase()
      .from("games")
      .update({
        version: state.version,
        status: state.status,
        state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.id)
      .eq("version", expectedVersion)
      .select("id");
    if (error) fail(error);
    return data.length === 1;
  },

  async insertResult(result) {
    const { error } = await supabase().from("match_results").insert(result);
    // 23505 = already recorded (unique game_id), which is fine.
    if (error && error.code !== "23505") fail(error);
  },

  async recentResults({ limit, name }) {
    let query = supabase()
      .from("match_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (name) query = query.contains("player_names", [name.toLowerCase()]);
    const { data, error } = await query;
    if (error) fail(error);
    return data;
  },
};
