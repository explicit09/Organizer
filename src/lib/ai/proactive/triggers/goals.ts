// Goal Drift and Opportunity Triggers

import type { Trigger, TriggerDetails, ProactiveMessage, GoalInfo } from "../types";
import type { UserContext, ContextItem } from "../../context/types";

// Goal Drift Trigger
// Fires when work is significantly misaligned with goals
export const goalDriftTrigger: Trigger = {
  type: "goal_drift",
  priority: "medium",
  cooldown: 7 * 24 * 60, // Once per week
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if less than 30% of work aligns with goals
      return ctx.goals.alignedWorkThisWeek < 30;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      // Find goals that have been neglected
      const neglectedGoals: GoalInfo[] = ctx.goals.activeGoals
        .filter((goal) => {
          const progress = ctx.goals.goalProgress[goal.id] || 0;
          return progress < 20; // Less than 20% progress
        })
        .map((g) => ({
          id: g.id,
          name: g.title,
          progress: ctx.goals.goalProgress[g.id] || 0,
        }));

      // Find items that would help alignment
      const alignedItems = ctx.priorities.criticalItems.filter(
        (item) => item.goalId || ctx.goals.neglectedAreas.includes(item.area || "")
      );

      return {
        alignmentPercent: ctx.goals.alignedWorkThisWeek,
        neglectedGoals,
        topNeglected: neglectedGoals[0],
        suggestedItems: alignedItems.slice(0, 3),
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => {
      const alignment = details.alignmentPercent || 0;
      const neglected = details.topNeglected;

      return {
        title: "Work Misalignment Detected",
        message:
          `Only ${alignment}% of your recent work aligns with your goals.` +
          (neglected
            ? ` "${neglected.name}" has had little progress lately.`
            : " Consider reviewing your priorities."),
        suggestions: [
          {
            label: "Review goals",
            action: "navigate",
            params: { to: "/goals" },
          },
          {
            label: "Suggest aligned tasks",
            action: "suggest_aligned_tasks",
            params: { goalId: neglected?.id },
          },
          {
            label: "Update goals",
            action: "navigate",
            params: { to: "/goals/edit" },
          },
          { label: "I'm aware", action: "dismiss" },
        ],
        priority: "medium",
      };
    },
  },
};

// Dependency Unblocked Trigger
// Fires when a blocking item is completed, unblocking others
export const dependencyUnblockedTrigger: Trigger = {
  type: "dependency_unblocked",
  priority: "medium",
  cooldown: 0, // Event-based, no cooldown
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext, event) => {
      if (event?.type !== "item_completed") return false;

      // Check if the completed item was blocking anything
      const completedId = event.data?.itemId as string;
      return ctx.priorities.blockedItems.some((blocked) => {
        // In practice, would check actual dependencies
        return false; // Placeholder - needs dependency check
      });
    },

    getDetails: async (ctx: UserContext, event): Promise<TriggerDetails> => {
      const completedItem = event?.data?.item as ContextItem | undefined;

      // Find items that were blocked by this one
      // Simplified - would need actual dependency query
      const unblockedItems = ctx.priorities.blockedItems.slice(0, 3);

      return {
        completedItem,
        unblockedItems,
        totalUnblocked: unblockedItems.length,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => {
      const unblocked = details.unblockedItems as ContextItem[];
      const count = details.totalUnblocked || 0;

      return {
        title: "Items Unblocked",
        message:
          count === 1
            ? `"${unblocked[0]?.title}" is now unblocked and ready to work on.`
            : `${count} items are now unblocked and ready to work on.`,
        suggestions:
          count === 1
            ? [
                {
                  label: "Start now",
                  action: "start_focus",
                  params: { itemId: unblocked[0]?.id },
                },
                {
                  label: "View item",
                  action: "view_item",
                  params: { itemId: unblocked[0]?.id },
                },
                { label: "Later", action: "dismiss" },
              ]
            : [
                {
                  label: "View all",
                  action: "navigate",
                  params: { to: "/tasks?filter=ready" },
                },
                {
                  label: "Start first",
                  action: "start_focus",
                  params: { itemId: unblocked[0]?.id },
                },
                { label: "Later", action: "dismiss" },
              ],
        priority: "medium",
      };
    },
  },
};

