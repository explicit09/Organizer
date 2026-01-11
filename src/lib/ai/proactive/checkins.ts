// Scheduled Check-ins System
// Morning briefings, evening wrap-ups, weekly reviews

import type {
  CheckinType,
  CheckinConfig,
  CheckinContent,
  CheckinSection,
  SuggestionAction,
  Trigger,
  TriggerDetails,
  ProactiveMessage,
} from "./types";
import type { UserContext, ContextItem } from "../context/types";
import { assembleFullContext } from "../context/assembler";
import { getDb } from "../../db";
import { randomUUID } from "crypto";

// Default check-in configurations
const DEFAULT_CHECKIN_CONFIGS: Record<CheckinType, Omit<CheckinConfig, "enabled" | "channels">> = {
  morning_briefing: {
    type: "morning_briefing",
    preferredTime: "08:00",
  },
  midday_pulse: {
    type: "midday_pulse",
    preferredTime: "12:00",
  },
  evening_wrapup: {
    type: "evening_wrapup",
    preferredTime: "18:00",
  },
  weekly_review: {
    type: "weekly_review",
    preferredTime: "09:00",
    preferredDay: "monday",
  },
  monthly_reflection: {
    type: "monthly_reflection",
    preferredTime: "10:00",
    preferredDay: "1", // First day of month
  },
};

// Generate morning briefing content
export async function generateMorningBriefing(userId: string): Promise<CheckinContent> {
  const context = assembleFullContext({ userId });

  const greeting = getGreeting(context.temporal.timeOfDay);
  const sections: CheckinSection[] = [];

  // Today's calendar section
  if (context.calendar.meetingsToday.length > 0) {
    sections.push({
      title: "Today's Schedule",
      content: formatMeetingList(context.calendar.meetingsToday),
    });
  }

  // Priority items section
  if (context.priorities.criticalItems.length > 0) {
    sections.push({
      title: "Priority Focus",
      content: formatPriorityItems(context.priorities.criticalItems.slice(0, 3)),
    });
  }

  // Deadlines section
  const dueTodayItems = context.priorities.criticalItems.filter((item) => {
    if (!item.dueAt) return false;
    const due = new Date(item.dueAt);
    const today = new Date();
    return (
      due.getFullYear() === today.getFullYear() &&
      due.getMonth() === today.getMonth() &&
      due.getDate() === today.getDate()
    );
  });

  if (dueTodayItems.length > 0) {
    sections.push({
      title: "Due Today",
      content: `You have ${dueTodayItems.length} item${dueTodayItems.length > 1 ? "s" : ""} due today:\n${dueTodayItems.map((i) => `- ${i.title}`).join("\n")}`,
    });
  }

  // Habits section
  if (context.habits.todaysHabits.length > 0) {
    const pending = context.habits.todaysHabits.filter((h) => !h.completed);
    sections.push({
      title: "Today's Habits",
      content:
        pending.length > 0
          ? `${pending.length} habits to complete:\n${pending.map((h) => `- ${h.title}`).join("\n")}`
          : "All habits completed!",
    });
  }

  // Workload insight
  sections.push({
    title: "Workload",
    content: formatWorkloadInsight(context),
  });

  // Suggested actions
  const suggestedActions = generateMorningSuggestions(context);

  return {
    greeting,
    sections,
    suggestedActions,
    closingMessage: "Have a productive day!",
  };
}

