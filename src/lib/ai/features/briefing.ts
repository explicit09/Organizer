import type {
  UserContext,
  Briefing,
  BriefingSection,
  SuggestedFocus,
  Insight,
  ContextItem,
} from "../context/types";
import { assembleFullContext } from "../context/assembler";

export interface BriefingConfig {
  includeCalendar: boolean;
  includePriorities: boolean;
  includeHabits: boolean;
  includeInsights: boolean;
  maxItems: number;
  verbosity: "brief" | "normal" | "detailed";
}

const defaultConfig: BriefingConfig = {
  includeCalendar: true,
  includePriorities: true,
  includeHabits: true,
  includeInsights: true,
  maxItems: 5,
  verbosity: "normal",
};

export function generateMorningBriefing(
  userId: string,
  config: Partial<BriefingConfig> = {}
): Briefing {
  const finalConfig = { ...defaultConfig, ...config };
  const context = assembleFullContext({ userId });

  const briefing: Briefing = {
    greeting: generateGreeting(context),
    date: formatDate(context.temporal.now),
    sections: [],
  };

  // Calendar section
  if (finalConfig.includeCalendar) {
    briefing.sections.push({
      title: "Today's Schedule",
      type: "calendar",
      content: generateCalendarSection(context, finalConfig),
    });
  }

  // Priority section
  if (finalConfig.includePriorities) {
    briefing.sections.push({
      title: "Top Priorities",
      type: "priorities",
      content: generatePrioritySection(context, finalConfig),
    });
  }

  // Habits section
  if (finalConfig.includeHabits && context.habits.todaysHabits.length > 0) {
    briefing.sections.push({
      title: "Habits",
      type: "habits",
      content: generateHabitsSection(context),
    });
  }

  // Insights section
  if (finalConfig.includeInsights) {
    briefing.sections.push({
      title: "Insights",
      type: "insights",
      content: generateInsightsSection(context),
    });
  }

  // Determine suggested focus
  briefing.suggestedFocus = determineSuggestedFocus(context);

  return briefing;
}

