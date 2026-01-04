import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Goal = {
  id: string;
  userId: string;
  title: string;
  target?: number;
  unit?: string;
  current: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const goalCreateSchema = z.object({
  title: z.string().min(1),
  target: z.number().optional(),
  unit: z.string().optional(),
  current: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const goalPatchSchema = goalCreateSchema.partial().extend({
  status: z.string().optional(),
});

type GoalRow = {
  id: string;
  user_id: string | null;
  title: string;
  target: number | null;
  unit: string | null;
  current: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    title: row.title,
    target: row.target ?? undefined,
    unit: row.unit ?? undefined,
    current: row.current ?? 0,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    status: row.status ?? "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createGoal(
  input: z.input<typeof goalCreateSchema>,
  options?: { userId?: string }
): Goal {
  const data = goalCreateSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO goals (
        id, user_id, title, target, unit, current, start_date, end_date, status, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @title, @target, @unit, @current, @start_date, @end_date, @status, @created_at, @updated_at
      )
    `
  ).run({
    id,
    user_id: userId,
    title: data.title,
    target: data.target ?? null,
    unit: data.unit ?? null,
    current: data.current ?? 0,
    start_date: data.startDate ?? null,
    end_date: data.endDate ?? null,
    status: "active",
    created_at: now,
    updated_at: now,
  });

  return getGoal(id, { userId });
}

export function getGoal(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, title, target, unit, current, start_date, end_date, status, created_at, updated_at
        FROM goals
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as GoalRow | undefined;

  if (!row) {
    throw new Error(`Goal not found: ${id}`);
  }

  return mapRow(row);
}

export function listGoals(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const rows = db
    .prepare(
      `
        SELECT id, user_id, title, target, unit, current, start_date, end_date, status, created_at, updated_at
        FROM goals
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(userId) as GoalRow[];
  return rows.map(mapRow);
}

export function updateGoal(
  id: string,
  patch: z.input<typeof goalPatchSchema>,
  options?: { userId?: string }
) {
  const data = goalPatchSchema.parse(patch);
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  db.prepare(
    `
      UPDATE goals
      SET
        title = COALESCE(@title, title),
        target = COALESCE(@target, target),
        unit = COALESCE(@unit, unit),
        current = COALESCE(@current, current),
        start_date = COALESCE(@start_date, start_date),
        end_date = COALESCE(@end_date, end_date),
        status = COALESCE(@status, status),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    title: data.title ?? null,
    target: data.target ?? null,
    unit: data.unit ?? null,
    current: data.current ?? null,
    start_date: data.startDate ?? null,
    end_date: data.endDate ?? null,
    status: data.status ?? null,
    updated_at: now,
  });

  return getGoal(id, { userId });
}
