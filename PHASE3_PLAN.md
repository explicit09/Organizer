# Phase 3: Proactive Intelligence - Detailed Implementation Plan

## Vision

Transform the AI from a responsive assistant into a **proactive partner** that anticipates needs, prevents problems, and surfaces opportunities **before you have to ask**.

The AI should feel like a thoughtful colleague who:
- Notices when you're heading toward trouble
- Suggests things at the right moment
- Handles routine decisions automatically
- Protects your focus and wellbeing

---

## Core Philosophy

**Phase 1**: AI does what you ask (execution)
**Phase 2**: AI understands your situation (intelligence)
**Phase 3**: AI acts before you ask (proactivity)

### The Proactive Mindset

```
Instead of:                      The AI should:
─────────────────────────────    ────────────────────────────────────────
User misses deadline      →      Warn 2 days before deadline is at risk
User gets overwhelmed     →      Notice capacity issues and offer to help
User forgets habit        →      Remind at optimal time
User drifts from goals    →      Gently surface the drift
User has free time        →      Suggest productive use
User works late           →      Encourage rest, protect wellbeing
```

---

## Part 1: Proactive Engine Architecture

### 1.1 Event-Driven Triggers

```typescript
// src/lib/ai/proactive/triggers.ts

type TriggerType =
  // Time-based triggers
  | "morning_briefing"           // Daily at user's preferred time
  | "evening_wrapup"             // End of workday
  | "weekly_review"              // Weekly on preferred day
  | "habit_reminder"             // At habit scheduled time
  | "focus_checkin"              // During long focus sessions

  // State-based triggers
  | "deadline_approaching"       // X days before due date
  | "deadline_at_risk"           // Estimated completion > due date
  | "item_overdue"               // Due date passed
  | "capacity_warning"           // Utilization > threshold
  | "streak_at_risk"             // Habit streak might break
  | "goal_drift"                 // Work not aligned with goals
  | "long_inactive"              // No activity for X hours

  // Event-based triggers
  | "item_completed"             // Task finished
  | "item_blocked"               // Task marked as blocked
  | "meeting_starting_soon"      // Meeting in X minutes
  | "calendar_conflict"          // Overlapping events detected
  | "new_high_priority"          // High/urgent item created
  | "dependency_unblocked"       // Blocking item completed

  // Pattern-based triggers
  | "productivity_drop"          // Completion rate below average
  | "estimation_drift"           // Estimates consistently wrong
  | "unusual_activity"           // Anomaly detected
  | "optimal_time_available"     // Peak productivity time + free calendar

interface Trigger {
  type: TriggerType;
  priority: "low" | "medium" | "high" | "urgent";
  condition: TriggerCondition;
  action: ProactiveAction;
  cooldown: number; // Minutes before can trigger again
  userCanDisable: boolean;
}

interface TriggerCondition {
  evaluate: (context: UserContext) => Promise<boolean>;
  getDetails: (context: UserContext) => Promise<TriggerDetails>;
}

interface ProactiveAction {
  type: "notify" | "suggest" | "ask" | "auto_execute";
  content: (details: TriggerDetails) => ProactiveMessage;
  autoActions?: AutoAction[]; // Actions to take automatically
}
```

### 1.2 Trigger Definitions

```typescript
// src/lib/ai/proactive/triggers/deadlines.ts

export const deadlineApproachingTrigger: Trigger = {
  type: "deadline_approaching",
  priority: "medium",
  cooldown: 24 * 60, // Once per day per item
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      const approachingItems = ctx.priorities.criticalItems.filter(item => {
        if (!item.dueAt) return false;
        const hoursUntilDue = differenceInHours(new Date(item.dueAt), new Date());
        const estimatedHours = (item.estimatedMinutes || 60) / 60;

        // Trigger if less than 2x estimated time remaining
        return hoursUntilDue > 0 && hoursUntilDue < estimatedHours * 2 + 24;
      });

      return approachingItems.length > 0;
    },

    getDetails: async (ctx) => {
      const items = ctx.priorities.criticalItems.filter(item => {
        if (!item.dueAt) return false;
        const hoursUntilDue = differenceInHours(new Date(item.dueAt), new Date());
        const estimatedHours = (item.estimatedMinutes || 60) / 60;
        return hoursUntilDue > 0 && hoursUntilDue < estimatedHours * 2 + 24;
      });

      return {
        items,
        mostUrgent: items[0],
        totalAtRisk: items.length
      };
    }
  },

  action: {
    type: "suggest",
    content: (details) => ({
      title: "Deadline Approaching",
      message: `"${details.mostUrgent.title}" is due in ${formatRelativeTime(details.mostUrgent.dueAt)}. ` +
               `You might need to start soon to finish on time.`,
      suggestions: [
        { label: "Start now", action: "start_focus", params: { itemId: details.mostUrgent.id } },
        { label: "Reschedule", action: "suggest_reschedule", params: { itemId: details.mostUrgent.id } },
        { label: "I've got it", action: "dismiss" }
      ],
      priority: "medium"
    })
  }
};

export const deadlineAtRiskTrigger: Trigger = {
  type: "deadline_at_risk",
  priority: "high",
  cooldown: 12 * 60, // Twice per day
  userCanDisable: false, // Critical - always notify

  condition: {
    evaluate: async (ctx) => {
      return ctx.priorities.atRiskDeadlines.length > 0;
    },

    getDetails: async (ctx) => {
      const atRisk = ctx.priorities.atRiskDeadlines;

      // Calculate impact
      const blockedByAtRisk = ctx.priorities.blockedItems.filter(blocked =>
        atRisk.some(risky => isBlockedBy(blocked.id, risky.id))
      );

      return {
        items: atRisk,
        mostCritical: atRisk[0],
        cascadeImpact: blockedByAtRisk.length
      };
    }
  },

  action: {
    type: "ask",
    content: (details) => ({
      title: "⚠️ Deadline at Risk",
      message: `Based on your current pace, "${details.mostCritical.title}" likely won't be finished by ${formatDate(details.mostCritical.dueAt)}.` +
               (details.cascadeImpact > 0 ? ` This affects ${details.cascadeImpact} other tasks.` : ""),
      suggestions: [
        { label: "Help me catch up", action: "create_catchup_plan", params: { itemId: details.mostCritical.id } },
        { label: "Extend deadline", action: "reschedule", params: { itemId: details.mostCritical.id } },
        { label: "Reduce scope", action: "discuss_scope", params: { itemId: details.mostCritical.id } },
        { label: "I'll handle it", action: "dismiss" }
      ],
      priority: "high"
    })
  }
};
```

```typescript
// src/lib/ai/proactive/triggers/capacity.ts