// Generate evening wrap-up content
export async function generateEveningWrapup(userId: string): Promise<CheckinContent> {
  const context = assembleFullContext({ userId });

  const greeting = "Here's your day in review:";
  const sections: CheckinSection[] = [];

  // Completed today
  sections.push({
    title: "Completed Today",
    content:
      context.workload.completedToday > 0
        ? `You completed ${context.workload.completedToday} items today. Great work!`
        : "No tasks completed today. Tomorrow is a new opportunity!",
  });

  // Streak status
  if (context.workload.streakDays > 0) {
    sections.push({
      title: "Productivity Streak",
      content: `You're on a ${context.workload.streakDays}-day streak!`,
    });
  }

  // Habit completion
  const completedHabits = context.habits.todaysHabits.filter((h) => h.completed);
  const totalHabits = context.habits.todaysHabits.length;
  if (totalHabits > 0) {
    sections.push({
      title: "Habits",
      content: `${completedHabits.length}/${totalHabits} habits completed today.`,
    });
  }

  // Tomorrow preview
  const tomorrowItems = getTomorrowItems(context);
  if (tomorrowItems.length > 0) {
    sections.push({
      title: "Tomorrow's Preview",
      content: `${tomorrowItems.length} items scheduled for tomorrow:\n${tomorrowItems.slice(0, 3).map((i) => `- ${i.title}`).join("\n")}`,
    });
  }

  // Overdue items
  if (context.workload.overdueCount > 0) {
    sections.push({
      title: "Attention Needed",
      content: `You have ${context.workload.overdueCount} overdue items that need attention.`,
    });
  }

  const suggestedActions = generateEveningSuggestions(context);

  return {
    greeting,
    sections,
    suggestedActions,
    closingMessage: "Rest well and recharge!",
  };
}

// Generate weekly review content
export async function generateWeeklyReview(userId: string): Promise<CheckinContent> {
  const context = assembleFullContext({ userId });

  const greeting = "Weekly Review";
  const sections: CheckinSection[] = [];

  // Week summary
  sections.push({
    title: "This Week's Summary",
    content:
      `Completed: ${context.workload.completedThisWeek} items\n` +
      `Current streak: ${context.workload.streakDays} days\n` +
      `Open items: ${context.workload.totalOpenItems}`,
  });

  // Capacity utilization
  sections.push({
    title: "Capacity",
    content:
      context.workload.capacityUtilization > 100
        ? `You were at ${context.workload.capacityUtilization}% capacity this week - consider reducing commitments.`
        : `You were at ${context.workload.capacityUtilization}% capacity this week.`,
  });

  // Goal progress
  if (context.goals.activeGoals.length > 0) {
    const goalSummary = context.goals.activeGoals
      .map((g) => {
        const progress = context.goals.goalProgress[g.id] || 0;
        return `- ${g.title}: ${progress}%`;
      })
      .join("\n");
    sections.push({
      title: "Goal Progress",
      content: goalSummary,
    });
  }

  // Patterns insight
  sections.push({
    title: "Productivity Patterns",
    content:
      `Most productive hours: ${context.patterns.productiveHours.slice(0, 3).join(", ")}\n` +
      `Estimation accuracy: ${context.patterns.estimationAccuracy}%`,
  });

  // Neglected areas
  if (context.goals.neglectedAreas.length > 0) {
    sections.push({
      title: "Areas Needing Attention",
      content: `These areas had little activity:\n${context.goals.neglectedAreas.map((a) => `- ${a}`).join("\n")}`,
    });
  }

  const suggestedActions = generateWeeklySuggestions(context);

  return {
    greeting,
    sections,
    suggestedActions,
    closingMessage: "Let's make next week even better!",
  };
}

// Check-in Triggers

// Morning Briefing Trigger
export const morningBriefingTrigger: Trigger = {
  type: "morning_briefing",
  priority: "low",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Check if it's morning and user hasn't received briefing today
      return ctx.temporal.timeOfDay === "morning";
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      return {
        todayMeetings: ctx.calendar.meetingsToday.length,
        criticalItems: ctx.priorities.criticalItems.length,
        totalPending: ctx.habits.todaysHabits.filter((h) => !h.completed).length,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Good Morning",
      message:
        `You have ${details.todayMeetings || 0} meetings, ${details.criticalItems || 0} priority items, ` +
        `and ${details.totalPending || 0} habits today.`,
      suggestions: [
        { label: "View briefing", action: "show_morning_briefing", params: {} },
        { label: "Start day", action: "navigate", params: { to: "/dashboard" } },
        { label: "Later", action: "dismiss" },
      ],
      priority: "low",
    }),
  },
};

