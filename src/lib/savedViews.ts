import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type SavedView = {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, string[]>;
  sortBy?: string;
  groupBy?: string;
  viewType: "list" | "board" | "timeline";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type SavedViewRow = {
  id: string;
  user_id: string | null;
  name: string;
  filters_json: string | null;
  sort_by: string | null;
  group_by: string | null;
  view_type: string;
  is_default: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    filters: row.filters_json ? JSON.parse(row.filters_json) : {},
    sortBy: row.sort_by ?? undefined,
    groupBy: row.group_by ?? undefined,
    viewType: (row.view_type as SavedView["viewType"]) || "list",
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSavedView(
  input: {
    name: string;
    filters?: Record<string, string[]>;
    sortBy?: string;
    groupBy?: string;
    viewType?: "list" | "board" | "timeline";
  },
  options?: { userId?: string }
): SavedView {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO saved_views (id, user_id, name, filters_json, sort_by, group_by, view_type, is_default, created_at, updated_at)
      VALUES (@id, @user_id, @name, @filters_json, @sort_by, @group_by, @view_type, 0, @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    name: input.name,
    filters_json: JSON.stringify(input.filters ?? {}),
    sort_by: input.sortBy ?? null,
    group_by: input.groupBy ?? null,
    view_type: input.viewType ?? "list",
    created_at: now,
    updated_at: now,
  });

  return {
    id,
    userId,
    name: input.name,
    filters: input.filters ?? {},
    sortBy: input.sortBy,
    groupBy: input.groupBy,
    viewType: input.viewType ?? "list",
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function listSavedViews(options?: { userId?: string }): SavedView[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare("SELECT * FROM saved_views WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as SavedViewRow[];

  return rows.map(mapRow);
}

export function getSavedView(id: string, options?: { userId?: string }): SavedView | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare("SELECT * FROM saved_views WHERE id = ? AND user_id = ?")
    .get(id, userId) as SavedViewRow | undefined;

  return row ? mapRow(row) : null;
}

export function updateSavedView(
  id: string,
  updates: Partial<{
    name: string;
    filters: Record<string, string[]>;
    sortBy: string;
    groupBy: string;
    viewType: "list" | "board" | "timeline";
    isDefault: boolean;
  }>,
  options?: { userId?: string }
): SavedView | null {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  // If setting as default, unset other defaults
  if (updates.isDefault) {
    db.prepare("UPDATE saved_views SET is_default = 0 WHERE user_id = ?").run(userId);
  }

  db.prepare(
    `
      UPDATE saved_views SET
        name = COALESCE(@name, name),
        filters_json = COALESCE(@filters_json, filters_json),
        sort_by = COALESCE(@sort_by, sort_by),
        group_by = COALESCE(@group_by, group_by),
        view_type = COALESCE(@view_type, view_type),
        is_default = COALESCE(@is_default, is_default),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    name: updates.name ?? null,
    filters_json: updates.filters ? JSON.stringify(updates.filters) : null,
    sort_by: updates.sortBy ?? null,
    group_by: updates.groupBy ?? null,
    view_type: updates.viewType ?? null,
    is_default: updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : null,
    updated_at: now,
  });

  return getSavedView(id, options);
}

export function deleteSavedView(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare("DELETE FROM saved_views WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}
