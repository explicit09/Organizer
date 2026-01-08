import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { logActivity } from "./activity";

export type Comment = {
  id: string;
  userId: string;
  itemId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type CommentRow = {
  id: string;
  user_id: string | null;
  item_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    itemId: row.item_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createComment(
  input: { itemId: string; content: string },
  options?: { userId?: string }
): Comment {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO comments (id, user_id, item_id, content, created_at, updated_at)
      VALUES (@id, @user_id, @item_id, @content, @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    item_id: input.itemId,
    content: input.content,
    created_at: now,
    updated_at: now,
  });

  logActivity({
    userId,
    itemId: input.itemId,
    action: "comment_added",
    data: { commentId: id },
  });

  return {
    id,
    userId,
    itemId: input.itemId,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
}

export function listComments(
  itemId: string,
  options?: { userId?: string }
): Comment[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT id, user_id, item_id, content, created_at, updated_at
        FROM comments
        WHERE item_id = ? AND user_id = ?
        ORDER BY created_at ASC
      `
    )
    .all(itemId, userId) as CommentRow[];

  return rows.map(mapRow);
}

export function updateComment(
  id: string,
  content: string,
  options?: { userId?: string }
): Comment | null {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare(
      `
        UPDATE comments
        SET content = @content, updated_at = @updated_at
        WHERE id = @id AND user_id = @user_id
      `
    )
    .run({
      id,
      user_id: userId,
      content,
      updated_at: now,
    });

  if (result.changes === 0) return null;

  const row = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(id) as CommentRow | undefined;

  return row ? mapRow(row) : null;
}

export function deleteComment(
  id: string,
  options?: { userId?: string }
): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare("DELETE FROM comments WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}
