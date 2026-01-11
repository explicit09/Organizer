import type { WorkloadContext, ContextItem } from "./types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function getWorkloadContext(userId: string): WorkloadContext {
  const now = new Date();
  const items = listItems(undefined, { userId });
  const openItems = items.filter((i) => i.status !== "completed");

  // Group by status
  const itemsByStatus: Record<string, number> = {};
  const itemsByPriority: Record<string, number> = {};

  for (const item of openItems) {
    itemsByStatus[item.status] = (itemsByStatus[item.status] || 0) + 1;
    itemsByPriority[item.priority] = (itemsByPriority[item.priority] || 0) + 1;
  }

  // Calculate overdue
  const overdueCount = openItems.filter(
    (i) => i.dueAt && new Date(i.dueAt) < now
  ).length;

  // Due today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueTodayCount = openItems.filter((i) => {
    if (!i.dueAt) return false;
    const due = new Date(i.dueAt);
    return due >= todayStart && due <= todayEnd;
  }).length;

  // Due this week
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);

  const dueThisWeekCount = openItems.filter((i) => {
    if (!i.dueAt) return false;
    const due = new Date(i.dueAt);
    return due >= now && due <= weekEnd;
  }).length;

  // Estimated hours
  const estimatedMinutes = openItems.reduce(
    (sum, i) => sum + (i.estimatedMinutes || 30),
    0
  );
  const estimatedHoursRemaining = estimatedMinutes / 60;

  // Available hours (assume 8 working hours per weekday)
  const daysUntilWeekEnd = 7 - now.getDay();
  const workDays = Math.min(daysUntilWeekEnd, 5);
  const availableHoursThisWeek = workDays * 6; // 6 productive hours per day

  // Capacity utilization
  const capacityUtilization = estimatedHoursRemaining / Math.max(availableHoursThisWeek, 1);

  // Completions
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const completedToday = items.filter((i) => {
    if (i.status !== "completed" || !i.updatedAt) return false;
    const updated = new Date(i.updatedAt);
    return updated >= todayStart;
  }).length;

  const completedThisWeek = items.filter((i) => {
    if (i.status !== "completed" || !i.updatedAt) return false;
    const updated = new Date(i.updatedAt);
    return updated >= weekStart;
  }).length;

  // Calculate streak
  const streakDays = calculateCompletionStreak(userId);

  return {
    totalOpenItems: openItems.length,
    itemsByStatus,
    itemsByPriority,
    overdueCount,
    dueTodayCount,
    dueThisWeekCount,
    estimatedHoursRemaining,
    availableHoursThisWeek,
    capacityUtilization,
    completedToday,
    completedThisWeek,
    streakDays,
  };
}

function calculateCompletionStreak(userId: string): number {
  const db = getDb();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const nextDate = new Date(checkDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = db
      .prepare(
        `
        SELECT COUNT(*) as count FROM items
        WHERE user_id = ? AND status = 'completed'
        AND updated_at >= ? AND updated_at < ?
      `
      )
      .get(userId, checkDate.toISOString(), nextDate.toISOString()) as { count: number };

    if (count.count > 0) {
      streak++;
    } else if (i > 0) {
      // Allow today to not have completions yet
      break;
    }
  }

  return streak;
}
