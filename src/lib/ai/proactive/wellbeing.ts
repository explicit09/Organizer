// Wellbeing and Focus Protection Module
// Prevents burnout, encourages breaks, protects focus time

import type {
  WellbeingIndicators,
  WellbeingWarning,
  WellbeingAssessment,
  WellbeingSuggestion,
  Trigger,
  TriggerDetails,
  ProactiveMessage,
} from "./types";
import type { UserContext } from "../context/types";
import { getDb } from "../../db";

// Assess user's wellbeing based on patterns
export async function assessWellbeing(userId: string): Promise<WellbeingAssessment> {
  const indicators = await calculateIndicators(userId);
  const warnings = identifyWarnings(indicators);
  const overallStatus = determineOverallStatus(warnings);
  const suggestions = generateSuggestions(indicators, warnings);

  return {
    indicators,
    warnings,
    overallStatus,
    suggestions,
  };
}

// Calculate wellbeing indicators from activity data
async function calculateIndicators(userId: string): Promise<WellbeingIndicators> {
  const db = getDb();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get work sessions from past week
  const sessions = db
    .prepare(
      `SELECT started_at, ended_at
       FROM focus_sessions
       WHERE user_id = ? AND started_at >= ?`
    )
    .all(userId, weekAgo.toISOString()) as Array<{
    started_at: string;
    ended_at: string | null;
  }>;

  // Calculate average work hours per day
  const dailyHours = new Map<string, number>();
  let lateNightCount = 0;
  let weekendWork = false;

  for (const session of sessions) {
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : now;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours

    const dateKey = start.toISOString().split("T")[0];
    dailyHours.set(dateKey, (dailyHours.get(dateKey) || 0) + duration);

    // Check for late night work (after 10pm)
    if (start.getHours() >= 22 || end.getHours() >= 22) {
      lateNightCount++;
    }

    // Check for weekend work
    const day = start.getDay();
    if (day === 0 || day === 6) {
      weekendWork = true;
    }
  }

  const avgHours =
    dailyHours.size > 0
      ? Array.from(dailyHours.values()).reduce((a, b) => a + b, 0) / dailyHours.size
      : 0;

  // Calculate workload trend
  const recentHours = Array.from(dailyHours.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-3)
    .map((e) => e[1]);

  let workloadTrend: "increasing" | "stable" | "decreasing" = "stable";
  if (recentHours.length >= 3) {
    const firstHalf = (recentHours[0] + recentHours[1]) / 2;
    const secondHalf = (recentHours[1] + recentHours[2]) / 2;
    if (secondHalf > firstHalf * 1.2) {
      workloadTrend = "increasing";
    } else if (secondHalf < firstHalf * 0.8) {
      workloadTrend = "decreasing";
    }
  }

  // Get breaks taken
  const breaks = db
    .prepare(
      `SELECT COUNT(*) as count FROM breaks
       WHERE user_id = ? AND started_at >= ?`
    )
    .get(userId, weekAgo.toISOString()) as { count: number };

  // Calculate average focus session length
  const avgSessionLength =
    sessions.length > 0
      ? sessions.reduce((sum, s) => {
          const start = new Date(s.started_at);
          const end = s.ended_at ? new Date(s.ended_at) : now;
          return sum + (end.getTime() - start.getTime()) / (1000 * 60);
        }, 0) / sessions.length
      : 0;

  // Calculate streak pressure
  const habitStreaks = db
    .prepare(
      `SELECT MAX(streak) as max_streak FROM (
         SELECT COUNT(*) as streak FROM habit_completions
         WHERE user_id = ? GROUP BY habit_id
       )`
    )
    .get(userId) as { max_streak: number } | undefined;

  const streakPressure = Math.min((habitStreaks?.max_streak || 0) / 30, 1); // 0-1 scale, max at 30 days

  return {
    workloadTrend,
    averageWorkHours: avgHours,
    weekendWork,
    lateNightSessions: lateNightCount,
    breaksTaken: breaks.count,
    focusSessionAverageLength: avgSessionLength,
    streakPressure,
  };
}

