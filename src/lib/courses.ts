import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Course = {
  id: string;
  userId: string;
  name: string;
  term?: string;
  instructor?: string;
  createdAt: string;
  updatedAt: string;
};

const courseSchema = z.object({
  name: z.string().min(1),
  term: z.string().optional(),
  instructor: z.string().optional(),
});

type CourseRow = {
  id: string;
  user_id: string | null;
  name: string;
  term: string | null;
  instructor: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CourseRow): Course {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    term: row.term ?? undefined,
    instructor: row.instructor ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCourse(
  input: z.input<typeof courseSchema>,
  options?: { userId?: string }
) {
  const data = courseSchema.parse(input);
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO courses (id, user_id, name, term, instructor, created_at, updated_at)
      VALUES (@id, @user_id, @name, @term, @instructor, @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    name: data.name,
    term: data.term ?? null,
    instructor: data.instructor ?? null,
    created_at: now,
    updated_at: now,
  });

  return getCourse(id, { userId });
}

export function getCourse(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, name, term, instructor, created_at, updated_at
        FROM courses
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as CourseRow | undefined;

  if (!row) {
    throw new Error(`Course not found: ${id}`);
  }

  return mapRow(row);
}

export function listCourses(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const rows = db
    .prepare(
      `
        SELECT id, user_id, name, term, instructor, created_at, updated_at
        FROM courses
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(userId) as CourseRow[];
  return rows.map(mapRow);
}