export const capacityWarningTrigger: Trigger = {
  type: "capacity_warning",
  priority: "medium",
  cooldown: 24 * 60,
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      return ctx.workload.capacityUtilization > 1.2; // 120% or more
    },

    getDetails: async (ctx) => {
      const excessHours = (ctx.workload.capacityUtilization - 1) * ctx.workload.availableHoursThisWeek;

      // Find candidates for deferral
      const deferralCandidates = ctx.priorities.criticalItems
        .filter(i => i.priority !== "urgent" && !isBlockingOthers(i.id, ctx))
        .sort((a, b) => {
          // Prefer deferring items with later deadlines
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return bDue - aDue;
        });

      return {
        utilizationPercent: Math.round(ctx.workload.capacityUtilization * 100),
        excessHours: Math.round(excessHours),
        deferralCandidates: deferralCandidates.slice(0, 3)
      };
    }
  },

  action: {
    type: "suggest",
    content: (details) => ({
      title: "Heavy Workload Detected",
      message: `You're at ${details.utilizationPercent}% capacity - about ${details.excessHours} hours more work than available time this week.`,
      suggestions: [
        { label: "Help me prioritize", action: "suggest_prioritization" },
        { label: "Show deferral options", action: "show_deferral_candidates", params: { items: details.deferralCandidates } },
        { label: "I can handle it", action: "dismiss" }
      ],
      priority: "medium"
    })
  }
};
```

```typescript
// src/lib/ai/proactive/triggers/habits.ts

export const streakAtRiskTrigger: Trigger = {
  type: "streak_at_risk",
  priority: "medium",
  cooldown: 4 * 60, // Every 4 hours
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      // Find habits with 5+ day streaks that haven't been done today
      const atRiskStreaks = Object.entries(ctx.habits.streaks)
        .filter(([habitId, days]) => {
          const habit = ctx.habits.todaysHabits.find(h => h.id === habitId);
          return days >= 5 && habit && !habit.completedToday;
        });

      // Only trigger in afternoon/evening (give them time in morning)
      const hour = new Date().getHours();
      return atRiskStreaks.length > 0 && hour >= 14;
    },

    getDetails: async (ctx) => {
      const atRisk = Object.entries(ctx.habits.streaks)
        .filter(([habitId, days]) => {
          const habit = ctx.habits.todaysHabits.find(h => h.id === habitId);
          return days >= 5 && habit && !habit.completedToday;
        })
        .map(([habitId, days]) => ({
          habit: ctx.habits.todaysHabits.find(h => h.id === habitId)!,
          streakDays: days
        }));

      return {
        habits: atRisk,
        longestStreak: Math.max(...atRisk.map(h => h.streakDays))
      };
    }
  },

  action: {
    type: "notify",
    content: (details) => ({
      title: "🔥 Streak Alert",
      message: `Your ${details.longestStreak}-day streak for "${details.habits[0].habit.name}" is at risk! Don't forget to log it today.`,
      suggestions: [
        { label: "Log now", action: "log_habit", params: { habitId: details.habits[0].habit.id } },
        { label: "Remind me later", action: "snooze", params: { minutes: 60 } },
        { label: "Skip today", action: "dismiss" }
      ],
      priority: "medium"
    })
  }
};

export const habitReminderTrigger: Trigger = {
  type: "habit_reminder",
  priority: "low",
  cooldown: 60, // Once per hour
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      // Check if it's the user's preferred time for habits
      const preference = ctx.preferences.find(p => p.key === "habit_reminder_time");
      if (!preference) return false;

      const preferredHour = parseInt(preference.value);
      const currentHour = new Date().getHours();

      return currentHour === preferredHour && ctx.habits.missedHabitsToday.length > 0;
    },

    getDetails: async (ctx) => ({
      pendingHabits: ctx.habits.missedHabitsToday,
      totalPending: ctx.habits.missedHabitsToday.length
    })
  },

  action: {
    type: "notify",
    content: (details) => ({
      title: "Habit Check-in",
      message: `${details.totalPending} habit${details.totalPending > 1 ? 's' : ''} pending: ${details.pendingHabits.map(h => h.name).join(", ")}`,
      suggestions: [
        { label: "Log habits", action: "navigate", params: { to: "/habits" } },
        { label: "Remind later", action: "snooze", params: { minutes: 120 } }
      ],
      priority: "low"
    })
  }
};
```

```typescript
// src/lib/ai/proactive/triggers/goals.ts

