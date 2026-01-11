// Deadline-related Triggers

import type { Trigger, TriggerDetails, ProactiveMessage } from "../types";
import type { UserContext, ContextItem } from "../../context/types";

// Helper to calculate hours until due
function hoursUntilDue(dueAt: string): number {
  const due = new Date(dueAt);
  const now = new Date();
  return (due.getTime() - now.getTime()) / (1000 * 60 * 60);
}

// Helper to format relative time
function formatRelativeTime(dueAt: string): string {
  const hours = hoursUntilDue(dueAt);

  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 1) return `${Math.round(absHours * 60)} minutes ago`;
    if (absHours < 24) return `${Math.round(absHours)} hours ago`;
    return `${Math.round(absHours / 24)} days ago`;
  }

  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${Math.round(hours)} hours`;
  if (hours < 48) return "tomorrow";
  return `${Math.round(hours / 24)} days`;
}

// Deadline Approaching Trigger
// Fires when a deadline is getting close but still achievable
export const deadlineApproachingTrigger: Trigger = {
  type: "deadline_approaching",
  priority: "medium",
  cooldown: 24 * 60, // Once per day per user
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      const approachingItems = ctx.priorities.criticalItems.filter((item) => {
        if (!item.dueAt) return false;
        const hours = hoursUntilDue(item.dueAt);
        const estimatedHours = (item.estimatedMinutes || 60) / 60;

        // Trigger if less than 2x estimated time + 24h remaining
        return hours > 0 && hours < estimatedHours * 2 + 24;
      });

      return approachingItems.length > 0;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const items = ctx.priorities.criticalItems.filter((item) => {
        if (!item.dueAt) return false;
        const hours = hoursUntilDue(item.dueAt);
        const estimatedHours = (item.estimatedMinutes || 60) / 60;
        return hours > 0 && hours < estimatedHours * 2 + 24;
      });

      // Sort by urgency
      items.sort((a, b) => {
        const hoursA = a.dueAt ? hoursUntilDue(a.dueAt) : Infinity;
        const hoursB = b.dueAt ? hoursUntilDue(b.dueAt) : Infinity;
        return hoursA - hoursB;
      });

      return {
        items,
        mostUrgent: items[0],
        totalAtRisk: items.length,
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Deadline Approaching",
      message:
        `"${details.mostUrgent?.title}" is due in ${formatRelativeTime(details.mostUrgent?.dueAt || "")}. ` +
        `You might need to start soon to finish on time.`,
      suggestions: [
        {
          label: "Start now",
          action: "start_focus",
          params: { itemId: details.mostUrgent?.id },
        },
        {
          label: "Reschedule",
          action: "suggest_reschedule",
          params: { itemId: details.mostUrgent?.id },
        },
        { label: "I've got it", action: "dismiss" },
      ],
      priority: "medium",
    }),
  },
};

// Deadline At Risk Trigger
// Fires when based on current pace, a deadline likely won't be met
export const deadlineAtRiskTrigger: Trigger = {
  type: "deadline_at_risk",
  priority: "high",
  cooldown: 12 * 60, // Twice per day
  userCanDisable: false, // Critical - always notify

  condition: {
    evaluate: async (ctx: UserContext) => {
      return ctx.priorities.atRiskDeadlines.length > 0;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const atRisk = ctx.priorities.atRiskDeadlines;

      // Calculate cascade impact
      const blockedByAtRisk = ctx.priorities.blockedItems.filter((blocked) =>
        atRisk.some((risky) => isBlockedBy(blocked, risky, ctx))
      );

      return {
        items: atRisk,
        mostCritical: atRisk[0],
        cascadeImpact: blockedByAtRisk.length,
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Deadline at Risk",
      message:
        `Based on your current pace, "${details.mostCritical?.title}" likely won't be finished by ${formatDueDate(details.mostCritical?.dueAt || "")}.` +
        (details.cascadeImpact && details.cascadeImpact > 0
          ? ` This affects ${details.cascadeImpact} other tasks.`
          : ""),
      suggestions: [
        {
          label: "Help me catch up",
          action: "create_catchup_plan",
          params: { itemId: details.mostCritical?.id },
        },
        {
          label: "Extend deadline",
          action: "suggest_reschedule",
          params: { itemId: details.mostCritical?.id, reason: "at_risk" },
        },
        {
          label: "Reduce scope",
          action: "discuss_scope",
          params: { itemId: details.mostCritical?.id },
        },
        { label: "I'll handle it", action: "dismiss" },
      ],
      priority: "high",
    }),
  },
};

