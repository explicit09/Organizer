// Capacity and Workload Triggers

import type { Trigger, TriggerDetails, ProactiveMessage } from "../types";
import type { UserContext, ContextItem } from "../../context/types";

// Capacity Warning Trigger
// Fires when user is overcommitted for the week
export const capacityWarningTrigger: Trigger = {
  type: "capacity_warning",
  priority: "high",
  cooldown: 24 * 60, // Once per day
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Trigger if committed hours exceed available by more than 20%
      return ctx.workload.capacityUtilization > 120;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const excessHours =
        ctx.workload.estimatedHoursRemaining - ctx.workload.availableHoursThisWeek;

      // Find items that could potentially be deferred
      const deferralCandidates = ctx.priorities.criticalItems
        .filter((item) => {
          // Items with no deadline or deadline next week are deferral candidates
          if (!item.dueAt) return true;
          const dueDate = new Date(item.dueAt);
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return dueDate > nextWeek;
        })
        .slice(0, 5);

      return {
        utilizationPercent: ctx.workload.capacityUtilization,
        excessHours,
        deferralCandidates,
        totalAtRisk: Math.ceil(excessHours / 2), // Rough estimate of tasks at risk
      };
    },
  },

  action: {
    type: "ask",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Overcommitted This Week",
      message:
        `You're at ${details.utilizationPercent}% capacity with about ${Math.round(details.excessHours || 0)} hours more work than available time. ` +
        `Would you like help prioritizing or rescheduling?`,
      suggestions: [
        {
          label: "Help me prioritize",
          action: "suggest_priorities",
          params: { reason: "over_capacity" },
        },
        {
          label: "Suggest deferrals",
          action: "suggest_deferrals",
          params: { candidates: details.deferralCandidates },
        },
        {
          label: "I'll manage",
          action: "dismiss",
        },
      ],
      priority: "high",
    }),
  },
};

// Productivity Drop Trigger
// Fires when completion rate drops significantly
export const productivityDropTrigger: Trigger = {
  type: "productivity_drop",
  priority: "medium",
  cooldown: 48 * 60, // Every 2 days max
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Compare today's completion rate to weekly average
      const todayRate = ctx.workload.completedToday;
      const weeklyAvg = ctx.workload.completedThisWeek / 7;

      // Trigger if today is significantly below average (less than 50%)
      return todayRate < weeklyAvg * 0.5 && ctx.workload.completedThisWeek > 0;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const dayName = ctx.temporal.dayOfWeek;
      const averageForDay = ctx.patterns.completionRateByDay[dayName] || 0;

      return {
        todayCompleted: ctx.workload.completedToday,
        averageCompleted: averageForDay,
        blockedItems: ctx.priorities.blockedItems,
        commonBlockers: ctx.patterns.commonBlockers,
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Lower Than Usual Progress",
      message:
        `You've completed ${details.todayCompleted || 0} items today, which is below your usual pace. ` +
        (details.blockedItems && (details.blockedItems as ContextItem[]).length > 0
          ? `You have ${(details.blockedItems as ContextItem[]).length} blocked items that might be slowing you down.`
          : "Would you like some suggestions to get back on track?"),
      suggestions: [
        {
          label: "Show quick wins",
          action: "show_quick_wins",
          params: {},
        },
        {
          label: "Review blockers",
          action: "navigate",
          params: { to: "/tasks?filter=blocked" },
        },
        { label: "Take a break", action: "start_break" },
        { label: "I'm fine", action: "dismiss" },
      ],
      priority: "medium",
    }),
  },
};