export const goalDriftTrigger: Trigger = {
  type: "goal_drift",
  priority: "low",
  cooldown: 7 * 24 * 60, // Once per week
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      // Trigger if alignment is below 40% and has active goals
      return ctx.goals.alignedWorkThisWeek < 0.4 && ctx.goals.activeGoals.length > 0;
    },

    getDetails: async (ctx) => {
      const neglectedGoals = ctx.goals.activeGoals.filter(g => {
        const progress = ctx.goals.goalProgress[g.id] || 0;
        return progress < 0.1; // Less than 10% progress
      });

      return {
        alignmentPercent: Math.round(ctx.goals.alignedWorkThisWeek * 100),
        neglectedGoals,
        topNeglected: neglectedGoals[0]
      };
    }
  },

  action: {
    type: "ask",
    content: (details) => ({
      title: "Goal Check-in",
      message: `Only ${details.alignmentPercent}% of your recent work connects to your stated goals. ` +
               (details.topNeglected ? `"${details.topNeglected.name}" hasn't seen activity lately.` : ""),
      suggestions: [
        { label: "Help me realign", action: "suggest_goal_alignment" },
        { label: "Update my goals", action: "navigate", params: { to: "/goals" } },
        { label: "Goals are fine", action: "dismiss" }
      ],
      priority: "low"
    })
  }
};
```

```typescript
// src/lib/ai/proactive/triggers/opportunities.ts

export const optimalTimeAvailableTrigger: Trigger = {
  type: "optimal_time_available",
  priority: "low",
  cooldown: 4 * 60, // Every 4 hours
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      // Check if:
      // 1. Current time is in user's productive hours
      // 2. Calendar is free for next 90+ minutes
      // 3. There are high-priority items to work on
      // 4. User isn't in a focus session

      const inProductiveTime = ctx.patterns.productiveHours.some(h =>
        isInHourRange(new Date().getHours(), h)
      );

      const hasFreeTime = ctx.calendar.minutesUntilNextMeeting === null ||
                          ctx.calendar.minutesUntilNextMeeting > 90;

      const hasImportantWork = ctx.priorities.criticalItems.length > 0 ||
                               ctx.priorities.blockingItems.length > 0;

      const notInFocus = !ctx.recentActivity.currentFocusSession;

      return inProductiveTime && hasFreeTime && hasImportantWork && notInFocus;
    },

    getDetails: async (ctx) => {
      // Find the best task to suggest
      let suggestedItem: Item;
      let reason: string;

      if (ctx.priorities.blockingItems.length > 0) {
        suggestedItem = ctx.priorities.blockingItems[0];
        reason = "unblocks other work";
      } else if (ctx.priorities.atRiskDeadlines.length > 0) {
        suggestedItem = ctx.priorities.atRiskDeadlines[0];
        reason = "deadline approaching";
      } else {
        suggestedItem = ctx.priorities.criticalItems[0];
        reason = "high priority";
      }

      const freeMinutes = ctx.calendar.minutesUntilNextMeeting ||
                          ctx.calendar.longestFreeBlock?.durationMinutes || 120;

      return {
        suggestedItem,
        reason,
        freeMinutes,
        productiveHours: ctx.patterns.productiveHours
      };
    }
  },

  action: {
    type: "suggest",
    content: (details) => ({
      title: "🧠 Prime Time",
      message: `You're in your peak hours with ${details.freeMinutes} minutes free. ` +
               `"${details.suggestedItem.title}" would be great to tackle now (${details.reason}).`,
      suggestions: [
        { label: "Start focus session", action: "start_focus", params: { itemId: details.suggestedItem.id } },
        { label: "Show other options", action: "suggest_prioritization" },
        { label: "Not now", action: "dismiss" }
      ],
      priority: "low"
    })
  }
};

export const dependencyUnblockedTrigger: Trigger = {
  type: "dependency_unblocked",
  priority: "medium",
  cooldown: 0, // Trigger every time
  userCanDisable: false,

  condition: {
    // This is event-triggered, not poll-triggered
    // Fires when an item is completed
    evaluate: async (ctx, event?: { type: string; itemId: string }) => {
      if (!event || event.type !== "item_completed") return false;

      // Check if completed item was blocking anything
      const unblocked = ctx.priorities.blockedItems.filter(item =>
        wasBlockedBy(item.id, event.itemId)
      );

      return unblocked.length > 0;
    },

    getDetails: async (ctx, event) => {
      const completedItem = await getItem(event!.itemId);
      const unblockedItems = ctx.priorities.blockedItems.filter(item =>
        wasBlockedBy(item.id, event!.itemId)
      );

      return {
        completedItem,
        unblockedItems,
        totalUnblocked: unblockedItems.length
      };
    }
  },

  action: {
    type: "notify",
    content: (details) => ({
      title: "🔓 Work Unblocked",
      message: `"${details.completedItem.title}" is done! ` +
               `${details.totalUnblocked} task${details.totalUnblocked > 1 ? 's are' : ' is'} now unblocked: ` +
               details.unblockedItems.slice(0, 3).map(i => i.title).join(", "),
      suggestions: [
        { label: "Work on next", action: "start_focus", params: { itemId: details.unblockedItems[0].id } },
        { label: "See all unblocked", action: "list_items", params: { status: "not_started", wasBlocked: true } }
      ],
      priority: "medium"
    })
  }
};
```

### 1.3 Proactive Engine

```typescript
// src/lib/ai/proactive/engine.ts

