// Habit and Streak Triggers

import type { Trigger, TriggerDetails, ProactiveMessage, HabitInfo } from "../types";
import type { UserContext, HabitWithStatus } from "../../context/types";

// Habit Reminder Trigger
// Fires when user has pending habits they haven't completed today
export const habitReminderTrigger: Trigger = {
  type: "habit_reminder",
  priority: "low",
  cooldown: 6 * 60, // Every 6 hours
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if there are incomplete habits and it's past midday
      const pendingHabits = ctx.habits.todaysHabits.filter((h) => !h.completed);
      const hour = new Date().getHours();

      // Only remind after noon to give user time to complete naturally
      return pendingHabits.length > 0 && hour >= 12;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const pendingHabits: HabitInfo[] = ctx.habits.todaysHabits
        .filter((h) => !h.completed)
        .map((h) => ({
          id: h.id,
          name: h.title,
          completedToday: false,
        }));

      // Find habits with active streaks that are at risk
      const streaksAtRisk = pendingHabits.filter((h) => {
        const streak = ctx.habits.streaks[h.id];
        return streak && streak > 3; // Only warn about streaks longer than 3 days
      });

      return {
        pendingHabits,
        totalPending: pendingHabits.length,
        habits: pendingHabits.map((h) => ({
          habit: h,
          streakDays: ctx.habits.streaks[h.id] || 0,
        })),
        longestStreak: Math.max(0, ...Object.values(ctx.habits.streaks)),
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => {
      const count = details.totalPending || 0;
      const hasStreaks = details.habits?.some((h) => h.streakDays > 0);

      return {
        title: count === 1 ? "Habit Pending" : `${count} Habits Pending`,
        message:
          count === 1
            ? `Don't forget to complete "${details.pendingHabits?.[0]?.name}" today.`
            : `You have ${count} habits left to complete today.` +
              (hasStreaks ? " Some have active streaks." : ""),
        suggestions: [
          {
            label: "View habits",
            action: "navigate",
            params: { to: "/habits" },
          },
          {
            label: "Log now",
            action: "quick_habit_log",
            params: { habitIds: details.pendingHabits?.map((h) => h.id) },
          },
          { label: "Skip today", action: "dismiss" },
        ],
        priority: "low",
      };
    },
  },
};

// Streak At Risk Trigger
// Fires when a significant streak might be broken
export const streakAtRiskTrigger: Trigger = {
  type: "streak_at_risk",
  priority: "medium",
  cooldown: 4 * 60, // Every 4 hours
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      const hour = new Date().getHours();

      // Only trigger in evening (after 6pm) when streaks are genuinely at risk
      if (hour < 18) return false;

      // Check for incomplete habits with significant streaks
      return ctx.habits.todaysHabits.some((h) => {
        const streak = ctx.habits.streaks[h.id];
        return !h.completed && streak && streak >= 7; // 7+ day streaks
      });
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const atRiskHabits = ctx.habits.todaysHabits
        .filter((h) => {
          const streak = ctx.habits.streaks[h.id];
          return !h.completed && streak && streak >= 7;
        })
        .map((h) => ({
          habit: {
            id: h.id,
            name: h.title,
            completedToday: false,
          },
          streakDays: ctx.habits.streaks[h.id] || 0,
        }));

      // Sort by streak length (longest first)
      atRiskHabits.sort((a, b) => b.streakDays - a.streakDays);

      return {
        habits: atRiskHabits,
        longestStreak: atRiskHabits[0]?.streakDays || 0,
        totalAtRisk: atRiskHabits.length,
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => {
      const longest = details.habits?.[0];
      const count = details.totalAtRisk || 0;

      if (count === 1 && longest) {
        return {
          title: "Streak at Risk",
          message: `Your ${longest.streakDays}-day streak for "${longest.habit.name}" will break if not completed today!`,
          suggestions: [
            {
              label: "Complete now",
              action: "complete_habit",
              params: { habitId: longest.habit.id },
            },
            {
              label: "Set reminder",
              action: "set_reminder",
              params: { habitId: longest.habit.id, minutes: 60 },
            },
            { label: "Let it break", action: "dismiss" },
          ],
          priority: "medium",
        };
      }

      return {
        title: `${count} Streaks at Risk`,
        message: `You have ${count} habits with 7+ day streaks that will break today. The longest is ${longest?.streakDays || 0} days.`,
        suggestions: [
          {
            label: "Complete all",
            action: "batch_complete_habits",
            params: { habitIds: details.habits?.map((h) => h.habit.id) },
          },
          {
            label: "View habits",
            action: "navigate",
            params: { to: "/habits" },
          },
          { label: "I'll handle it", action: "dismiss" },
        ],
        priority: "medium",
      };
    },
  },
};

