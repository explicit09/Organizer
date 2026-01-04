import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Project = {
  id: string;
  userId: string;
  name: string;
  area?: string;
  goal?: string;
  createdAt: string;
  updatedAt: string;
};

const projectSchema = z.object({
  name: z.string().min(1),
  area: z.string().optional(),
  goal: z.string().optional(),
});

type ProjectRow = {
  id: string;
  user_id: string | null;
  name: string;
  area: string | null;
  goal: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    area: row.area ?? undefined,
    goal: row.goal ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(
  input: z.input<typeof projectSchema>,
  options?: { userId?: string }
) {
  const data = projectSchema.parse(input);
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO projects (id, user_id, name, area, goal, created_at, updated_at)
      VALUES (@id, @user_id, @name, @area, @goal, @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    name: data.name,
    area: data.area ?? null,
    goal: data.goal ?? null,
    created_at: now,
    updated_at: now,
  });

  return getProject(id, { userId });
}

export function getProject(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, name, area, goal, created_at, updated_at
        FROM projects
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as ProjectRow | undefined;

  if (!row) {
    throw new Error(`Project not found: ${id}`);
  }

  return mapRow(row);
}

export function listProjects(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const rows = db
    .prepare(
      `
        SELECT id, user_id, name, area, goal, created_at, updated_at
        FROM projects
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(userId) as ProjectRow[];
  return rows.map(mapRow);
}