interface ProactiveEngine {
  // Core methods
  start(): void;
  stop(): void;

  // Trigger management
  registerTrigger(trigger: Trigger): void;
  disableTrigger(triggerType: TriggerType): void;
  enableTrigger(triggerType: TriggerType): void;

  // Event handling
  onEvent(event: SystemEvent): Promise<void>;

  // Manual check
  checkNow(): Promise<ProactiveMessage[]>;
}

class ProactiveEngineImpl implements ProactiveEngine {
  private triggers: Map<TriggerType, Trigger> = new Map();
  private cooldowns: Map<string, Date> = new Map(); // triggerType:userId -> last triggered
  private pollInterval: NodeJS.Timeout | null = null;
  private userPreferences: Map<string, Set<TriggerType>> = new Map(); // Disabled triggers per user

  async start() {
    // Poll every 5 minutes for time-based triggers
    this.pollInterval = setInterval(() => this.pollTriggers(), 5 * 60 * 1000);

    // Subscribe to system events for event-based triggers
    eventBus.subscribe("item_completed", (e) => this.onEvent(e));
    eventBus.subscribe("item_created", (e) => this.onEvent(e));
    eventBus.subscribe("item_updated", (e) => this.onEvent(e));
    eventBus.subscribe("calendar_changed", (e) => this.onEvent(e));

    console.log("Proactive engine started");
  }

  async pollTriggers() {
    // Get all active users (had activity in last 24h)
    const activeUsers = await getActiveUsers(24);

    for (const userId of activeUsers) {
      await this.checkTriggersForUser(userId);
    }
  }

  async checkTriggersForUser(userId: string): Promise<ProactiveMessage[]> {
    const context = await assembleContext(userId);
    const messages: ProactiveMessage[] = [];
    const disabledTriggers = this.userPreferences.get(userId) || new Set();

    for (const [type, trigger] of this.triggers) {
      // Skip if user disabled this trigger
      if (disabledTriggers.has(type) && trigger.userCanDisable) continue;

      // Check cooldown
      const cooldownKey = `${type}:${userId}`;
      const lastTriggered = this.cooldowns.get(cooldownKey);
      if (lastTriggered && differenceInMinutes(new Date(), lastTriggered) < trigger.cooldown) {
        continue;
      }

      try {
        // Evaluate trigger condition
        const shouldTrigger = await trigger.condition.evaluate(context);

        if (shouldTrigger) {
          const details = await trigger.condition.getDetails(context);
          const message = trigger.action.content(details);

          // Record the trigger
          this.cooldowns.set(cooldownKey, new Date());
          await logProactiveMessage(userId, type, message);

          // Execute auto-actions if any
          if (trigger.action.autoActions) {
            for (const autoAction of trigger.action.autoActions) {
              await executeAutoAction(autoAction, userId, details);
            }
          }

          // Send notification
          await sendProactiveNotification(userId, message);
          messages.push(message);
        }
      } catch (error) {
        console.error(`Error evaluating trigger ${type}:`, error);
      }
    }

    return messages;
  }

  async onEvent(event: SystemEvent) {
    const { userId, type: eventType } = event;
    const context = await assembleContext(userId);

    // Check event-triggered triggers
    for (const [type, trigger] of this.triggers) {
      if (await trigger.condition.evaluate(context, event)) {
        const details = await trigger.condition.getDetails(context, event);
        const message = trigger.action.content(details);

        await sendProactiveNotification(userId, message);
      }
    }
  }
}

// Singleton instance
export const proactiveEngine = new ProactiveEngineImpl();
```

---

## Part 2: Notification System

### 2.1 Multi-Channel Notifications

```typescript
// src/lib/ai/proactive/notifications.ts

type NotificationChannel = "in_app" | "push" | "email" | "sms";

interface NotificationPreferences {
  channels: NotificationChannel[];
  quietHours: { start: number; end: number }; // 22-8 means 10pm to 8am
  urgentOverridesQuiet: boolean;
  maxPerDay: number;
  groupSimilar: boolean;
}

interface ProactiveNotification {
  id: string;
  userId: string;
  message: ProactiveMessage;
  channels: NotificationChannel[];
  sentAt: Date;
  readAt: Date | null;
  actionTaken: string | null;
}