// Item Completed Trigger (for celebrations/momentum)
// Fires when user completes an item to offer next action
export const itemCompletedTrigger: Trigger = {
  type: "item_completed",
  priority: "low",
  cooldown: 5, // 5 minutes between completions
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext, event) => {
      return event?.type === "item_completed";
    },

    getDetails: async (ctx: UserContext, event): Promise<TriggerDetails> => {
      const completedItem = event?.data?.item as
        | (typeof ctx.priorities.criticalItems)[0]
        | undefined;

      // Find related items that might be unblocked
      const unblockedItems = ctx.priorities.blockedItems.filter((blocked) => {
        // Check if this item was blocking anything
        // Simplified - in practice would check dependency graph
        return false; // Placeholder
      });

      // Find next suggested item
      const nextItem = findNextSuggestedItem(ctx, completedItem);

      return {
        completedItem,
        unblockedItems,
        totalUnblocked: unblockedItems.length,
        suggestedItem: nextItem,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => {
      const completed = details.completedItem;
      const hasUnblocked = (details.totalUnblocked || 0) > 0;
      const next = details.suggestedItem;

      let message = `"${completed?.title}" marked complete!`;

      if (hasUnblocked) {
        message += ` This unblocked ${details.totalUnblocked} other items.`;
      }

      return {
        title: "Task Complete",
        message,
        suggestions: next
          ? [
              {
                label: "Work on next",
                action: "start_focus",
                params: { itemId: next.id },
              },
              {
                label: "Take a break",
                action: "start_break",
              },
              { label: "Done for now", action: "dismiss" },
            ]
          : [
              {
                label: "Pick next task",
                action: "navigate",
                params: { to: "/tasks" },
              },
              { label: "Take a break", action: "start_break" },
            ],
        priority: "low",
      };
    },
  },
};

// Long Inactive Trigger
// Fires when user hasn't been active for a while
export const longInactiveTrigger: Trigger = {
  type: "long_inactive",
  priority: "low",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      if (!ctx.recentActivity.lastActiveAt) return false;

      const hoursSinceActive =
        (Date.now() - ctx.recentActivity.lastActiveAt.getTime()) / (1000 * 60 * 60);

      // Trigger if inactive for more than 48 hours (excluding weekends)
      return hoursSinceActive > 48 && !ctx.temporal.isWeekend;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const lastActive = ctx.recentActivity.lastActiveAt;
      const hoursSince = lastActive
        ? (Date.now() - lastActive.getTime()) / (1000 * 60 * 60)
        : 0;

      return {
        duration: Math.round(hoursSince),
        lastCompletedItem: ctx.recentActivity.lastCompletedItem || undefined,
        pendingCount: ctx.workload.totalOpenItems,
        overdueCount: ctx.workload.overdueCount,
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => {
      const days = Math.round((details.duration || 0) / 24);
      const hasOverdue = (details.overdueCount as number) > 0;

      return {
        title: "Welcome Back",
        message:
          `It's been ${days} days since your last activity. ` +
          (hasOverdue
            ? `You have ${details.overdueCount} overdue items to review.`
            : `You have ${details.pendingCount} items waiting.`),
        suggestions: hasOverdue
          ? [
              {
                label: "Review overdue",
                action: "navigate",
                params: { to: "/tasks?filter=overdue" },
              },
              {
                label: "Get caught up",
                action: "create_catchup_plan",
                params: {},
              },
              { label: "Start fresh", action: "dismiss" },
            ]
          : [
              {
                label: "See what's next",
                action: "navigate",
                params: { to: "/tasks" },
              },
              {
                label: "Quick review",
                action: "show_morning_briefing",
                params: {},
              },
            ],
        priority: "low",
      };
    },
  },
};

// Helper to find next suggested item after completion
function findNextSuggestedItem(
  ctx: UserContext,
  completedItem?: { projectId?: string; area?: string }
): (typeof ctx.priorities.criticalItems)[0] | undefined {
  // Prefer items from the same project/area
  if (completedItem?.projectId) {
    const sameProject = ctx.priorities.criticalItems.find(
      (item) => item.projectId === completedItem.projectId
    );
    if (sameProject) return sameProject;
  }

  if (completedItem?.area) {
    const sameArea = ctx.priorities.criticalItems.find(
      (item) => item.area === completedItem.area
    );
    if (sameArea) return sameArea;
  }

  // Otherwise return next critical item or quick win
  return ctx.priorities.criticalItems[0] || ctx.priorities.quickWins[0];
}

// Export all habit triggers
export const habitTriggers: Trigger[] = [
  habitReminderTrigger,
  streakAtRiskTrigger,
  itemCompletedTrigger,
  longInactiveTrigger,
];
