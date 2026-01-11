import type { PatternContext } from "./types";
import { getDb } from "../../db";

export function getPatternContext(userId: string): PatternContext {
  const db = getDb();

  // Analyze completion times to find productive hours
  const completionsByHour = db
    .prepare(
      `
      SELECT strftime('%H', updated_at) as hour, COUNT(*) as count
      FROM items
      WHERE user_id = ? AND status = 'completed'
      AND updated_at >= datetime('now', '-30 days')
      GROUP BY strftime('%H', updated_at)
      ORDER BY count DESC
    `
    )
    .all(userId) as Array<{ hour: string; count: number }>;

  // Top 3 productive hours
  const productiveHours = completionsByHour
    .slice(0, 3)
    .map((r) => {
      const hour = parseInt(r.hour);
      const nextHour = (hour + 1) % 24;
      return `${hour}:00-${nextHour}:00`;
    });

  // Average task duration
  const durationStats = db
    .prepare(
      `
      SELECT AVG(estimated_minutes) as avg_duration
      FROM items
      WHERE user_id = ? AND status = 'completed'
      AND estimated_minutes IS NOT NULL
    `
    )
    .get(userId) as { avg_duration: number | null };

  const averageTaskDuration = durationStats.avg_duration || 45;

  // Estimation accuracy (compare estimated vs actual for focus sessions)
  const focusStats = db
    .prepare(
      `
      SELECT
        AVG(duration_minutes) as avg_actual,
        AVG(CASE WHEN i.estimated_minutes IS NOT NULL THEN i.estimated_minutes ELSE 30 END) as avg_estimated
      FROM focus_sessions fs
      LEFT JOIN items i ON fs.item_id = i.id
      WHERE fs.user_id = ? AND fs.completed = 1
      AND fs.started_at >= datetime('now', '-30 days')
    `
    )
    .get(userId) as { avg_actual: number | null; avg_estimated: number | null };

  let estimationAccuracy = 0.8; // Default
  if (focusStats.avg_actual && focusStats.avg_estimated) {
    const ratio = focusStats.avg_actual / focusStats.avg_estimated;
    estimationAccuracy = Math.max(0, Math.min(1, 1 - Math.abs(1 - ratio)));
  }

  // Completion rate by day
  const completionsByDay = db
    .prepare(
      `
      SELECT strftime('%w', updated_at) as day, COUNT(*) as count
      FROM items
      WHERE user_id = ? AND status = 'completed'
      AND updated_at >= datetime('now', '-30 days')
      GROUP BY strftime('%w', updated_at)
    `
    )
    .all(userId) as Array<{ day: string; count: number }>;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const completionRateByDay: Record<string, number> = {};
  for (const row of completionsByDay) {
    completionRateByDay[dayNames[parseInt(row.day)]] = row.count;
  }

  // Common blockers (from blocked items)
  const blockedReasons = db
    .prepare(
      `
      SELECT i.details
      FROM items i
      WHERE i.user_id = ? AND i.status = 'blocked'
      AND i.details IS NOT NULL
      LIMIT 10
    `
    )
    .all(userId) as Array<{ details: string }>;

  const commonBlockers = blockedReasons
    .map((r) => r.details.substring(0, 50))
    .filter(Boolean);

  // Focus session average
  const focusAvg = db
    .prepare(
      `
      SELECT AVG(duration_minutes) as avg_duration
      FROM focus_sessions
      WHERE user_id = ? AND completed = 1
      AND started_at >= datetime('now', '-30 days')
    `
    )
    .get(userId) as { avg_duration: number | null };

  const focusSessionAverage = focusAvg.avg_duration || 25;

  return {
    productiveHours,
    averageTaskDuration,
    estimationAccuracy,
    completionRateByDay,
    commonBlockers,
    focusSessionAverage,
  };
}
