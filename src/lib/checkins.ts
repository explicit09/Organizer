import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type Checkin = {
  id: string;
  userId: string;
  date: string;
  mood?: number;
  focus?: number;
  notes?: string;
  createdAt: string;
};

const checkinSchema = z.object({
  date: z.string(),
  mood: z.number().int().min(1).max(5).optional(),
  focus: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

type CheckinRow = {
  id: string;
  user_id: string | null;
  date: string;
  mood: number | null;
  focus: number | null;
  notes: string | null;
  created_at: string;
};

function mapRow(row: CheckinRow): Checkin {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    date: row.date,
    mood: row.mood ?? undefined,
    focus: row.focus ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function createCheckin(
  input: z.input<typeof checkinSchema>,
  options?: { userId?: string }
) {
  const data = checkinSchema.parse(input);
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO checkins (id, user_id, date, mood, focus, notes, created_at)
      VALUES (@id, @user_id, @date, @mood, @focus, @notes, @created_at)
    `
  ).run({
    id,
    user_id: userId,
    date: data.date,
    mood: data.mood ?? null,
    focus: data.focus ?? null,
    notes: data.notes ?? null,
    created_at: now,
  });

  return getCheckin(id, { userId });
}

export function getCheckin(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT id, user_id, date, mood, focus, notes, created_at
        FROM checkins
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as CheckinRow | undefined;

  if (!row) {
    throw new Error(`Checkin not found: ${id}`);
  }

  return mapRow(row);
}

export function listCheckins(options?: { userId?: string; limit?: number }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 14;
  const rows = db
    .prepare(
      `
        SELECT id, user_id, date, mood, focus, notes, created_at
        FROM checkins
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT ?
      `
    )
    .all(userId, limit) as CheckinRow[];
  return rows.map(mapRow);
}

export function getCheckinStreak(options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const rows = db
    .prepare(
      `
        SELECT date FROM checkins
        WHERE user_id = ?
        ORDER BY date DESC
      `
    )
    .all(userId) as Array<{ date: string }>;

  const dates = rows.map((row) => row.date);
  if (dates.length === 0) {
    return 0;
  }

  let streak = 0;
  let current = new Date(dates[0]);
  current.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === current.getTime()) {
      streak += 1;
      current.setDate(current.getDate() - 1);
    } else if (date.getTime() < current.getTime()) {
      break;
    }
  }

  return streak;
}