// Item Blocked Trigger
// Fires when an item becomes blocked
export const itemBlockedTrigger: Trigger = {
  type: "item_blocked",
  priority: "medium",
  cooldown: 0, // Event-based
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext, event) => {
      return event?.type === "item_blocked";
    },

    getDetails: async (ctx: UserContext, event): Promise<TriggerDetails> => {
      const blockedItem = event?.data?.item as ContextItem | undefined;
      const blockingItem = event?.data?.blockingItem as ContextItem | undefined;

      return {
        item: blockedItem,
        mostCritical: blockingItem,
        cascadeImpact: calculateCascadeImpact(blockedItem, ctx),
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => {
      const blocked = details.item;
      const blocker = details.mostCritical;
      const cascade = details.cascadeImpact || 0;

      return {
        title: "Item Blocked",
        message:
          `"${blocked?.title}" is now blocked` +
          (blocker ? ` by "${blocker.title}"` : "") +
          (cascade > 0 ? `. This affects ${cascade} other items.` : "."),
        suggestions: blocker
          ? [
              {
                label: "Work on blocker",
                action: "start_focus",
                params: { itemId: blocker.id },
              },
              {
                label: "View dependency",
                action: "view_dependencies",
                params: { itemId: blocked?.id },
              },
              { label: "Got it", action: "dismiss" },
            ]
          : [
              {
                label: "View item",
                action: "view_item",
                params: { itemId: blocked?.id },
              },
              { label: "Got it", action: "dismiss" },
            ],
        priority: "medium",
      };
    },
  },
};

// Calendar Conflict Trigger
// Fires when a scheduling conflict is detected
export const calendarConflictTrigger: Trigger = {
  type: "calendar_conflict",
  priority: "high",
  cooldown: 60, // 1 hour
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Check for overlapping meetings
      const meetings = ctx.calendar.meetingsToday;

      for (let i = 0; i < meetings.length - 1; i++) {
        const current = meetings[i];
        const next = meetings[i + 1];

        if (current.end > next.start) {
          return true;
        }
      }

      return false;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const meetings = ctx.calendar.meetingsToday;
      const conflicts: Array<{ meeting1: string; meeting2: string }> = [];

      for (let i = 0; i < meetings.length - 1; i++) {
        const current = meetings[i];
        const next = meetings[i + 1];

        if (current.end > next.start) {
          conflicts.push({
            meeting1: current.title,
            meeting2: next.title,
          });
        }
      }

      return {
        conflicts,
        totalAtRisk: conflicts.length,
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => {
      const conflicts = details.conflicts as Array<{
        meeting1: string;
        meeting2: string;
      }>;
      const first = conflicts[0];

      return {
        title: "Calendar Conflict",
        message:
          conflicts.length === 1
            ? `"${first.meeting1}" overlaps with "${first.meeting2}".`
            : `You have ${conflicts.length} overlapping meetings today.`,
        suggestions: [
          {
            label: "View calendar",
            action: "navigate",
            params: { to: "/calendar" },
          },
          {
            label: "Suggest reschedule",
            action: "suggest_meeting_reschedule",
            params: { conflicts },
          },
          { label: "I'll handle it", action: "dismiss" },
        ],
        priority: "high",
      };
    },
  },
};

// Estimation Drift Trigger
// Fires when user's estimates are consistently off
export const estimationDriftTrigger: Trigger = {
  type: "estimation_drift",
  priority: "low",
  cooldown: 7 * 24 * 60, // Weekly
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if estimation accuracy is below 60%
      return ctx.patterns.estimationAccuracy < 60;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const accuracy = ctx.patterns.estimationAccuracy;
      const avgDuration = ctx.patterns.averageTaskDuration;

      return {
        estimationAccuracy: accuracy,
        averageDuration: avgDuration,
        reason:
          accuracy < 40
            ? "significantly_under"
            : accuracy < 60
              ? "moderately_under"
              : "slightly_under",
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => {
      const accuracy = details.estimationAccuracy as number;
      const avgMin = details.averageDuration as number;

      return {
        title: "Estimation Patterns",
        message:
          `Your task estimates have been ${accuracy}% accurate recently. ` +
          `Tasks typically take ${Math.round(avgMin)} minutes on average. ` +
          "Would you like suggestions for better estimates?",
        suggestions: [
          {
            label: "Review patterns",
            action: "navigate",
            params: { to: "/analytics?tab=estimates" },
          },
          {
            label: "Auto-adjust estimates",
            action: "auto_adjust_estimates",
            params: { factor: 100 / accuracy },
          },
          { label: "I'm aware", action: "dismiss" },
        ],
        priority: "low",
      };
    },
  },
};

// Helper function to calculate cascade impact
function calculateCascadeImpact(
  blockedItem: ContextItem | undefined,
  ctx: UserContext
): number {
  if (!blockedItem) return 0;

  // Count items that depend on the blocked item
  // Simplified - would need actual dependency graph traversal
  return ctx.priorities.blockedItems.filter(
    (item) => item.id !== blockedItem.id
  ).length;
}

// Export all goal triggers
export const goalTriggers: Trigger[] = [
  goalDriftTrigger,
  dependencyUnblockedTrigger,
  itemBlockedTrigger,
  calendarConflictTrigger,
  estimationDriftTrigger,
];