function generateGreeting(ctx: UserContext): string {
  const greetings: Record<string, string> = {
    early_morning: "Early bird! Here's what's ahead today.",
    morning: "Good morning! Ready to make today count?",
    midday: "Good afternoon! Here's where you stand.",
    afternoon: "Afternoon check-in. Let's finish strong.",
    evening: "Evening review. Here's how today went.",
    night: "Burning the midnight oil? Here's a quick overview.",
  };

  let greeting = greetings[ctx.temporal.timeOfDay];

  // Add streak acknowledgment
  if (ctx.workload.streakDays >= 7) {
    greeting += ` 🔥 ${ctx.workload.streakDays} day streak!`;
  }

  // Add workload warning
  if (ctx.workload.capacityUtilization > 1.2) {
    greeting += " Heads up - heavy day ahead.";
  }

  return greeting;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface CalendarSectionContent {
  meetings: Array<{
    title: string;
    time: string;
    duration: number;
  }>;
  freeBlocks: Array<{
    time: string;
    duration: number;
  }>;
  totalMeetingHours: number;
  nextMeeting?: {
    title: string;
    startsIn: number;
  };
}

function generateCalendarSection(
  ctx: UserContext,
  config: BriefingConfig
): CalendarSectionContent {
  const meetings = ctx.calendar.meetingsToday.map((m) => ({
    title: m.title,
    time: m.start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    duration: Math.round((m.end.getTime() - m.start.getTime()) / (1000 * 60)),
  }));

  const freeBlocks = ctx.calendar.freeBlocksToday
    .filter((b) => b.durationMinutes >= 30)
    .slice(0, config.maxItems)
    .map((b) => ({
      time: b.start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      duration: b.durationMinutes,
    }));

  return {
    meetings: meetings.slice(0, config.maxItems),
    freeBlocks,
    totalMeetingHours: ctx.calendar.totalMeetingHoursThisWeek,
    nextMeeting: ctx.calendar.nextMeeting
      ? {
          title: ctx.calendar.nextMeeting.title,
          startsIn: ctx.calendar.minutesUntilNextMeeting || 0,
        }
      : undefined,
  };
}

interface PrioritySectionContent {
  items: Array<{
    item: ContextItem;
    reason: string;
    urgency: "critical" | "high" | "medium";
    suggestion?: string;
  }>;
  totalCritical: number;
  totalOpen: number;
}

function generatePrioritySection(
  ctx: UserContext,
  config: BriefingConfig
): PrioritySectionContent {
  const priorities: Array<{
    item: ContextItem;
    reason: string;
    urgency: "critical" | "high" | "medium";
    suggestion?: string;
  }> = [];

  const now = new Date();

  // 1. Overdue items first
  for (const item of ctx.priorities.criticalItems) {
    if (item.dueAt && new Date(item.dueAt) < now) {
      priorities.push({
        item,
        reason: "Overdue",
        urgency: "critical",
        suggestion: "Handle immediately or reschedule",
      });
    }
  }

  // 2. Blocking items
  for (const item of ctx.priorities.blockingItems) {
    if (!priorities.find((p) => p.item.id === item.id)) {
      const blockedCount = ctx.priorities.blockedItems.length;
      priorities.push({
        item,
        reason: `Blocks ${blockedCount} other task${blockedCount > 1 ? "s" : ""}`,
        urgency: "high",
        suggestion: "Complete to unblock other work",
      });
    }
  }

  // 3. Due today
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  for (const item of ctx.priorities.criticalItems) {
    if (
      item.dueAt &&
      new Date(item.dueAt) >= now &&
      new Date(item.dueAt) <= todayEnd &&
      !priorities.find((p) => p.item.id === item.id)
    ) {
      priorities.push({
        item,
        reason: "Due today",
        urgency: "high",
      });
    }
  }

  // 4. At-risk deadlines
  for (const item of ctx.priorities.atRiskDeadlines) {
    if (!priorities.find((p) => p.item.id === item.id)) {
      priorities.push({
        item,
        reason: "Deadline at risk",
        urgency: "medium",
        suggestion: "Needs attention soon",
      });
    }
  }

  return {
    items: priorities.slice(0, config.maxItems),
    totalCritical: priorities.filter((p) => p.urgency === "critical").length,
    totalOpen: ctx.workload.totalOpenItems,
  };
}

interface HabitsSectionContent {
  habits: Array<{
    title: string;
    completed: boolean;
    streak: number;
  }>;
  completionRate: number;
  atRiskStreaks: Array<{
    title: string;
    streak: number;
  }>;
}

function generateHabitsSection(ctx: UserContext): HabitsSectionContent {
  const atRiskStreaks = ctx.habits.todaysHabits
    .filter((h) => h.streak >= 5 && !h.completed)
    .map((h) => ({
      title: h.title,
      streak: h.streak,
    }));

  return {
    habits: ctx.habits.todaysHabits.map((h) => ({
      title: h.title,
      completed: h.completed,
      streak: h.streak,
    })),
    completionRate: ctx.habits.habitCompletionRate,
    atRiskStreaks,
  };
}

interface InsightsSectionContent {
  insights: Insight[];
}

function generateInsightsSection(ctx: UserContext): InsightsSectionContent {
  const insights: Insight[] = [];

  // Workload insight
  if (ctx.workload.capacityUtilization > 1.0) {
    const excess = Math.round(
      (ctx.workload.capacityUtilization - 1) * ctx.workload.availableHoursThisWeek
    );
    insights.push({
      type: "warning",
      title: "Overcommitted",
      message: `You have ~${excess} more hours of work than available time. Consider deferring ${Math.ceil(excess / 2)} tasks.`,
      action: {
        label: "Help me prioritize",
        prompt: "Help me decide which tasks to defer this week",
      },
    });
  }

  // Goal alignment insight
  if (ctx.goals.alignedWorkThisWeek < 0.5 && ctx.goals.activeGoals.length > 0) {
    insights.push({
      type: "observation",
      title: "Goal drift detected",
      message: `Only ${Math.round(ctx.goals.alignedWorkThisWeek * 100)}% of this week's work aligns with your stated goals.`,
      action: {
        label: "Realign my work",
        prompt: "Help me align my tasks with my goals",
      },
    });
  }

  // Productive time insight
  if (ctx.patterns.productiveHours.length > 0) {
    const currentHour = ctx.temporal.now.getHours();
    const inProductiveTime = ctx.patterns.productiveHours.some((h) => {
      const [start] = h.split("-").map((t) => parseInt(t));
      return Math.abs(currentHour - start) <= 1;
    });

    if (inProductiveTime && ctx.priorities.criticalItems.length > 0) {
      insights.push({
        type: "suggestion",
        title: "Prime time",
        message: "You're in your peak productivity hours. Tackle something challenging!",
        action: {
          label: "Start focus session",
          prompt: `Start a focus session on "${ctx.priorities.criticalItems[0].title}"`,
        },
      });
    }
  }

  // Streak protection
  const atRiskStreaks = ctx.habits.todaysHabits.filter(
    (h) => h.streak >= 5 && !h.completed
  );
  if (atRiskStreaks.length > 0) {
    insights.push({
      type: "warning",
      title: "Streak at risk",
      message: `Your ${atRiskStreaks[0].streak}-day streak is at risk! Don't forget today's habit.`,
      action: {
        label: "Log habit",
        prompt: "Log my habit completion",
      },
    });
  }

  // Celebration
  if (ctx.workload.completedToday >= 5) {
    insights.push({
      type: "celebration",
      title: "Great progress!",
      message: `You've already completed ${ctx.workload.completedToday} items today. Keep it up!`,
    });
  }

  return { insights };
}

function determineSuggestedFocus(ctx: UserContext): SuggestedFocus | undefined {
  // Priority order:
  // 1. Overdue blocking items
  // 2. Due today items
  // 3. High priority blocking items
  // 4. Quick wins

  for (const item of ctx.priorities.blockingItems) {
    if (item.dueAt && new Date(item.dueAt) < ctx.temporal.now) {
      return {
        item,
        reason: "Overdue and blocking other work",
        estimatedMinutes: item.estimatedMinutes || 60,
      };
    }
  }

  for (const item of ctx.priorities.criticalItems) {
    if (item.dueAt) {
      const todayEnd = new Date(ctx.temporal.now);
      todayEnd.setHours(23, 59, 59, 999);
      if (new Date(item.dueAt) <= todayEnd) {
        return {
          item,
          reason: "Due today",
          estimatedMinutes: item.estimatedMinutes || 60,
        };
      }
    }
  }

  if (ctx.priorities.blockingItems.length > 0) {
    const item = ctx.priorities.blockingItems[0];
    return {
      item,
      reason: "Unblocks other work",
      estimatedMinutes: item.estimatedMinutes || 60,
    };
  }

  if (ctx.priorities.quickWins.length > 0) {
    const item = ctx.priorities.quickWins[0];
    return {
      item,
      reason: "Quick win to build momentum",
      estimatedMinutes: item.estimatedMinutes || 30,
    };
  }

  return undefined;
}