async function sendProactiveNotification(
  userId: string,
  message: ProactiveMessage
): Promise<void> {
  const prefs = await getNotificationPreferences(userId);
  const now = new Date();
  const hour = now.getHours();

  // Check quiet hours
  const inQuietHours = isInQuietHours(hour, prefs.quietHours);
  if (inQuietHours && !(message.priority === "urgent" && prefs.urgentOverridesQuiet)) {
    // Queue for later
    await queueNotification(userId, message, getEndOfQuietHours(prefs.quietHours));
    return;
  }

  // Check daily limit
  const todaysCount = await getTodaysNotificationCount(userId);
  if (todaysCount >= prefs.maxPerDay && message.priority !== "urgent") {
    // Skip or queue for tomorrow
    return;
  }

  // Group similar notifications if enabled
  if (prefs.groupSimilar) {
    const pending = await getPendingNotifications(userId);
    const similar = pending.filter(n => n.message.title === message.title);
    if (similar.length > 0) {
      // Update existing instead of sending new
      await updateGroupedNotification(similar[0].id, message);
      return;
    }
  }

  // Send through enabled channels
  const notification: ProactiveNotification = {
    id: generateId(),
    userId,
    message,
    channels: prefs.channels,
    sentAt: now,
    readAt: null,
    actionTaken: null
  };

  await saveNotification(notification);

  for (const channel of prefs.channels) {
    switch (channel) {
      case "in_app":
        await sendInAppNotification(userId, message);
        break;
      case "push":
        await sendPushNotification(userId, message);
        break;
      case "email":
        if (message.priority === "high" || message.priority === "urgent") {
          await sendEmailNotification(userId, message);
        }
        break;
    }
  }
}
```

### 2.2 In-App Notification UI

```typescript
// src/lib/ai/proactive/inApp.ts

interface InAppNotification {
  id: string;
  type: "toast" | "banner" | "modal" | "sidebar";
  message: ProactiveMessage;
  persistent: boolean;
  dismissable: boolean;
  autoHideSeconds: number | null;
}

function determineNotificationType(message: ProactiveMessage): InAppNotification["type"] {
  switch (message.priority) {
    case "urgent":
      return "modal"; // Requires attention
    case "high":
      return "banner"; // Visible but not blocking
    case "medium":
      return "toast"; // Quick notification
    case "low":
      return "sidebar"; // Subtle, in notification center
  }
}

// Component for displaying proactive messages
// src/components/ProactiveNotification.tsx

