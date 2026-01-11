import type { HabitContext, HabitWithStatus, HabitItem } from "./types";
import { getDb } from "../../db";

export function getHabitContext(userId: string): HabitContext {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Get all active habits
  const habits = db
    .prepare(
      `
      SELECT id, title FROM habits
      WHERE user_id = ? AND archived = 0
    `
    )
    .all(userId) as Array<{ id: string; title: string }>;

  // Get today's habit logs
  const todayLogs = db
    .prepare(
      `
      SELECT habit_id FROM habit_logs
      WHERE user_id = ? AND date = ?
    `
    )
    .all(userId, today) as Array<{ habit_id: string }>;

  const completedIds = new Set(todayLogs.map((l) => l.habit_id));

  // Calculate streaks for each habit
  const streaks: Record<string, number> = {};
  for (const habit of habits) {
    streaks[habit.id] = calculateHabitStreak(userId, habit.id, db);
  }

  // Build habits with status
  const todaysHabits: HabitWithStatus[] = habits.map((h) => ({
    id: h.id,
    title: h.title,
    completed: completedIds.has(h.id),
    streak: streaks[h.id] || 0,
  }));

  // Find missed habits today
  const missedHabitsToday: HabitItem[] = habits
    .filter((h) => !completedIds.has(h.id))
    .map((h) => ({
      id: h.id,
      title: h.title,
    }));

  // Calculate completion rate this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const weekStats = db
    .prepare(
      `
      SELECT COUNT(DISTINCT date || habit_id) as completed_count
      FROM habit_logs
      WHERE user_id = ? AND date >= ?
    `
    )
    .get(userId, weekStartStr) as { completed_count: number };

  const totalPossible = habits.length * 7;
  const habitCompletionRate = totalPossible > 0
    ? weekStats.completed_count / totalPossible
    : 0;

  return {
    todaysHabits,
    streaks,
    habitCompletionRate,
    missedHabitsToday,
  };
}

function calculateHabitStreak(
  userId: string,
  habitId: string,
  db: ReturnType<typeof getDb>
): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];

    const log = db
      .prepare(
        `
        SELECT id FROM habit_logs
        WHERE user_id = ? AND habit_id = ? AND date = ?
      `
      )
      .get(userId, habitId, dateStr);

    if (log) {
      streak++;
    } else if (i > 0) {
      // Allow today to not be completed yet
      break;
    }
  }

  return streak;
}
