import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Attachment = {
  id: string;
  userId: string;
  noteId?: string;
  itemId?: string;
  name: string;
  url: string;
  createdAt: string;
};

const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  noteId: z.string().optional(),
  itemId: z.string().optional(),
});

type AttachmentRow = {
  id: string;
  user_id: string | null;
  note_id: string | null;
  item_id: string | null;
  name: string;
  url: string;
  created_at: string;
};

function mapRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    noteId: row.note_id ?? undefined,
    itemId: row.item_id ?? undefined,
    name: row.name,
    url: row.url,
    createdAt: row.created_at,
  };
}

export function createAttachment(
  input: z.input<typeof attachmentSchema>,
  options?: { userId?: string }
): Attachment {
  const data = attachmentSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO attachments (id, user_id, note_id, item_id, name, url, created_at)
      VALUES (@id, @user_id, @note_id, @item_id, @name, @url, @created_at)
    `
  ).run({
    id,
    user_id: userId,
    note_id: data.noteId ?? null,
    item_id: data.itemId ?? null,
    name: data.name,
    url: data.url,
    created_at: now,
  });

  return getAttachment(id, { userId });
}

export function getAttachment(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, note_id, item_id, name, url, created_at
        FROM attachments
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as AttachmentRow | undefined;

  if (!row) {
    throw new Error(`Attachment not found: ${id}`);
  }

  return mapRow(row);
}

export function listAttachments(options?: { userId?: string; noteId?: string; itemId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const clauses = ["user_id = @user_id"];
  const params: Record<string, string> = { user_id: userId };

  if (options?.noteId) {
    clauses.push("note_id = @note_id");
    params.note_id = options.noteId;
  }

  if (options?.itemId) {
    clauses.push("item_id = @item_id");
    params.item_id = options.itemId;
  }

  const rows = db
    .prepare(
      `
        SELECT id, user_id, note_id, item_id, name, url, created_at
        FROM attachments
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC
      `
    )
    .all(params) as AttachmentRow[];

  return rows.map(mapRow);
}
