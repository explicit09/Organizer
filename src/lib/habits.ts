import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

// ========== Types ==========

export type HabitFrequency = "daily" | "weekly" | "weekdays" | "custom";

export type Habit = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount: number;
  color: string;
  icon?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  count: number;
  notes?: string;
  createdAt: string;
};

type HabitRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: string;
  target_count: number;
  color: string;
  icon: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

type HabitLogRow = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  count: number;
  notes: string | null;
  created_at: string;
};

// ========== Helpers ==========

function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    frequency: row.frequency as HabitFrequency,
    targetCount: row.target_count,
    color: row.color,
    icon: row.icon ?? undefined,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLogRow(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    date: row.date,
    count: row.count,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ========== Habit CRUD ==========

export function createHabit(
  data: {
    title: string;
    description?: string;
    frequency?: HabitFrequency;
    targetCount?: number;
    color?: string;
    icon?: string;
  },
  options?: { userId?: string }
): Habit {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO habits (id, user_id, title, description, frequency, target_count, color, icon, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id,
    userId,
    data.title,
    data.description ?? null,
    data.frequency ?? "daily",
    data.targetCount ?? 1,
    data.color ?? "#8b5cf6",
    data.icon ?? null,
    now,
    now
  );

  return getHabit(id, { userId })!;
}

export function getHabit(id: string, options?: { userId?: string }): Habit | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(`SELECT * FROM habits WHERE id = ? AND user_id = ?`)
    .get(id, userId) as HabitRow | undefined;

  return row ? mapHabitRow(row) : null;
}

export function updateHabit(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    frequency: HabitFrequency;
    targetCount: number;
    color: string;
    icon: string;
    archived: boolean;
  }>,
  options?: { userId?: string }
): Habit | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  const habit = getHabit(id, { userId });
  if (!habit) return null;

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.title !== undefined) {
    updates.push("title = ?");
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.frequency !== undefined) {
    updates.push("frequency = ?");
    params.push(data.frequency);
  }
  if (data.targetCount !== undefined) {
    updates.push("target_count = ?");
    params.push(data.targetCount);
  }
  if (data.color !== undefined) {
    updates.push("color = ?");
    params.push(data.color);
  }
  if (data.icon !== undefined) {
    updates.push("icon = ?");
    params.push(data.icon);
  }
  if (data.archived !== undefined) {
    updates.push("archived = ?");
    params.push(data.archived ? 1 : 0);
  }

  if (updates.length === 0) return habit;

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);
  params.push(userId);

  db.prepare(
    `UPDATE habits SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
  ).run(...params);

  return getHabit(id, { userId });
}

export function deleteHabit(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare(`DELETE FROM habits WHERE id = ? AND user_id = ?`)
    .run(id, userId);

  return result.changes > 0;
}

export function listHabits(
  options?: { userId?: string; includeArchived?: boolean }
): Habit[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const includeArchived = options?.includeArchived ?? false;

  let query = `SELECT * FROM habits WHERE user_id = ?`;
  if (!includeArchived) {
    query += ` AND archived = 0`;
  }
  query += ` ORDER BY created_at ASC`;

  const rows = db.prepare(query).all(userId) as HabitRow[];
  return rows.map(mapHabitRow);
}

// ========== Habit Logging ==========

export function logHabit(
  habitId: string,
  date: Date | string,
  data?: { count?: number; notes?: string },
  options?: { userId?: string }
): HabitLog {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const dateKey = typeof date === "string" ? date : toDateKey(date);
  const now = new Date().toISOString();

  // Check if log exists for this date
  const existing = db
    .prepare(
      `SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?`
    )
    .get(habitId, dateKey) as HabitLogRow | undefined;

  if (existing) {
    // Update existing log
    const newCount = data?.count ?? existing.count + 1;
    db.prepare(
      `UPDATE habit_logs SET count = ?, notes = ? WHERE id = ?`
    ).run(newCount, data?.notes ?? existing.notes, existing.id);

    return getHabitLog(existing.id, { userId })!;
  }

  // Create new log
  const id = randomUUID();
  db.prepare(
    `INSERT INTO habit_logs (id, habit_id, user_id, date, count, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, habitId, userId, dateKey, data?.count ?? 1, data?.notes ?? null, now);

  return getHabitLog(id, { userId })!;
}

export function unlogHabit(
  habitId: string,
  date: Date | string,
  options?: { userId?: string }
): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const dateKey = typeof date === "string" ? date : toDateKey(date);

  const result = db
    .prepare(
      `DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ?`
    )
    .run(habitId, userId, dateKey);

  return result.changes > 0;
}

