import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export type ActivityEntry = {
  id: string;
  userId?: string;
  itemId?: string;
  action: string;
  data?: Record<string, unknown>;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  user_id: string | null;
  item_id: string | null;
  action: string;
  data_json: string | null;
  created_at: string;
};

function mapRow(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    itemId: row.item_id ?? undefined,
    action: row.action,
    data: row.data_json ? (JSON.parse(row.data_json) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
  };
}

export function logActivity(input: {
  userId?: string;
  itemId?: string;
  action: string;
  data?: Record<string, unknown>;
  createdAt?: string;
}): ActivityEntry {
  const db = getDb();
  const now = input.createdAt ?? new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO activity_log (id, user_id, item_id, action, data_json, created_at)
      VALUES (@id, @user_id, @item_id, @action, @data_json, @created_at)
    `
  ).run({
    id,
    user_id: input.userId ?? null,
    item_id: input.itemId ?? null,
    action: input.action,
    data_json: input.data ? JSON.stringify(input.data) : null,
    created_at: now,
  });

  return {
    id,
    userId: input.userId,
    itemId: input.itemId,
    action: input.action,
    data: input.data,
    createdAt: now,
  };
}

export function listActivity(filters?: {
  itemId?: string;
  userId?: string;
  limit?: number;
}) {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters?.userId) {
    clauses.push("user_id = @user_id");
    params.user_id = filters.userId;
  }

  if (filters?.itemId) {
    clauses.push("item_id = @item_id");
    params.item_id = filters.itemId;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters?.limit ? "LIMIT @limit" : "";

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  const rows = db
    .prepare(
      `
        SELECT id, user_id, item_id, action, data_json, created_at
        FROM activity_log
        ${where}
        ORDER BY created_at ASC
        ${limit}
      `
    )
    .all(params) as ActivityRow[];

  return rows.map(mapRow);
}