// Identify wellbeing warnings
function identifyWarnings(indicators: WellbeingIndicators): WellbeingWarning[] {
  const warnings: WellbeingWarning[] = [];

  // Overwork warning
  if (indicators.averageWorkHours > 10) {
    warnings.push({
      type: "overwork",
      severity: indicators.averageWorkHours > 12 ? "high" : "medium",
      message: `You're averaging ${Math.round(indicators.averageWorkHours)} hours of work per day this week.`,
    });
  }

  // No breaks warning
  if (indicators.breaksTaken < 7) {
    // Less than 1 break per day
    warnings.push({
      type: "no_breaks",
      severity: indicators.breaksTaken < 3 ? "high" : "medium",
      message: `You've only taken ${indicators.breaksTaken} breaks this week. Consider more regular breaks.`,
    });
  }

  // Weekend work warning
  if (indicators.weekendWork) {
    warnings.push({
      type: "weekend_work",
      severity: "low",
      message: "You've been working on weekends. Make sure you're getting enough rest.",
    });
  }

  // Late night warning
  if (indicators.lateNightSessions > 2) {
    warnings.push({
      type: "late_nights",
      severity: indicators.lateNightSessions > 5 ? "high" : "medium",
      message: `You've had ${indicators.lateNightSessions} late-night work sessions this week.`,
    });
  }

  // Streak pressure warning
  if (indicators.streakPressure > 0.7) {
    warnings.push({
      type: "streak_pressure",
      severity: indicators.streakPressure > 0.9 ? "medium" : "low",
      message: "Long streaks can create pressure. It's okay to take breaks when needed.",
    });
  }

  return warnings;
}

// Determine overall wellbeing status
function determineOverallStatus(
  warnings: WellbeingWarning[]
): "healthy" | "caution" | "concern" {
  const highCount = warnings.filter((w) => w.severity === "high").length;
  const mediumCount = warnings.filter((w) => w.severity === "medium").length;

  if (highCount > 0 || mediumCount >= 3) {
    return "concern";
  } else if (mediumCount > 0 || warnings.length >= 2) {
    return "caution";
  }
  return "healthy";
}

// Generate wellbeing suggestions
function generateSuggestions(
  indicators: WellbeingIndicators,
  warnings: WellbeingWarning[]
): WellbeingSuggestion[] {
  const suggestions: WellbeingSuggestion[] = [];

  // Break suggestion
  if (warnings.some((w) => w.type === "no_breaks")) {
    suggestions.push({
      label: "Schedule breaks",
      action: "enable_break_reminders",
      params: { intervalMinutes: 90 },
    });
  }

  // Work hours suggestion
  if (warnings.some((w) => w.type === "overwork")) {
    suggestions.push({
      label: "Set work hour limits",
      action: "configure_work_hours",
      params: { maxHours: 8 },
    });
  }

  // Late night suggestion
  if (warnings.some((w) => w.type === "late_nights")) {
    suggestions.push({
      label: "Enable quiet hours",
      action: "configure_quiet_hours",
      params: { start: 21, end: 8 },
    });
  }

  // Weekend suggestion
  if (warnings.some((w) => w.type === "weekend_work")) {
    suggestions.push({
      label: "Protect weekends",
      action: "configure_weekend_protection",
      params: { enabled: true },
    });
  }

  // General wellness
  if (indicators.workloadTrend === "increasing") {
    suggestions.push({
      label: "Review commitments",
      action: "navigate",
      params: { to: "/tasks?view=capacity" },
    });
  }

  return suggestions;
}

// Wellbeing Triggers

// Wellbeing Check Trigger
export const wellbeingCheckTrigger: Trigger = {
  type: "wellbeing_check",
  priority: "low",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Only trigger on weekdays in the afternoon
      return (
        !ctx.temporal.isWeekend &&
        (ctx.temporal.timeOfDay === "afternoon" || ctx.temporal.timeOfDay === "evening")
      );
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      return {
        workHoursToday: ctx.patterns.focusSessionAverage,
        breaksTaken: 0, // Would need to track this
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Wellbeing Check",
      message: "How are you feeling today? Taking care of yourself is important for sustained productivity.",
      suggestions: [
        { label: "I'm good", action: "dismiss" },
        { label: "Take a break", action: "start_break", params: { minutes: 15 } },
        { label: "View wellness", action: "navigate", params: { to: "/wellness" } },
      ],
      priority: "low",
    }),
  },
};