// Evening Wrap-up Trigger
export const eveningWrapupTrigger: Trigger = {
  type: "evening_wrapup",
  priority: "low",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      return ctx.temporal.timeOfDay === "evening";
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      return {
        completedToday: ctx.workload.completedToday,
        streakDays: ctx.workload.streakDays,
        totalPending: ctx.habits.todaysHabits.filter((h) => !h.completed).length,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Day Wrap-up",
      message:
        `You completed ${details.completedToday || 0} items today. ` +
        ((details.totalPending || 0) > 0
          ? `Don't forget your ${details.totalPending} remaining habits!`
          : "All habits done!"),
      suggestions: [
        { label: "View summary", action: "show_evening_wrapup", params: {} },
        { label: "Plan tomorrow", action: "navigate", params: { to: "/tasks?view=tomorrow" } },
        { label: "Done", action: "dismiss" },
      ],
      priority: "low",
    }),
  },
};

// Weekly Review Trigger
export const weeklyReviewTrigger: Trigger = {
  type: "weekly_review",
  priority: "low",
  cooldown: 7 * 24 * 60, // Once per week
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger on Monday morning
      return ctx.temporal.dayOfWeek === "Monday" && ctx.temporal.timeOfDay === "morning";
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      return {
        completedThisWeek: ctx.workload.completedThisWeek,
        capacityUtilization: ctx.workload.capacityUtilization,
        goalCount: ctx.goals.activeGoals.length,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Weekly Review",
      message: `Last week you completed ${details.completedThisWeek || 0} items at ${details.capacityUtilization || 0}% capacity.`,
      suggestions: [
        { label: "View review", action: "show_weekly_review", params: {} },
        { label: "Plan week", action: "navigate", params: { to: "/tasks?view=week" } },
        { label: "Later", action: "dismiss" },
      ],
      priority: "low",
    }),
  },
};

// Focus Check-in Trigger
export const focusCheckinTrigger: Trigger = {
  type: "focus_checkin",
  priority: "low",
  cooldown: 30, // Every 30 minutes during focus
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Check if user is in a focus session
      const session = ctx.recentActivity.currentFocusSession;
      if (!session) return false;

      // Trigger after 25 minutes (Pomodoro-style)
      const sessionMinutes = session.duration;
      return sessionMinutes >= 25 && sessionMinutes % 25 < 5;
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
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Focus Check-in",
      message: `You've been focused for ${details.duration || 0} minutes. How's it going?`,
      suggestions: [
        { label: "Keep going", action: "dismiss" },
        { label: "Take a break", action: "start_break", params: { minutes: 5 } },
        { label: "End session", action: "end_focus", params: { sessionId: details.session?.id } },
      ],
      priority: "low",
    }),
  },
};

// Helper functions

function getGreeting(timeOfDay: string): string {
  switch (timeOfDay) {
    case "early_morning":
      return "Early bird! Here's what's planned for today:";
    case "morning":
      return "Good morning! Here's your day at a glance:";
    case "midday":
      return "Good afternoon! Here's where things stand:";
    default:
      return "Here's your current status:";
  }
}

function formatMeetingList(
  meetings: Array<{ title: string; start: Date; end: Date }>
): string {
  return meetings
    .map((m) => {
      const startTime = m.start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `- ${startTime}: ${m.title}`;
    })
    .join("\n");
}

function formatPriorityItems(items: ContextItem[]): string {
  return items
    .map((item) => {
      const estimate = item.estimatedMinutes
        ? ` (~${item.estimatedMinutes}min)`
        : "";
      return `- ${item.title}${estimate}`;
    })
    .join("\n");
}

function formatWorkloadInsight(context: UserContext): string {
  const utilization = context.workload.capacityUtilization;

  if (utilization > 120) {
    return `You're at ${utilization}% capacity. Consider deferring some items.`;
  } else if (utilization > 100) {
    return `You're at ${utilization}% capacity. Prioritize carefully today.`;
  } else if (utilization > 80) {
    return `You're at ${utilization}% capacity. Good balance!`;
  } else {
    return `You're at ${utilization}% capacity. Room for more if needed.`;
  }
}

function getTomorrowItems(context: UserContext): ContextItem[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return context.priorities.criticalItems.filter((item) => {
    if (!item.dueAt) return false;
    const due = new Date(item.dueAt);
    return (
      due.getFullYear() === tomorrow.getFullYear() &&
      due.getMonth() === tomorrow.getMonth() &&
      due.getDate() === tomorrow.getDate()
    );
  });
}