export function getHabitLog(id: string, options?: { userId?: string }): HabitLog | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(`SELECT * FROM habit_logs WHERE id = ? AND user_id = ?`)
    .get(id, userId) as HabitLogRow | undefined;

  return row ? mapLogRow(row) : null;
}

export function getHabitLogsForDate(
  date: Date | string,
  options?: { userId?: string }
): HabitLog[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const dateKey = typeof date === "string" ? date : toDateKey(date);

  const rows = db
    .prepare(`SELECT * FROM habit_logs WHERE user_id = ? AND date = ?`)
    .all(userId, dateKey) as HabitLogRow[];

  return rows.map(mapLogRow);
}

export function getHabitLogsForHabit(
  habitId: string,
  options?: { userId?: string; startDate?: string; endDate?: string }
): HabitLog[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  let query = `SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ?`;
  const params: string[] = [habitId, userId];

  if (options?.startDate) {
    query += ` AND date >= ?`;
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ` AND date <= ?`;
    params.push(options.endDate);
  }

  query += ` ORDER BY date DESC`;

  const rows = db.prepare(query).all(...params) as HabitLogRow[];
  return rows.map(mapLogRow);
}

// ========== Statistics ==========

export type HabitWithStats = Habit & {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  completedToday: boolean;
  todayCount: number;
};

export function getHabitWithStats(
  habitId: string,
  options?: { userId?: string }
): HabitWithStats | null {
  const habit = getHabit(habitId, options);
  if (!habit) return null;

  const userId = options?.userId ?? getDefaultUserId();
  const today = toDateKey(new Date());

  // Get all logs for this habit
  const logs = getHabitLogsForHabit(habitId, { userId });
  const logDates = new Set(logs.map((l) => l.date));

  // Check today
  const todayLog = logs.find((l) => l.date === today);
  const completedToday = todayLog ? todayLog.count >= habit.targetCount : false;
  const todayCount = todayLog?.count ?? 0;

  // Calculate current streak
  let currentStreak = 0;
  const checkDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dateKey = toDateKey(checkDate);
    const log = logs.find((l) => l.date === dateKey);

    if (log && log.count >= habit.targetCount) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today might not be done yet
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = [...logDates].sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const log = logs.find((l) => l.date === sortedDates[i]);
    if (log && log.count >= habit.targetCount) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
  }

  // Calculate completion rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let daysToCheck = 0;
  let daysCompleted = 0;

  for (let i = 0; i < 30; i++) {
    const checkDay = new Date();
    checkDay.setDate(checkDay.getDate() - i);
    const dateKey = toDateKey(checkDay);

    // Check if this day should be tracked based on frequency
    const dayOfWeek = checkDay.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (
      habit.frequency === "daily" ||
      (habit.frequency === "weekdays" && isWeekday) ||
      habit.frequency === "weekly" // Simplified - count all days
    ) {
      daysToCheck++;
      const log = logs.find((l) => l.date === dateKey);
      if (log && log.count >= habit.targetCount) {
        daysCompleted++;
      }
    }
  }

  const completionRate = daysToCheck > 0
    ? Math.round((daysCompleted / daysToCheck) * 100)
    : 0;

  return {
    ...habit,
    currentStreak,
    longestStreak,
    completionRate,
    completedToday,
    todayCount,
  };
}

export function listHabitsWithStats(
  options?: { userId?: string; includeArchived?: boolean }
): HabitWithStats[] {
  const habits = listHabits(options);
  return habits
    .map((h) => getHabitWithStats(h.id, options))
    .filter((h): h is HabitWithStats => h !== null);
}

// ========== Grid Data ==========

export type HabitGridData = {
  habit: Habit;
  days: Array<{
    date: string;
    completed: boolean;
    count: number;
  }>;
};

export function getHabitGridData(
  habitId: string,
  days: number = 30,
  options?: { userId?: string }
): HabitGridData | null {
  const habit = getHabit(habitId, options);
  if (!habit) return null;

  const logs = getHabitLogsForHabit(habitId, options);
  const logsByDate = new Map(logs.map((l) => [l.date, l]));

  const gridDays: HabitGridData["days"] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = toDateKey(date);
    const log = logsByDate.get(dateKey);

    gridDays.push({
      date: dateKey,
      completed: log ? log.count >= habit.targetCount : false,
      count: log?.count ?? 0,
    });
  }

  return { habit, days: gridDays };
}