// Focus Protection Trigger
export const focusProtectionTrigger: Trigger = {
  type: "focus_protection",
  priority: "medium",
  cooldown: 60, // Every hour
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if user is in focus mode and has been interrupted frequently
      const session = ctx.recentActivity.currentFocusSession;
      return session !== null && session.duration > 10;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const session = ctx.recentActivity.currentFocusSession;
      return {
        session: session
          ? {
              id: session.id,
              itemId: session.itemId,
              itemTitle: session.itemTitle,
              startedAt: session.startedAt,
            }
          : undefined,
        duration: session?.duration || 0,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Focus Protected",
      message: `You've been focused for ${details.duration || 0} minutes on "${details.session?.itemTitle || "your task"}". Great concentration!`,
      suggestions: [
        { label: "Keep going", action: "dismiss" },
        { label: "Quick break", action: "start_break", params: { minutes: 5 } },
      ],
      priority: "medium",
    }),
  },
};

// Break Reminder Trigger
export const breakReminderTrigger: Trigger = {
  type: "break_reminder",
  priority: "low",
  cooldown: 90, // Every 90 minutes
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if user has been active for more than 90 minutes without a break
      const lastBreak = await getLastBreakTime(ctx);
      if (!lastBreak) return true;

      const minutesSinceBreak = (Date.now() - lastBreak.getTime()) / (1000 * 60);
      return minutesSinceBreak > 90;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const lastBreak = await getLastBreakTime(ctx);
      const minutesSinceBreak = lastBreak
        ? (Date.now() - lastBreak.getTime()) / (1000 * 60)
        : 120;

      return {
        duration: Math.round(minutesSinceBreak),
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Break Reminder",
      message: `You've been working for ${details.duration || 90} minutes. A short break can help maintain focus and prevent fatigue.`,
      suggestions: [
        { label: "5 min break", action: "start_break", params: { minutes: 5 } },
        { label: "15 min break", action: "start_break", params: { minutes: 15 } },
        { label: "I'm good", action: "dismiss" },
      ],
      priority: "low",
    }),
  },
};

// Helper to get last break time
async function getLastBreakTime(ctx: UserContext): Promise<Date | null> {
  // This would query the breaks table for the most recent break
  // For now, return null to indicate no recent break tracked
  return null;
}

// Export wellbeing triggers
export const wellbeingTriggers: Trigger[] = [
  wellbeingCheckTrigger,
  focusProtectionTrigger,
  breakReminderTrigger,
];

// Focus protection utilities

// Check if user should be in "do not disturb" mode
export async function isDoNotDisturbActive(userId: string): Promise<boolean> {
  const db = getDb();

  // Check if user has an active focus session
  const session = db
    .prepare(
      `SELECT id FROM focus_sessions
       WHERE user_id = ? AND status = 'active'`
    )
    .get(userId);

  return !!session;
}

// Get focus session stats
export async function getFocusStats(
  userId: string
): Promise<{ totalMinutesToday: number; sessionsToday: number; averageLength: number }> {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = db
    .prepare(
      `SELECT
         COUNT(*) as sessions,
         COALESCE(SUM(
           CASE
             WHEN ended_at IS NOT NULL
             THEN (julianday(ended_at) - julianday(started_at)) * 24 * 60
             ELSE (julianday('now') - julianday(started_at)) * 24 * 60
           END
         ), 0) as total_minutes
       FROM focus_sessions
       WHERE user_id = ? AND started_at >= ?`
    )
    .get(userId, today.toISOString()) as {
    sessions: number;
    total_minutes: number;
  };

  return {
    totalMinutesToday: Math.round(stats.total_minutes),
    sessionsToday: stats.sessions,
    averageLength: stats.sessions > 0 ? Math.round(stats.total_minutes / stats.sessions) : 0,
  };
}

// Configure work hour protection
export interface WorkHourConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  enforcementLevel: "soft" | "hard"; // soft = warn, hard = block
}

export async function setWorkHourProtection(
  userId: string,
  config: WorkHourConfig
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO user_settings (user_id, key, value_json, updated_at)
     VALUES (?, 'work_hour_protection', ?, ?)
     ON CONFLICT (user_id, key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`
  ).run(userId, JSON.stringify(config), now);
}

export async function getWorkHourProtection(userId: string): Promise<WorkHourConfig | null> {
  const db = getDb();

  const row = db
    .prepare(`SELECT value_json FROM user_settings WHERE user_id = ? AND key = 'work_hour_protection'`)
    .get(userId) as { value_json: string } | undefined;

  return row ? JSON.parse(row.value_json) : null;
}
