import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Note = {
  id: string;
  userId: string;
  itemId?: string;
  title: string;
  content?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

const noteCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  itemId: z.string().optional(),
});

const notePatchSchema = noteCreateSchema.partial();

type NoteRow = {
  id: string;
  user_id: string | null;
  item_id: string | null;
  title: string;
  content: string | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    itemId: row.item_id ?? undefined,
    title: row.title,
    content: row.content ?? undefined,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createNote(
  input: z.input<typeof noteCreateSchema>,
  options?: { userId?: string }
): Note {
  const data = noteCreateSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO notes (
        id, user_id, item_id, title, content, tags_json, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @item_id, @title, @content, @tags_json, @created_at, @updated_at
      )
    `
  ).run({
    id,
    user_id: userId,
    item_id: data.itemId ?? null,
    title: data.title,
    content: data.content ?? null,
    tags_json: JSON.stringify(data.tags ?? []),
    created_at: now,
    updated_at: now,
  });

  return getNote(id, { userId });
}

export function getNote(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, item_id, title, content, tags_json, created_at, updated_at
        FROM notes
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as NoteRow | undefined;

  if (!row) {
    throw new Error(`Note not found: ${id}`);
  }

  return mapRow(row);
}

export function listNotes(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const rows = db
    .prepare(
      `
        SELECT id, user_id, item_id, title, content, tags_json, created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(userId) as NoteRow[];

  return rows.map(mapRow);
}

export function updateNote(
  id: string,
  patch: z.input<typeof notePatchSchema>,
  options?: { userId?: string }
) {
  const data = notePatchSchema.parse(patch);
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  db.prepare(
    `
      UPDATE notes
      SET
        title = COALESCE(@title, title),
        content = COALESCE(@content, content),
        tags_json = COALESCE(@tags_json, tags_json),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    title: data.title ?? null,
    content: data.content ?? null,
    tags_json: data.tags ? JSON.stringify(data.tags) : null,
    updated_at: now,
  });

  return getNote(id, { userId });
}

export function deleteNote(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const result = db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}