export function ProactiveNotification({ notification }: { notification: InAppNotification }) {
  const [visible, setVisible] = useState(true);

  // Auto-hide for non-persistent
  useEffect(() => {
    if (notification.autoHideSeconds && !notification.persistent) {
      const timer = setTimeout(() => setVisible(false), notification.autoHideSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!visible) return null;

  const handleAction = async (action: SuggestionAction) => {
    await executeProactiveAction(action);
    await markNotificationActioned(notification.id, action.action);
    setVisible(false);
  };

  return (
    <div className={`proactive-notification ${notification.type}`}>
      <div className="notification-header">
        <span className="notification-title">{notification.message.title}</span>
        {notification.dismissable && (
          <button onClick={() => setVisible(false)}>×</button>
        )}
      </div>
      <p className="notification-message">{notification.message.message}</p>
      <div className="notification-actions">
        {notification.message.suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => handleAction(suggestion)}
            className={i === 0 ? "primary" : "secondary"}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Part 3: Automated Actions

### 3.1 Auto-Execution Framework

```typescript
// src/lib/ai/proactive/autoActions.ts

type AutoActionType =
  | "auto_reschedule"      // Automatically move overdue to tomorrow
  | "auto_prioritize"      // Bump priority based on deadline
  | "auto_remind"          // Send reminder at optimal time
  | "auto_block_calendar"  // Block focus time for important tasks
  | "auto_log_habit"       // Log recurring habits automatically
  | "auto_create_followup" // Create follow-up tasks
  | "auto_archive"         // Archive old completed items

interface AutoAction {
  type: AutoActionType;
  condition: (context: UserContext, details: TriggerDetails) => boolean;
  execute: (context: UserContext, details: TriggerDetails, userId: string) => Promise<ActionResult>;
  requiresConfirmation: boolean;
  undoable: boolean;
}

const autoActions: Record<AutoActionType, AutoAction> = {
  auto_reschedule: {
    type: "auto_reschedule",
    requiresConfirmation: true,
    undoable: true,

    condition: (ctx, details) => {
      // Only auto-reschedule if:
      // 1. Item is overdue by less than 24 hours
      // 2. Item is not blocking other work
      // 3. User has enabled this automation
      const item = details.item;
      if (!item.dueAt) return false;

      const hoursOverdue = differenceInHours(new Date(), new Date(item.dueAt));
      const isBlocking = ctx.priorities.blockingItems.some(b => b.id === item.id);

      return hoursOverdue > 0 && hoursOverdue < 24 && !isBlocking;
    },

    execute: async (ctx, details, userId) => {
      const item = details.item;
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(17, 0, 0, 0); // Default to 5pm

      await updateItem(item.id, { dueAt: tomorrow.toISOString() }, { userId });

      return {
        success: true,
        message: `Rescheduled "${item.title}" to tomorrow`,
        undoAction: {
          type: "update_item",
          params: { itemId: item.id, updates: { dueAt: item.dueAt } }
        }
      };
    }
  },

  auto_prioritize: {
    type: "auto_prioritize",
    requiresConfirmation: false,
    undoable: true,

    condition: (ctx, details) => {
      // Auto-prioritize if deadline is tomorrow and priority is low/medium
      const item = details.item;
      if (!item.dueAt) return false;

      const hoursToDue = differenceInHours(new Date(item.dueAt), new Date());
      return hoursToDue < 24 && hoursToDue > 0 &&
             (item.priority === "low" || item.priority === "medium");
    },

    execute: async (ctx, details, userId) => {
      const item = details.item;
      const newPriority = "high";
      const oldPriority = item.priority;

      await updateItem(item.id, { priority: newPriority }, { userId });

      return {
        success: true,
        message: `Bumped "${item.title}" to high priority (due tomorrow)`,
        undoAction: {
          type: "update_item",
          params: { itemId: item.id, updates: { priority: oldPriority } }
        }
      };
    }
  },

  auto_block_calendar: {
    type: "auto_block_calendar",
    requiresConfirmation: true,
    undoable: true,

    condition: (ctx, details) => {
      // Block calendar for critical tasks that need focus time
      const item = details.item;
      const estimatedHours = (item.estimatedMinutes || 60) / 60;

      return item.priority === "urgent" &&
             estimatedHours >= 1 &&
             ctx.calendar.longestFreeBlock?.durationMinutes >= estimatedHours * 60;
    },

    execute: async (ctx, details, userId) => {
      const item = details.item;
      const freeBlock = ctx.calendar.longestFreeBlock!;
      const duration = Math.min(item.estimatedMinutes || 60, freeBlock.durationMinutes);

      const event = await createCalendarBlock(userId, {
        title: `Focus: ${item.title}`,
        start: freeBlock.start,
        end: addMinutes(freeBlock.start, duration),
        description: `Blocked for working on: ${item.title}`,
        itemId: item.id
      });

      return {
        success: true,
        message: `Blocked ${duration} minutes on your calendar for "${item.title}"`,
        undoAction: {
          type: "delete_calendar_event",
          params: { eventId: event.id }
        }
      };
    }
  }
};
```

### 3.2 Automation Rules (User-Configurable)

```typescript
// src/lib/ai/proactive/automationRules.ts

interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  trigger: {
    event: TriggerType;
    conditions: RuleCondition[];
  };
  actions: RuleAction[];
  createdAt: Date;
  lastTriggeredAt: Date | null;
  triggerCount: number;
}

interface RuleCondition {
  field: string; // e.g., "item.priority", "item.type"
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string | number | boolean;
}

interface RuleAction {
  type: AutoActionType;
  params?: Record<string, unknown>;
}

// Pre-built automation templates
const automationTemplates: Partial<AutomationRule>[] = [
  {
    name: "Auto-prioritize due tomorrow",
    trigger: {
      event: "deadline_approaching",
      conditions: [
        { field: "hoursUntilDue", operator: "less_than", value: 24 },
        { field: "item.priority", operator: "not_equals", value: "urgent" }
      ]
    },
    actions: [
      { type: "auto_prioritize" }
    ]
  },
  {
    name: "Block calendar for urgent tasks",
    trigger: {
      event: "new_high_priority",
      conditions: [
        { field: "item.priority", operator: "equals", value: "urgent" },
        { field: "item.estimatedMinutes", operator: "greater_than", value: 60 }
      ]
    },
    actions: [
      { type: "auto_block_calendar" }
    ]
  },
  {
    name: "Create follow-up after meeting",
    trigger: {
      event: "meeting_ended",
      conditions: []
    },
    actions: [
      { type: "auto_create_followup", params: { template: "meeting_followup" } }
    ]
  }
];
```

---

## Part 4: Proactive Check-ins

### 4.1 Scheduled Check-ins

```typescript
// src/lib/ai/proactive/checkins.ts

type CheckinType =
  | "morning_briefing"
  | "midday_pulse"
  | "evening_wrapup"
  | "weekly_review"
  | "monthly_reflection";

interface CheckinConfig {
  type: CheckinType;
  preferredTime: string; // "09:00", "13:00", etc.
  preferredDay?: string; // For weekly: "monday", etc.
  enabled: boolean;
  channels: NotificationChannel[];
}

interface CheckinContent {
  greeting: string;
  sections: CheckinSection[];
  suggestedActions: SuggestionAction[];
  closingMessage: string;
}

async function generateCheckin(
  userId: string,
  type: CheckinType
): Promise<CheckinContent> {
  const context = await assembleContext(userId);

  switch (type) {
    case "morning_briefing":
      return generateMorningBriefing(context);
    case "midday_pulse":
      return generateMiddayPulse(context);
    case "evening_wrapup":
      return generateEveningWrapup(context);
    case "weekly_review":
      return generateWeeklyReview(context);
    case "monthly_reflection":
      return generateMonthlyReflection(context);
  }
}

async function generateMiddayPulse(ctx: UserContext): Promise<CheckinContent> {
  const completedMorning = ctx.recentActivity.todaysCompletions.filter(i => {
    const completedAt = new Date(i.updatedAt);
    return completedAt.getHours() < 12;
  });

  const afternoonMeetings = ctx.calendar.meetingsToday.filter(m => {
    const start = new Date(m.start);
    return start.getHours() >= 12;
  });

  const remainingToday = ctx.priorities.criticalItems.filter(i => {
    return i.dueAt && isToday(new Date(i.dueAt)) && i.status !== "completed";
  });

  return {
    greeting: getMoodBasedGreeting(ctx, "midday"),
    sections: [
      {
        title: "Morning Progress",
        content: completedMorning.length > 0
          ? `✅ Completed ${completedMorning.length} item${completedMorning.length > 1 ? 's' : ''}: ${completedMorning.map(i => i.title).join(", ")}`
          : "No items completed yet this morning."
      },
      {
        title: "Afternoon Ahead",
        content: afternoonMeetings.length > 0
          ? `📅 ${afternoonMeetings.length} meeting${afternoonMeetings.length > 1 ? 's' : ''} this afternoon`
          : "No meetings this afternoon - good focus time!"
      },
      {
        title: "Still Due Today",
        content: remainingToday.length > 0
          ? `⏰ ${remainingToday.length} item${remainingToday.length > 1 ? 's' : ''} due: ${remainingToday.map(i => i.title).join(", ")}`
          : "All today's items are done! 🎉"
      }
    ],
    suggestedActions: determineMidayActions(ctx, completedMorning, remainingToday),
    closingMessage: getEncouragingClose(ctx)
  };
}

async function generateEveningWrapup(ctx: UserContext): Promise<CheckinContent> {
  const todaysCompletions = ctx.recentActivity.todaysCompletions;
  const becameOverdue = ctx.priorities.criticalItems.filter(i => {
    if (!i.dueAt) return false;
    const dueDate = new Date(i.dueAt);
    return isToday(dueDate) && dueDate < new Date();
  });

  const tomorrowItems = ctx.priorities.criticalItems.filter(i => {
    return i.dueAt && isTomorrow(new Date(i.dueAt));
  });

  const habitStatus = ctx.habits.todaysHabits.map(h => ({
    name: h.name,
    done: h.completedToday,
    streak: ctx.habits.streaks[h.id] || 0
  }));

  return {
    greeting: "Here's how today went:",
    sections: [
      {
        title: "Completed Today",
        content: `✅ ${todaysCompletions.length} item${todaysCompletions.length !== 1 ? 's' : ''} completed` +
                 (todaysCompletions.length > 0 ? `\n${todaysCompletions.map(i => `• ${i.title}`).join("\n")}` : "")
      },
      {
        title: "Habits",
        content: habitStatus.map(h =>
          `${h.done ? "✅" : "❌"} ${h.name}` + (h.streak > 0 && h.done ? ` (${h.streak} day streak!)` : "")
        ).join("\n")
      },
      {
        title: "Tomorrow's Preview",
        content: tomorrowItems.length > 0
          ? `📋 ${tomorrowItems.length} item${tomorrowItems.length !== 1 ? 's' : ''} due:\n${tomorrowItems.map(i => `• ${i.title}`).join("\n")}`
          : "Nothing due tomorrow - planning day?"
      },
      ...(becameOverdue.length > 0 ? [{
        title: "Rolled Over",
        content: `⚠️ ${becameOverdue.length} item${becameOverdue.length !== 1 ? 's' : ''} became overdue today`
      }] : [])
    ],
    suggestedActions: [
      ...(habitStatus.some(h => !h.done)
        ? [{ label: "Log remaining habits", action: "navigate", params: { to: "/habits" } }]
        : []),
      ...(becameOverdue.length > 0
        ? [{ label: "Reschedule overdue items", action: "batch_reschedule", params: { items: becameOverdue } }]
        : []),
      { label: "Plan tomorrow", action: "navigate", params: { to: "/tomorrow" } }
    ],
    closingMessage: generateEveningClose(ctx, todaysCompletions.length)
  };
}

function generateEveningClose(ctx: UserContext, completedCount: number): string {
  if (completedCount >= 5) {
    return "Productive day! 💪 Rest well tonight.";
  } else if (completedCount >= 2) {
    return "Solid progress today. See you tomorrow!";
  } else if (ctx.calendar.meetingsToday.length > 4) {
    return "Meeting-heavy day. Tomorrow's a fresh start.";
  } else {
    return "Some days are like this. Tomorrow's a new opportunity.";
  }
}
```

---

## Part 5: Wellbeing & Balance

### 5.1 Burnout Prevention

```typescript
// src/lib/ai/proactive/wellbeing.ts

interface WellbeingIndicators {
  workloadTrend: "increasing" | "stable" | "decreasing";
  averageWorkHours: number;
  weekendWork: boolean;
  lateNightSessions: number;
  breaksTaken: number;
  focusSessionAverageLength: number;
  streakPressure: number; // How many long streaks they're maintaining
}

async function assessWellbeing(userId: string): Promise<WellbeingAssessment> {
  const indicators = await calculateWellbeingIndicators(userId);
  const warnings: WellbeingWarning[] = [];

  // Check for overwork
  if (indicators.averageWorkHours > 10) {
    warnings.push({
      type: "overwork",
      severity: indicators.averageWorkHours > 12 ? "high" : "medium",
      message: `You've averaged ${indicators.averageWorkHours.toFixed(1)} hours/day this week. Consider protecting some rest time.`
    });
  }

  // Check for lack of breaks
  if (indicators.focusSessionAverageLength > 90 && indicators.breaksTaken < 2) {
    warnings.push({
      type: "no_breaks",
      severity: "medium",
      message: "Long focus sessions without breaks can reduce effectiveness. Try the Pomodoro technique?"
    });
  }

  // Check for weekend work
  if (indicators.weekendWork && indicators.workloadTrend === "increasing") {
    warnings.push({
      type: "weekend_work",
      severity: "low",
      message: "You worked this weekend and your workload is still increasing. Might be time to discuss capacity with your team."
    });
  }

  // Check for late nights
  if (indicators.lateNightSessions >= 3) {
    warnings.push({
      type: "late_nights",
      severity: "medium",
      message: `${indicators.lateNightSessions} late-night sessions this week. Sleep is crucial for productivity!`
    });
  }

  // Check for streak pressure
  if (indicators.streakPressure > 3) {
    warnings.push({
      type: "streak_pressure",
      severity: "low",
      message: "You're maintaining many long streaks. It's okay to take a break - don't let habits become stress."
    });
  }

  return {
    indicators,
    warnings,
    overallStatus: calculateOverallWellbeing(warnings),
    suggestions: generateWellbeingSuggestions(warnings, indicators)
  };
}

export const wellbeingCheckTrigger: Trigger = {
  type: "wellbeing_check",
  priority: "low",
  cooldown: 7 * 24 * 60, // Weekly
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      const assessment = await assessWellbeing(ctx.userId);
      return assessment.warnings.length > 0;
    },
    getDetails: async (ctx) => assessWellbeing(ctx.userId)
  },

  action: {
    type: "suggest",
    content: (details) => ({
      title: "Wellbeing Check-in",
      message: details.warnings[0].message,
      suggestions: details.suggestions.map(s => ({
        label: s.label,
        action: s.action
      })),
      priority: "low"
    })
  }
};
```

### 5.2 Focus Protection

```typescript
// src/lib/ai/proactive/focusProtection.ts

