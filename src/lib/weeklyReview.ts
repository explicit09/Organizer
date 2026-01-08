import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems, type Item } from "./items";
import { listActivity } from "./activity";
import { getTrends } from "./analytics";
import { listHabitsWithStats } from "./habits";
import { listFocusSessions, getFocusStats } from "./focusSessions";

// ========== Types ==========

export type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  
  // Summary stats
  summary: {
    itemsCreated: number;
    itemsCompleted: number;
    completionRate: number;
    focusMinutes: number;
    habitsCompletionRate: number;
    meetingsAttended: number;
  };
  
  // Wins and achievements
  wins: string[];
  
  // Items that need attention
  incompleteItems: Item[];
  overdueItems: Item[];
  
  // Patterns and insights
  insights: string[];
  
  // Next week suggestions
  suggestions: string[];
  
  // Habit performance
  habitPerformance: Array<{
    title: string;
    completionRate: number;
    streak: number;
  }>;
  
  // Focus patterns
  focusPatterns: {
    totalMinutes: number;
    sessionsCompleted: number;
    bestDay: string;
    averagePerDay: number;
  };
};

// ========== Generation ==========

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateWeeklyReview(
  options?: { userId?: string; weekOf?: Date }
): WeeklyReview {
  const userId = options?.userId ?? getDefaultUserId();
  const referenceDate = options?.weekOf ?? new Date();
  const { start, end } = getWeekBounds(referenceDate);

  const weekStart = toDateKey(start);
  const weekEnd = toDateKey(end);

  // Get all items
  const allItems = listItems(undefined, { userId });
  const activity = listActivity({ userId });

  // Items created this week
  const createdThisWeek = allItems.filter((item) => {
    const created = new Date(item.createdAt);
    return created >= start && created <= end;
  });

  // Items completed this week (from activity log)
  const completedThisWeek = activity.filter((a) => {
    if (a.action !== "item_updated" || a.data?.status !== "completed") return false;
    const activityDate = new Date(a.createdAt);
    return activityDate >= start && activityDate <= end;
  });

  // Incomplete items
  const incompleteItems = allItems.filter(
    (item) => item.status !== "completed" && item.status !== "blocked"
  ).slice(0, 10);

  // Overdue items
  const now = new Date();
  const overdueItems = allItems.filter((item) => {
    if (item.status === "completed") return false;
    if (!item.dueAt) return false;
    return new Date(item.dueAt) < now;
  });

  // Meetings attended
  const meetingsAttended = allItems.filter((item) => {
    if (item.type !== "meeting") return false;
    if (!item.startAt) return false;
    const meetingDate = new Date(item.startAt);
    return meetingDate >= start && meetingDate <= end && item.status === "completed";
  }).length;

  // Focus stats
  const focusSessions = listFocusSessions({
    userId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    type: "focus",
  });
  const completedFocusSessions = focusSessions.filter((s) => s.completed);
  const focusMinutes = completedFocusSessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // Focus by day
  const focusByDay = new Map<string, number>();
  for (const session of completedFocusSessions) {
    const day = session.startedAt.slice(0, 10);
    focusByDay.set(day, (focusByDay.get(day) ?? 0) + session.durationMinutes);
  }
  
  let bestFocusDay = "";
  let bestFocusMinutes = 0;
  for (const [day, minutes] of focusByDay) {
    if (minutes > bestFocusMinutes) {
      bestFocusMinutes = minutes;
      bestFocusDay = day;
    }
  }

  // Habits
  const habits = listHabitsWithStats({ userId });
  const habitPerformance = habits.map((h) => ({
    title: h.title,
    completionRate: h.completionRate,
    streak: h.currentStreak,
  }));

  const avgHabitCompletion = habits.length
    ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length)
    : 0;

  // Generate wins
  const wins: string[] = [];
  if (completedThisWeek.length > 0) {
    wins.push(`Completed ${completedThisWeek.length} items`);
  }
  if (focusMinutes >= 120) {
    wins.push(`Focused for ${Math.round(focusMinutes / 60)} hours`);
  }
  if (avgHabitCompletion >= 80) {
    wins.push(`Maintained ${avgHabitCompletion}% habit completion`);
  }

  const topStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  if (topStreak >= 7) {
    wins.push(`Achieved a ${topStreak}-day streak`);
  }

  // Generate insights
  const insights: string[] = [];
  const trends = getTrends({ userId });

  if (trends.completionRate.trend === "up") {
    insights.push("Your completion rate is improving!");
  } else if (trends.completionRate.trend === "down") {
    insights.push("Completion rate dropped - consider fewer tasks next week");
  }

  if (overdueItems.length > 3) {
    insights.push(`${overdueItems.length} overdue items need attention`);
  }

  if (focusMinutes < 60) {
    insights.push("Try scheduling more focus time next week");
  }

  // Generate suggestions
  const suggestions: string[] = [];

  if (overdueItems.length > 0) {
    suggestions.push("Start by clearing overdue items");
  }

  if (focusMinutes < 120) {
    suggestions.push("Schedule 2-3 focus sessions this week");
  }

  const lowHabits = habits.filter((h) => h.completionRate < 50);
  if (lowHabits.length > 0) {
    suggestions.push(`Focus on improving: ${lowHabits.map((h) => h.title).join(", ")}`);
  }

  suggestions.push("Set your top 3 priorities at the start of each day");

  // Summary
  const summary = {
    itemsCreated: createdThisWeek.length,
    itemsCompleted: completedThisWeek.length,
    completionRate: createdThisWeek.length
      ? Math.round((completedThisWeek.length / createdThisWeek.length) * 100)
      : 0,
    focusMinutes,
    habitsCompletionRate: avgHabitCompletion,
    meetingsAttended,
  };

  return {
    weekStart,
    weekEnd,
    summary,
    wins,
    incompleteItems,
    overdueItems,
    insights,
    suggestions,
    habitPerformance,
    focusPatterns: {
      totalMinutes: focusMinutes,
      sessionsCompleted: completedFocusSessions.length,
      bestDay: bestFocusDay,
      averagePerDay: Math.round(focusMinutes / 7),
    },
  };
}

