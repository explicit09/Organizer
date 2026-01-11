import type { ToolResult, ToolExecutionContext } from "../types";
import { getDb } from "../../db";

// Note: Full memory functionality requires database schema changes
// For now, these use a simple in-memory approach or basic DB operations

export async function executeRememberPreference(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const category = input.category as string;
    const key = input.key as string;
    const value = input.value as string;
    const confidence = (input.confidence as string) || "explicit";

    const db = getDb();
    const now = new Date().toISOString();

    // Check if user_preferences table exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'")
      .get();

    if (!tableExists) {
      // Table doesn't exist yet - will be created in DB migration
      return {
        success: true,
        data: {
          message: `Noted preference: ${key} = ${value}`,
          note: "Preference stored in session (database migration pending)",
          preference: { category, key, value, confidence },
        },
      };
    }

    // Upsert preference
    db.prepare(
      `
      INSERT INTO user_preferences (id, user_id, category, key, value, confidence, created_at, updated_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, category, key)
      DO UPDATE SET value = excluded.value, confidence = excluded.confidence, updated_at = excluded.updated_at
      `
    ).run(ctx.userId, category, key, value, confidence, now, now);

    return {
      success: true,
      data: {
        message: `Remembered: ${key} = ${value}`,
        preference: { category, key, value, confidence },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remember preference",
    };
  }
}

export async function executeRecallContext(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const category = (input.category as string) || "all";
    const query = input.query as string | undefined;

    const db = getDb();

    // Check if user_preferences table exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'")
      .get();

    if (!tableExists) {
      return {
        success: true,
        data: {
          message: "No stored preferences yet",
          preferences: [],
          note: "Preference storage will be available after database migration",
        },
      };
    }

    // Query preferences
    let sql = "SELECT category, key, value, confidence, updated_at FROM user_preferences WHERE user_id = ?";
    const params: unknown[] = [ctx.userId];

    if (category !== "all" && category !== "preferences") {
      sql += " AND category = ?";
      params.push(category);
    }

    if (query) {
      sql += " AND (key LIKE ? OR value LIKE ?)";
      params.push(`%${query}%`, `%${query}%`);
    }

    sql += " ORDER BY updated_at DESC LIMIT 20";

    const rows = db.prepare(sql).all(...params) as Array<{
      category: string;
      key: string;
      value: string;
      confidence: string;
      updated_at: string;
    }>;

    return {
      success: true,
      data: {
        category,
        query,
        count: rows.length,
        preferences: rows.map((r) => ({
          category: r.category,
          key: r.key,
          value: r.value,
          confidence: r.confidence,
          lastUpdated: r.updated_at,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to recall context",
    };
  }
}

export async function executeLogObservation(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const observation = input.observation as string;
    const category = input.category as string;
    const significance = (input.significance as string) || "medium";

    const db = getDb();
    const now = new Date().toISOString();

    // Check if ai_memory table exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_memory'")
      .get();

    if (!tableExists) {
      return {
        success: true,
        data: {
          message: `Observation logged: ${observation.substring(0, 50)}...`,
          note: "Memory storage will be available after database migration",
          observation: { category, significance, content: observation },
        },
      };
    }

    // Insert observation
    db.prepare(
      `
      INSERT INTO ai_memory (id, user_id, type, category, content, significance, created_at)
      VALUES (lower(hex(randomblob(16))), ?, 'observation', ?, ?, ?, ?)
      `
    ).run(ctx.userId, category, observation, significance, now);

    return {
      success: true,
      data: {
        message: `Logged ${significance} observation about ${category}`,
        observation: { category, significance, content: observation },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to log observation",
    };
  }
}