export const focusProtectionTrigger: Trigger = {
  type: "focus_protection",
  priority: "low",
  cooldown: 60, // Every hour during focus
  userCanDisable: true,

  condition: {
    evaluate: async (ctx) => {
      // Check if user is in a focus session
      if (!ctx.recentActivity.currentFocusSession) return false;

      const session = ctx.recentActivity.currentFocusSession;
      const sessionMinutes = differenceInMinutes(new Date(), session.startedAt);

      // Trigger check-in at session milestones
      return sessionMinutes === 25 || sessionMinutes === 50 || sessionMinutes === 75;
    },

    getDetails: async (ctx) => ({
      session: ctx.recentActivity.currentFocusSession,
      duration: differenceInMinutes(new Date(), ctx.recentActivity.currentFocusSession!.startedAt)
    })
  },

  action: {
    type: "ask",
    content: (details) => {
      if (details.duration === 25) {
        return {
          title: "Focus Check",
          message: "25 minutes in! Take a 5-minute break?",
          suggestions: [
            { label: "Break time", action: "start_break", params: { minutes: 5 } },
            { label: "Keep going", action: "dismiss" }
          ],
          priority: "low"
        };
      } else if (details.duration === 50) {
        return {
          title: "Extended Focus",
          message: "50 minutes of focus! Definitely time for a break.",
          suggestions: [
            { label: "Take 10 min break", action: "start_break", params: { minutes: 10 } },
            { label: "End session", action: "end_focus_session" },
            { label: "Keep pushing", action: "dismiss" }
          ],
          priority: "low"
        };
      } else {
        return {
          title: "Long Session",
          message: "75+ minutes of focus. Great work! Consider wrapping up this session.",
          suggestions: [
            { label: "End session", action: "end_focus_session" },
            { label: "5 more minutes", action: "snooze", params: { minutes: 5 } }
          ],
          priority: "medium"
        };
      }
    }
  }
};
```

---

## Part 6: Implementation Timeline

### Week 1: Trigger Framework
- [ ] Define trigger types and interfaces
- [ ] Implement trigger registry
- [ ] Build trigger evaluation engine
- [ ] Implement cooldown management
- [ ] Create event bus for system events

### Week 2: Core Triggers
- [ ] Deadline triggers (approaching, at-risk, overdue)
- [ ] Capacity triggers
- [ ] Habit/streak triggers
- [ ] Goal drift triggers

### Week 3: Notification System
- [ ] Multi-channel notification framework
- [ ] In-app notification components
- [ ] Push notification integration
- [ ] Notification preferences UI
- [ ] Quiet hours handling

### Week 4: Auto-Actions & Check-ins
- [ ] Auto-action framework
- [ ] Implement core auto-actions
- [ ] User-configurable automation rules
- [ ] Morning/midday/evening check-ins
- [ ] Weekly review automation

### Week 5: Wellbeing & Polish
- [ ] Wellbeing assessment system
- [ ] Focus protection features
- [ ] Burnout prevention triggers
- [ ] Testing & refinement
- [ ] User preference management

---

## Part 7: Success Metrics

### Engagement
- [ ] 70%+ users engage with proactive notifications
- [ ] 50%+ take suggested actions
- [ ] < 10% disable proactive features

### Prevention
- [ ] 30% reduction in missed deadlines
- [ ] 25% improvement in habit completion
- [ ] Fewer "surprise" overdue items

### Satisfaction
- [ ] Users report feeling "in control"
- [ ] Reduced anxiety about forgetting things
- [ ] Positive sentiment in feedback

---

## Summary

Phase 3 transforms the AI from an intelligent responder (Phase 2) into a proactive partner that:

1. **Anticipates problems** before they occur
2. **Surfaces opportunities** at the right moment
3. **Automates routine decisions** with user control
4. **Protects wellbeing** and prevents burnout
5. **Maintains context** without requiring constant input

This sets the stage for Phase 4 (Learning) where the AI continuously improves from experience.