// ========== Saved Reviews ==========

export type SavedReview = {
  id: string;
  userId: string;
  weekStart: string;
  notes: string;
  wins: string[];
  goalsNextWeek: string[];
  createdAt: string;
};

type ReviewRow = {
  id: string;
  user_id: string;
  week_start: string;
  notes: string | null;
  wins_json: string | null;
  goals_json: string | null;
  created_at: string;
};

// For now, store reviews in a simple JSON structure in daily_plans
// This can be expanded to a dedicated table later

export function saveReviewNotes(
  weekStart: string,
  data: { notes?: string; wins?: string[]; goalsNextWeek?: string[] },
  options?: { userId?: string }
): void {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  // Use daily_plans table with a special date format for reviews
  const reviewDate = `review-${weekStart}`;

  const existing = db
    .prepare(`SELECT id FROM daily_plans WHERE user_id = ? AND date = ?`)
    .get(userId, reviewDate) as { id: string } | undefined;

  const reflectionData = {
    notes: data.notes ?? "",
    wins: data.wins ?? [],
    goalsNextWeek: data.goalsNextWeek ?? [],
  };

  if (existing) {
    db.prepare(
      `UPDATE daily_plans SET reflection_json = ?, updated_at = ? WHERE id = ?`
    ).run(JSON.stringify(reflectionData), now, existing.id);
  } else {
    db.prepare(
      `INSERT INTO daily_plans (id, user_id, date, reflection_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, reviewDate, JSON.stringify(reflectionData), now, now);
  }
}

export function getSavedReviewNotes(
  weekStart: string,
  options?: { userId?: string }
): { notes: string; wins: string[]; goalsNextWeek: string[] } | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const reviewDate = `review-${weekStart}`;

  const row = db
    .prepare(`SELECT reflection_json FROM daily_plans WHERE user_id = ? AND date = ?`)
    .get(userId, reviewDate) as { reflection_json: string | null } | undefined;

  if (!row?.reflection_json) return null;

  try {
    return JSON.parse(row.reflection_json);
  } catch {
    return null;
  }
}