// Item Overdue Trigger
// Fires when an item has passed its due date
export const itemOverdueTrigger: Trigger = {
  type: "item_overdue",
  priority: "high",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      const overdueItems = ctx.priorities.criticalItems.filter((item) => {
        if (!item.dueAt) return false;
        return hoursUntilDue(item.dueAt) < 0 && item.status !== "completed";
      });

      return overdueItems.length > 0;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const overdueItems = ctx.priorities.criticalItems.filter((item) => {
        if (!item.dueAt) return false;
        return hoursUntilDue(item.dueAt) < 0 && item.status !== "completed";
      });

      // Sort by how overdue (most overdue first)
      overdueItems.sort((a, b) => {
        const hoursA = a.dueAt ? hoursUntilDue(a.dueAt) : 0;
        const hoursB = b.dueAt ? hoursUntilDue(b.dueAt) : 0;
        return hoursA - hoursB;
      });

      return {
        items: overdueItems,
        mostCritical: overdueItems[0],
        totalAtRisk: overdueItems.length,
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => {
      const count = details.totalAtRisk || 0;
      const mostOverdue = details.mostCritical;

      if (count === 1) {
        return {
          title: "Overdue Item",
          message: `"${mostOverdue?.title}" was due ${formatRelativeTime(mostOverdue?.dueAt || "")}. Would you like to reschedule or complete it now?`,
          suggestions: [
            {
              label: "Complete now",
              action: "start_focus",
              params: { itemId: mostOverdue?.id },
            },
            {
              label: "Reschedule",
              action: "suggest_reschedule",
              params: { itemId: mostOverdue?.id, reason: "missed_deadline" },
            },
            { label: "Remove", action: "delete_item", params: { itemId: mostOverdue?.id } },
          ],
          priority: "high",
        };
      }

      return {
        title: `${count} Overdue Items`,
        message: `You have ${count} overdue items. The oldest is "${mostOverdue?.title}" (due ${formatRelativeTime(mostOverdue?.dueAt || "")}).`,
        suggestions: [
          { label: "Review all", action: "navigate", params: { to: "/tasks?filter=overdue" } },
          {
            label: "Reschedule all",
            action: "batch_reschedule",
            params: { items: details.items },
          },
          {
            label: "Start with oldest",
            action: "start_focus",
            params: { itemId: mostOverdue?.id },
          },
        ],
        priority: "high",
      };
    },
  },
};

// Meeting Starting Soon Trigger
export const meetingStartingSoonTrigger: Trigger = {
  type: "meeting_starting_soon",
  priority: "medium",
  cooldown: 30, // 30 minutes
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      const minutesUntilMeeting = ctx.calendar.minutesUntilNextMeeting;

      // Trigger at 15 and 5 minute marks
      return (
        minutesUntilMeeting !== null &&
        (minutesUntilMeeting === 15 || minutesUntilMeeting === 5 || minutesUntilMeeting === 1)
      );
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      return {
        item: ctx.calendar.nextMeeting
          ? {
              id: ctx.calendar.nextMeeting.id,
              title: ctx.calendar.nextMeeting.title,
              type: "meeting",
              status: "not_started",
              priority: "high",
              dueAt: ctx.calendar.nextMeeting.start.toISOString(),
            }
          : undefined,
        duration: ctx.calendar.minutesUntilNextMeeting || 0,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Meeting Soon",
      message: `"${details.item?.title}" starts in ${details.duration} minute${details.duration !== 1 ? "s" : ""}.`,
      suggestions: [
        { label: "View details", action: "view_item", params: { itemId: details.item?.id } },
        { label: "Join meeting", action: "join_meeting", params: { itemId: details.item?.id } },
      ],
      priority: "medium",
    }),
  },
};

// Helper functions
function formatDueDate(dueAt: string): string {
  if (!dueAt) return "unknown";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isBlockedBy(
  blockedItem: ContextItem,
  blockingItem: ContextItem,
  ctx: UserContext
): boolean {
  // Check if blockedItem is blocked by blockingItem
  // This is a simplified check - in practice you'd query the dependencies
  return ctx.priorities.blockedItems.some(
    (b) => b.id === blockedItem.id
  );
}

// Export all deadline triggers
export const deadlineTriggers: Trigger[] = [
  deadlineApproachingTrigger,
  deadlineAtRiskTrigger,
  itemOverdueTrigger,
  meetingStartingSoonTrigger,
];
