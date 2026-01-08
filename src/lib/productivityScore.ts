import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems } from "./items";
import { getFocusStats } from "./focusSessions";
import { listHabitsWithStats } from "./habits";
import { getDailyPlanStreak } from "./dailyPlanning";

// ========== Types ==========

export type ProductivityScore = {
  overall: number; // 0-100
  breakdown: {
    completion: number;      // Tasks completed vs created
    consistency: number;     // Streak and daily activity
    focus: number;          // Focus session minutes
    planning: number;       // Daily plans created
    balance: number;        // Time across life areas
  };
  trend: "improving" | "stable" | "declining";
  insights: string[];
  weeklyHistory: Array<{
    week: string;
    score: number;
  }>;
};

// ========== Score Calculation ==========

export function calculateProductivityScore(
  options?: { userId?: string }
): ProductivityScore {
  const userId = options?.userId ?? getDefaultUserId();
  const db = getDb();

  // Get data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  // 1. Completion Score (25%)
  const allItems = listItems(undefined, { userId });
  const recentItems = allItems.filter((i) => i.createdAt >= thirtyDaysAgoStr);
  const completedItems = recentItems.filter((i) => i.status === "completed");
  const completionRate = recentItems.length
    ? Math.round((completedItems.length / recentItems.length) * 100)
    : 0;
  const completionScore = Math.min(100, completionRate);

  // 2. Consistency Score (25%)
  const planStreak = getDailyPlanStreak({ userId });
  const focusStats = getFocusStats({ userId });
  const habitStats = listHabitsWithStats({ userId });

  // Calculate average habit completion rate
  const avgHabitRate = habitStats.length
    ? habitStats.reduce((sum, h) => sum + h.completionRate, 0) / habitStats.length
    : 0;

  // Streak bonus (max 50 points from streak)
  const streakBonus = Math.min(50, planStreak * 5);
  // Habit consistency (max 50 points)
  const habitConsistency = avgHabitRate / 2;
  const consistencyScore = Math.round(streakBonus + habitConsistency);

  // 3. Focus Score (20%)
  // Target: 2 hours per day = 60 hours per month
  const targetFocusMinutes = 60 * 60; // 60 hours
  const focusProgress = Math.min(100, (focusStats.totalMinutes / targetFocusMinutes) * 100);
  const focusScore = Math.round(focusProgress);

  // 4. Planning Score (15%)
  const planCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM daily_plans
       WHERE user_id = ? AND created_at >= ?`
    )
    .get(userId, thirtyDaysAgoStr) as { count: number };

  // Target: plan every weekday = ~22 days
  const planningProgress = Math.min(100, (planCount.count / 22) * 100);
  const planningScore = Math.round(planningProgress);

  // 5. Balance Score (15%)
  // Check distribution across life areas
  const areaItems = db
    .prepare(
      `SELECT area, COUNT(*) as count FROM items
       WHERE user_id = ? AND created_at >= ? AND area IS NOT NULL
       GROUP BY area`
    )
    .all(userId, thirtyDaysAgoStr) as Array<{ area: string; count: number }>;

  let balanceScore = 50; // Base score
  if (areaItems.length >= 3) {
    balanceScore = 75;
  }
  if (areaItems.length >= 5) {
    balanceScore = 100;
  }

  // Calculate overall score (weighted average)
  const overall = Math.round(
    completionScore * 0.25 +
    consistencyScore * 0.25 +
    focusScore * 0.20 +
    planningScore * 0.15 +
    balanceScore * 0.15
  );

  // Determine trend by comparing to previous period
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString();

  const previousCompleted = allItems.filter(
    (i) => i.status === "completed" && 
           i.createdAt >= sixtyDaysAgoStr && 
           i.createdAt < thirtyDaysAgoStr
  ).length;

  const previousTotal = allItems.filter(
    (i) => i.createdAt >= sixtyDaysAgoStr && i.createdAt < thirtyDaysAgoStr
  ).length;

  const previousRate = previousTotal > 0 
    ? (previousCompleted / previousTotal) * 100 
    : 0;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (completionRate > previousRate + 10) {
    trend = "improving";
  } else if (completionRate < previousRate - 10) {
    trend = "declining";
  }

  // Generate insights
  const insights: string[] = [];

  if (completionScore < 50) {
    insights.push("Try breaking tasks into smaller, more achievable pieces");
  } else if (completionScore >= 80) {
    insights.push("Excellent task completion rate! Keep it up");
  }

  if (consistencyScore < 50) {
    insights.push("Building daily habits will boost your consistency score");
  }

  if (focusScore < 40) {
    insights.push("Schedule more focus sessions to improve deep work time");
  } else if (focusScore >= 70) {
    insights.push("Great focus discipline! Your deep work time is solid");
  }

  if (planningScore < 50) {
    insights.push("Start each day with the Today page for better planning");
  }

  if (balanceScore < 60) {
    insights.push("Consider tasks across different life areas for balance");
  }

  if (trend === "improving") {
    insights.push("Your productivity is trending upward - great progress!");
  } else if (trend === "declining") {
    insights.push("Productivity dipped recently - consider what changed");
  }

  // Weekly history (last 4 weeks)
  const weeklyHistory: ProductivityScore["weeklyHistory"] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (7 * (i + 1)));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekItems = allItems.filter((item) => {
      const created = new Date(item.createdAt);
      return created >= weekStart && created < weekEnd;
    });

    const weekCompleted = weekItems.filter((i) => i.status === "completed").length;
    const weekScore = weekItems.length
      ? Math.round((weekCompleted / weekItems.length) * 100)
      : 0;

    weeklyHistory.push({
      week: weekStart.toISOString().slice(0, 10),
      score: Math.min(100, weekScore),
    });
  }

  return {
    overall,
    breakdown: {
      completion: completionScore,
      consistency: consistencyScore,
      focus: focusScore,
      planning: planningScore,
      balance: balanceScore,
    },
    trend,
    insights,
    weeklyHistory,
  };
}

// ========== Focus Analytics ==========

export type FocusAnalytics = {
  totalMinutes: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  longestSession: number;
  peakHour: number;
  peakDay: string;
  weeklyTrend: Array<{
    day: string;
    minutes: number;
  }>;
  monthlyTrend: Array<{
    week: string;
    minutes: number;
  }>;
};

export function getFocusAnalytics(
  options?: { userId?: string }
): FocusAnalytics {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  // Get all focus sessions
  const sessions = db
    .prepare(
      `SELECT * FROM focus_sessions
       WHERE user_id = ? AND type = 'focus' AND completed = 1
       ORDER BY started_at DESC
       LIMIT 500`
    )
    .all(userId) as Array<{
      duration_minutes: number;
      started_at: string;
    }>;

  if (sessions.length === 0) {
    return {
      totalMinutes: 0,
      sessionsCompleted: 0,
      averageSessionLength: 0,
      longestSession: 0,
      peakHour: 9,
      peakDay: "Monday",
      weeklyTrend: [],
      monthlyTrend: [],
    };
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const sessionsCompleted = sessions.length;
  const averageSessionLength = Math.round(totalMinutes / sessionsCompleted);
  const longestSession = Math.max(...sessions.map((s) => s.duration_minutes));

  // Analyze by hour
  const hourCounts: Record<number, number> = {};
  for (const session of sessions) {
    const hour = new Date(session.started_at).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + session.duration_minutes;
  }
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "9";

  // Analyze by day of week
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayCounts: Record<string, number> = {};
  for (const session of sessions) {
    const day = days[new Date(session.started_at).getDay()];
    dayCounts[day] = (dayCounts[day] ?? 0) + session.duration_minutes;
  }
  const peakDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Monday";

  // Weekly trend (last 7 days)
  const weeklyTrend: FocusAnalytics["weeklyTrend"] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().slice(0, 10);

    const dayMinutes = sessions
      .filter((s) => s.started_at.startsWith(dateKey))
      .reduce((sum, s) => sum + s.duration_minutes, 0);

    weeklyTrend.push({
      day: days[date.getDay()].slice(0, 3),
      minutes: dayMinutes,
    });
  }

  // Monthly trend (last 4 weeks)
  const monthlyTrend: FocusAnalytics["monthlyTrend"] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (7 * (i + 1)));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekMinutes = sessions
      .filter((s) => {
        const date = new Date(s.started_at);
        return date >= weekStart && date < weekEnd;
      })
      .reduce((sum, s) => sum + s.duration_minutes, 0);

    monthlyTrend.push({
      week: `Week ${4 - i}`,
      minutes: weekMinutes,
    });
  }

  return {
    totalMinutes,
    sessionsCompleted,
    averageSessionLength,
    longestSession,
    peakHour: parseInt(peakHour),
    peakDay,
    weeklyTrend,
    monthlyTrend,
  };
}
