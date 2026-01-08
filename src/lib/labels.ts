import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Label = {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
};

type LabelRow = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  created_at: string;
};

function mapRow(row: LabelRow): Label {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function createLabel(
  input: { name: string; color: string },
  options?: { userId?: string }
): Label {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO labels (id, user_id, name, color, created_at)
      VALUES (@id, @user_id, @name, @color, @created_at)
    `
  ).run({
    id,
    user_id: userId,
    name: input.name,
    color: input.color,
    created_at: now,
  });

  return { id, userId, name: input.name, color: input.color, createdAt: now };
}

export function listLabels(options?: { userId?: string }): Label[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare("SELECT * FROM labels WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as LabelRow[];

  return rows.map(mapRow);
}

export function deleteLabel(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  // Also remove from item_labels
  db.prepare("DELETE FROM item_labels WHERE label_id = ?").run(id);

  const result = db
    .prepare("DELETE FROM labels WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}

export function addLabelToItem(
  itemId: string,
  labelId: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, ?)`
  ).run(itemId, labelId);
}

export function removeLabelFromItem(
  itemId: string,
  labelId: string
): void {
  const db = getDb();
  db.prepare(
    `DELETE FROM item_labels WHERE item_id = ? AND label_id = ?`
  ).run(itemId, labelId);
}

export function getItemLabels(
  itemId: string,
  options?: { userId?: string }
): Label[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT l.* FROM labels l
        INNER JOIN item_labels il ON l.id = il.label_id
        WHERE il.item_id = ? AND l.user_id = ?
        ORDER BY l.name ASC
      `
    )
    .all(itemId, userId) as LabelRow[];

  return rows.map(mapRow);
}