// New High Priority Item Trigger
// Fires when a high-priority item is added that might affect plans
export const newHighPriorityTrigger: Trigger = {
  type: "new_high_priority",
  priority: "medium",
  cooldown: 0, // No cooldown - event-based
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext, event) => {
      if (!event || event.type !== "item_created") return false;

      const itemPriority = event.data?.priority as string;
      return itemPriority === "urgent" || itemPriority === "high";
    },

    getDetails: async (ctx: UserContext, event): Promise<TriggerDetails> => {
      const newItem = event?.data?.item as ContextItem | undefined;

      // Find items that might need to shift
      const conflictingItems = ctx.priorities.criticalItems.filter((item) => {
        if (!item.dueAt || !newItem?.dueAt) return false;
        const itemDue = new Date(item.dueAt);
        const newDue = new Date(newItem.dueAt);
        // Items due around the same time
        const timeDiff = Math.abs(itemDue.getTime() - newDue.getTime());
        return timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours
      });

      return {
        item: newItem,
        conflictingItems,
        cascadeImpact: conflictingItems.length,
      };
    },
  },

  action: {
    type: "notify",
    content: (details: TriggerDetails): ProactiveMessage => {
      const item = details.item;
      const conflicts = details.conflictingItems as ContextItem[] | undefined;

      return {
        title: "New Priority Item",
        message:
          `"${item?.title}" has been added with ${item?.priority} priority.` +
          (conflicts && conflicts.length > 0
            ? ` This may affect ${conflicts.length} other items due around the same time.`
            : ""),
        suggestions: [
          {
            label: "View item",
            action: "view_item",
            params: { itemId: item?.id },
          },
          {
            label: "Rebalance schedule",
            action: "suggest_schedule_rebalance",
            params: { triggerItemId: item?.id },
          },
          { label: "Got it", action: "dismiss" },
        ],
        priority: "medium",
      };
    },
  },
};

// Optimal Time Available Trigger
// Fires when a good chunk of free time aligns with user's productive hours
export const optimalTimeAvailableTrigger: Trigger = {
  type: "optimal_time_available",
  priority: "low",
  cooldown: 4 * 60, // Every 4 hours max
  userCanDisable: true,

  condition: {
    evaluate: async (ctx: UserContext) => {
      // Check if current time is in productive hours
      const currentHour = new Date().getHours().toString().padStart(2, "0");
      const isProductiveHour = ctx.patterns.productiveHours.some(
        (h) => h.startsWith(currentHour)
      );

      if (!isProductiveHour) return false;

      // Check if there's significant free time available
      const nextFreeBlock = ctx.calendar.freeBlocksToday[0];
      if (!nextFreeBlock) return false;

      // Trigger if free block is at least 60 minutes
      return nextFreeBlock.durationMinutes >= 60;
    },

    getDetails: async (ctx: UserContext): Promise<TriggerDetails> => {
      const freeBlock = ctx.calendar.freeBlocksToday[0];

      // Find a good item to work on
      const suggestedItem = findBestItemForTimeBlock(ctx, freeBlock?.durationMinutes || 60);

      return {
        freeMinutes: freeBlock?.durationMinutes,
        productiveHours: ctx.patterns.productiveHours,
        suggestedItem,
        reason: "optimal_productive_time",
      };
    },
  },

  action: {
    type: "suggest",
    content: (details: TriggerDetails): ProactiveMessage => ({
      title: "Good Time to Focus",
      message:
        `You have ${details.freeMinutes} minutes of free time during your productive hours. ` +
        (details.suggestedItem
          ? `Would you like to work on "${details.suggestedItem.title}"?`
          : "Would you like to start a focus session?"),
      suggestions: details.suggestedItem
        ? [
            {
              label: "Start focus",
              action: "start_focus",
              params: { itemId: details.suggestedItem.id },
            },
            {
              label: "Choose different",
              action: "navigate",
              params: { to: "/tasks" },
            },
            { label: "Not now", action: "dismiss" },
          ]
        : [
            {
              label: "Pick a task",
              action: "navigate",
              params: { to: "/tasks" },
            },
            { label: "Not now", action: "dismiss" },
          ],
      priority: "low",
    }),
  },
};

// Helper function to find best item for a time block
function findBestItemForTimeBlock(
  ctx: UserContext,
  availableMinutes: number
): ContextItem | undefined {
  // Prioritize: quick wins that fit, then critical items, then anything that fits
  const allItems = [
    ...ctx.priorities.quickWins,
    ...ctx.priorities.criticalItems,
  ];

  // Find items that fit in the available time
  const fittingItems = allItems.filter((item) => {
    const estimated = item.estimatedMinutes || 30;
    return estimated <= availableMinutes;
  });

  // Sort by priority and due date
  fittingItems.sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;

    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then by due date
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    return a.dueAt ? -1 : b.dueAt ? 1 : 0;
  });

  return fittingItems[0];
}

// Export all capacity triggers
export const capacityTriggers: Trigger[] = [
  capacityWarningTrigger,
  productivityDropTrigger,
  newHighPriorityTrigger,
  optimalTimeAvailableTrigger,
];