function generateMorningSuggestions(context: UserContext): SuggestionAction[] {
  const suggestions: SuggestionAction[] = [];

  // Suggest starting with most important item
  const topItem = context.priorities.criticalItems[0];
  if (topItem) {
    suggestions.push({
      label: "Start top priority",
      action: "start_focus",
      params: { itemId: topItem.id },
    });
  }

  // Suggest quick wins if many items
  if (context.priorities.quickWins.length > 2) {
    suggestions.push({
      label: "Knock out quick wins",
      action: "show_quick_wins",
      params: {},
    });
  }

  // Always offer to view full list
  suggestions.push({
    label: "View all tasks",
    action: "navigate",
    params: { to: "/tasks" },
  });

  return suggestions;
}

function generateEveningSuggestions(context: UserContext): SuggestionAction[] {
  const suggestions: SuggestionAction[] = [];

  // Pending habits
  const pendingHabits = context.habits.todaysHabits.filter((h) => !h.completed);
  if (pendingHabits.length > 0) {
    suggestions.push({
      label: "Complete habits",
      action: "navigate",
      params: { to: "/habits" },
    });
  }

  // Overdue items
  if (context.workload.overdueCount > 0) {
    suggestions.push({
      label: "Review overdue",
      action: "navigate",
      params: { to: "/tasks?filter=overdue" },
    });
  }

  // Plan tomorrow
  suggestions.push({
    label: "Plan tomorrow",
    action: "navigate",
    params: { to: "/tasks?view=tomorrow" },
  });

  return suggestions;
}

function generateWeeklySuggestions(context: UserContext): SuggestionAction[] {
  const suggestions: SuggestionAction[] = [];

  // Review goals
  suggestions.push({
    label: "Review goals",
    action: "navigate",
    params: { to: "/goals" },
  });

  // Address neglected areas
  if (context.goals.neglectedAreas.length > 0) {
    suggestions.push({
      label: "Balance workload",
      action: "suggest_aligned_tasks",
      params: { areas: context.goals.neglectedAreas },
    });
  }

  // Plan the week
  suggestions.push({
    label: "Plan this week",
    action: "navigate",
    params: { to: "/tasks?view=week" },
  });

  return suggestions;
}

// Get user's check-in configurations
export async function getCheckinConfigs(userId: string): Promise<CheckinConfig[]> {
  const db = getDb();

  const rows = db
    .prepare(`SELECT * FROM checkin_configs WHERE user_id = ?`)
    .all(userId) as Array<{
    type: CheckinType;
    preferred_time: string;
    preferred_day: string | null;
    enabled: number;
    channels_json: string;
  }>;

  // Return configured or defaults
  const configs: CheckinConfig[] = [];

  for (const type of Object.keys(DEFAULT_CHECKIN_CONFIGS) as CheckinType[]) {
    const row = rows.find((r) => r.type === type);

    if (row) {
      configs.push({
        type,
        preferredTime: row.preferred_time,
        preferredDay: row.preferred_day || undefined,
        enabled: row.enabled === 1,
        channels: JSON.parse(row.channels_json),
      });
    } else {
      configs.push({
        ...DEFAULT_CHECKIN_CONFIGS[type],
        enabled: true,
        channels: ["in_app"],
      });
    }
  }

  return configs;
}

// Update check-in configuration
export async function updateCheckinConfig(
  userId: string,
  config: CheckinConfig
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO checkin_configs
     (user_id, type, preferred_time, preferred_day, enabled, channels_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, type) DO UPDATE SET
       preferred_time = excluded.preferred_time,
       preferred_day = excluded.preferred_day,
       enabled = excluded.enabled,
       channels_json = excluded.channels_json,
       updated_at = excluded.updated_at`
  ).run(
    userId,
    config.type,
    config.preferredTime,
    config.preferredDay || null,
    config.enabled ? 1 : 0,
    JSON.stringify(config.channels),
    now
  );
}

// Export check-in triggers
export const checkinTriggers: Trigger[] = [
  morningBriefingTrigger,
  eveningWrapupTrigger,
  weeklyReviewTrigger,
  focusCheckinTrigger,
];
