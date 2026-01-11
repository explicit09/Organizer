# Phase 2: Intelligence Layer - Detailed Implementation Plan

## Vision

Build on Phase 1's agentic foundation to create an AI that **understands context deeply** and provides **genuinely intelligent assistance**. The AI should feel like a smart executive assistant who knows your situation, anticipates needs, and provides actionable guidance.

---

## Core Philosophy

Phase 1 gave us reliable tool execution. Phase 2 makes the AI **smart about when and how to use those tools**.

**Key Principle:** The AI should understand:
- **What** you're trying to accomplish (goals, projects, deadlines)
- **Where** you are right now (current state, blockers, momentum)
- **When** is the best time for different activities (patterns, energy, calendar)
- **Why** certain things matter more than others (dependencies, impact, alignment)
- **How** to help you make progress (suggestions, prioritization, unblocking)

---

## Part 1: Context Engine

### 1.1 The Context Model

The AI needs a rich understanding of the user's situation at any moment. We'll build a **Context Engine** that assembles this picture.

```typescript
// src/lib/ai/context/types.ts

interface UserContext {
  // Temporal Context
  temporal: {
    now: Date;
    dayOfWeek: string;
    timeOfDay: "early_morning" | "morning" | "midday" | "afternoon" | "evening" | "night";
    weekOfYear: number;
    isWeekend: boolean;
    isHoliday: boolean;
    daysUntilEndOfWeek: number;
    daysUntilEndOfMonth: number;
  };

  // Workload Context
  workload: {
    // Current state
    totalOpenItems: number;
    itemsByStatus: Record<string, number>;
    itemsByPriority: Record<string, number>;
    overdueCount: number;
    dueTodayCount: number;
    dueThisWeekCount: number;

    // Capacity assessment
    estimatedHoursRemaining: number;
    availableHoursThisWeek: number;
    capacityUtilization: number; // 0-1, >1 means overloaded

    // Momentum
    completedToday: number;
    completedThisWeek: number;
    streakDays: number; // consecutive days with completions
  };

  // Calendar Context
  calendar: {
    meetingsToday: CalendarEvent[];
    meetingsThisWeek: CalendarEvent[];
    freeBlocksToday: TimeBlock[];
    freeBlocksThisWeek: TimeBlock[];
    nextMeeting: CalendarEvent | null;
    minutesUntilNextMeeting: number | null;
    totalMeetingHoursThisWeek: number;
    longestFreeBlock: TimeBlock | null;
  };

  // Priority Context
  priorities: {
    criticalItems: Item[]; // Urgent + High priority
    blockingItems: Item[]; // Items that block others
    blockedItems: Item[]; // Items waiting on dependencies
    quickWins: Item[]; // Low effort, can complete soon
    atRiskDeadlines: Item[]; // Deadlines likely to be missed
  };

  // Goal Context
  goals: {
    activeGoals: Goal[];
    goalProgress: Record<string, number>; // goalId -> progress %
    neglectedAreas: string[]; // Life areas with no recent activity
    alignedWorkThisWeek: number; // % of work aligned to goals
  };

  // Pattern Context (from Phase 1 learning)
  patterns: {
    productiveHours: string[]; // e.g., ["9am-11am", "2pm-4pm"]
    averageTaskDuration: number;
    estimationAccuracy: number; // How accurate are time estimates
    completionRateByDay: Record<string, number>;
    commonBlockers: string[];
    focusSessionAverage: number; // minutes
  };

  // Recent Activity Context
  recentActivity: {
    lastActiveAt: Date;
    lastCompletedItem: Item | null;
    lastCreatedItem: Item | null;
    recentlyViewed: Item[];
    currentFocusSession: FocusSession | null;
    todaysCompletions: Item[];
  };

  // Habit Context
  habits: {
    todaysHabits: HabitWithStatus[];
    streaks: Record<string, number>; // habitId -> streak days
    habitCompletionRate: number; // This week
    missedHabitsToday: Habit[];
  };

  // User Preferences (from Phase 1)
  preferences: UserPreference[];

  // Remembered Context
  memory: {
    recentTopics: string[];
    ongoingProjects: string[];
    mentionedConstraints: string[];
    expressedFrustrations: string[];
  };
}
```

### 1.2 Context Assembly

```typescript
// src/lib/ai/context/assembler.ts

export async function assembleContext(userId: string): Promise<UserContext> {
  // Parallel fetch all context sources
  const [
    temporalCtx,
    workloadCtx,
    calendarCtx,
    priorityCtx,
    goalCtx,
    patternCtx,
    activityCtx,
    habitCtx,
    preferences,
    memory
  ] = await Promise.all([
    getTemporalContext(),
    getWorkloadContext(userId),
    getCalendarContext(userId),
    getPriorityContext(userId),
    getGoalContext(userId),
    getPatternContext(userId),
    getRecentActivityContext(userId),
    getHabitContext(userId),
    getUserPreferences(userId),
    getMemoryContext(userId)
  ]);

  return {
    temporal: temporalCtx,
    workload: workloadCtx,
    calendar: calendarCtx,
    priorities: priorityCtx,
    goals: goalCtx,
    patterns: patternCtx,
    recentActivity: activityCtx,
    habits: habitCtx,
    preferences,
    memory
  };
}

// Individual context builders
async function getWorkloadContext(userId: string): Promise<WorkloadContext> {
  const items = await listItems(undefined, { userId });
  const openItems = items.filter(i => i.status !== "completed");

  const now = new Date();
  const endOfWeek = getEndOfWeek(now);

  // Calculate estimated hours
  const estimatedMinutes = openItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30), 0);
  const estimatedHours = estimatedMinutes / 60;

  // Get available hours from calendar
  const freeBlocks = await getFreeTimeBlocks(userId, now, endOfWeek);
  const availableHours = freeBlocks.reduce((sum, b) => sum + b.durationMinutes, 0) / 60;

  // Count completions
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const completedToday = items.filter(i =>
    i.status === "completed" &&
    new Date(i.updatedAt) >= todayStart
  ).length;
  const completedThisWeek = items.filter(i =>
    i.status === "completed" &&
    new Date(i.updatedAt) >= weekStart
  ).length;

  return {
    totalOpenItems: openItems.length,
    itemsByStatus: groupBy(openItems, 'status'),
    itemsByPriority: groupBy(openItems, 'priority'),
    overdueCount: openItems.filter(i => i.dueAt && new Date(i.dueAt) < now).length,
    dueTodayCount: openItems.filter(i => isToday(i.dueAt)).length,
    dueThisWeekCount: openItems.filter(i => isThisWeek(i.dueAt)).length,
    estimatedHoursRemaining: estimatedHours,
    availableHoursThisWeek: availableHours,
    capacityUtilization: estimatedHours / Math.max(availableHours, 1),
    completedToday,
    completedThisWeek,
    streakDays: await calculateCompletionStreak(userId)
  };
}

async function getPriorityContext(userId: string): Promise<PriorityContext> {
  const items = await listItems(undefined, { userId });
  const openItems = items.filter(i => i.status !== "completed");
  const dependencies = await getAllDependencies(userId);

  // Find blocking items (items that block other items)
  const blockingItemIds = new Set(dependencies.map(d => d.blockerId));
  const blockedItemIds = new Set(dependencies.map(d => d.blockedId));

  // Critical = urgent or high priority
  const criticalItems = openItems.filter(i =>
    i.priority === "urgent" || i.priority === "high"
  );

  // Blocking = blocks other work
  const blockingItems = openItems.filter(i => blockingItemIds.has(i.id));

  // Blocked = waiting on something
  const blockedItems = openItems.filter(i => blockedItemIds.has(i.id));

  // Quick wins = low estimated time, not blocked
  const quickWins = openItems.filter(i =>
    (i.estimatedMinutes || 30) <= 30 &&
    !blockedItemIds.has(i.id)
  );

  // At risk = due soon but not enough time
  const atRiskDeadlines = openItems.filter(i => {
    if (!i.dueAt) return false;
    const hoursUntilDue = (new Date(i.dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
    const estimatedHours = (i.estimatedMinutes || 60) / 60;
    return hoursUntilDue < estimatedHours * 2; // Less than 2x buffer
  });

  return {
    criticalItems: criticalItems.slice(0, 10),
    blockingItems: blockingItems.slice(0, 10),
    blockedItems: blockedItems.slice(0, 10),
    quickWins: quickWins.slice(0, 5),
    atRiskDeadlines: atRiskDeadlines.slice(0, 5)
  };
}
```

### 1.3 Context-Aware System Prompt

```typescript
// src/lib/ai/prompts/contextual.ts

export function buildIntelligentPrompt(context: UserContext): string {
  const sections: string[] = [];

  // Opening with situational awareness
  sections.push(`## Current Situation

It's ${context.temporal.timeOfDay} on ${context.temporal.dayOfWeek}. ${getTimeBasedGreeting(context)}`);

  // Workload assessment
  sections.push(buildWorkloadSection(context));

  // What needs attention
  sections.push(buildAttentionSection(context));

  // Opportunities and suggestions
  sections.push(buildOpportunitiesSection(context));

  // Behavioral guidance
  sections.push(buildGuidanceSection(context));

  return sections.join("\n\n");
}

function buildWorkloadSection(ctx: UserContext): string {
  const { workload } = ctx;

  let assessment: string;
  if (workload.capacityUtilization > 1.5) {
    assessment = "⚠️ **Significantly overloaded** - more work than available time this week.";
  } else if (workload.capacityUtilization > 1.0) {
    assessment = "⚡ **At capacity** - need to prioritize carefully.";
  } else if (workload.capacityUtilization > 0.7) {
    assessment = "✅ **Healthy workload** - good balance of work and buffer.";
  } else {
    assessment = "🎯 **Light workload** - capacity for new initiatives.";
  }

  return `## Workload Assessment

${assessment}

- Open items: ${workload.totalOpenItems}
- Overdue: ${workload.overdueCount}
- Due today: ${workload.dueTodayCount}
- Due this week: ${workload.dueThisWeekCount}
- Estimated hours remaining: ${workload.estimatedHoursRemaining.toFixed(1)}h
- Available hours this week: ${workload.availableHoursThisWeek.toFixed(1)}h
- Today's completions: ${workload.completedToday}
- Week's completions: ${workload.completedThisWeek}
${workload.streakDays > 0 ? `- 🔥 ${workload.streakDays} day completion streak!` : ''}`;
}

function buildAttentionSection(ctx: UserContext): string {
  const items: string[] = [];

  // Overdue items
  if (ctx.workload.overdueCount > 0) {
    items.push(`🚨 **${ctx.workload.overdueCount} overdue items** need immediate attention`);
  }

  // At-risk deadlines
  if (ctx.priorities.atRiskDeadlines.length > 0) {
    const names = ctx.priorities.atRiskDeadlines.slice(0, 3).map(i => i.title).join(", ");
    items.push(`⚠️ **At-risk deadlines**: ${names}`);
  }

  // Blocking items
  if (ctx.priorities.blockingItems.length > 0) {
    const count = ctx.priorities.blockingItems.length;
    const blocked = ctx.priorities.blockedItems.length;
    items.push(`🔗 **${count} blocking items** are holding up ${blocked} other tasks`);
  }

  // Neglected goals
  if (ctx.goals.neglectedAreas.length > 0) {
    items.push(`📊 **Neglected areas**: ${ctx.goals.neglectedAreas.join(", ")} - no activity this week`);
  }

  // Missed habits
  if (ctx.habits.missedHabitsToday.length > 0) {
    const names = ctx.habits.missedHabitsToday.map(h => h.name).join(", ");
    items.push(`💪 **Habits pending today**: ${names}`);
  }

  if (items.length === 0) {
    items.push("✨ **All clear** - no urgent issues right now");
  }

  return `## Needs Attention

${items.join("\n")}`;
}

function buildOpportunitiesSection(ctx: UserContext): string {
  const opportunities: string[] = [];

  // Quick wins available
  if (ctx.priorities.quickWins.length > 0) {
    opportunities.push(`💨 **Quick wins available**: ${ctx.priorities.quickWins.length} tasks under 30 minutes`);
  }

  // Free time coming up
  if (ctx.calendar.longestFreeBlock) {
    const block = ctx.calendar.longestFreeBlock;
    opportunities.push(`🕐 **Focus time**: ${block.durationMinutes} minute block available at ${formatTime(block.start)}`);
  }

  // Good time for deep work (based on patterns)
  if (ctx.patterns.productiveHours.includes(getCurrentHourSlot())) {
    opportunities.push(`🧠 **Peak productivity time** - great for challenging tasks`);
  }

  // Habit streaks to maintain
  const longStreaks = Object.entries(ctx.habits.streaks)
    .filter(([_, days]) => days >= 7)
    .map(([id, days]) => ({ id, days }));
  if (longStreaks.length > 0) {
    opportunities.push(`🔥 **Streaks to protect**: ${longStreaks.length} habits with 7+ day streaks`);
  }

  return `## Opportunities

${opportunities.length > 0 ? opportunities.join("\n") : "Looking for opportunities..."}`;
}
```

---

## Part 2: Intelligent Features

### 2.1 Morning Briefing System

```typescript
// src/lib/ai/features/briefing.ts

interface BriefingConfig {
  includeWeather?: boolean;
  includeCalendar: boolean;
  includePriorities: boolean;
  includeHabits: boolean;
  includeInsights: boolean;
  maxItems: number;
}

export async function generateMorningBriefing(
  userId: string,
  config: BriefingConfig = defaultConfig
): Promise<Briefing> {
  const context = await assembleContext(userId);

  const briefing: Briefing = {
    greeting: generateGreeting(context),
    date: formatDate(new Date()),
    sections: []
  };

  // Calendar overview
  if (config.includeCalendar) {
    briefing.sections.push({
      title: "Today's Schedule",
      type: "calendar",
      content: generateCalendarSection(context)
    });
  }

  // Priority items
  if (config.includePriorities) {
    briefing.sections.push({
      title: "Top Priorities",
      type: "priorities",
      content: generatePrioritySection(context)
    });
  }

  // Habits check-in
  if (config.includeHabits) {
    briefing.sections.push({
      title: "Habits",
      type: "habits",
      content: generateHabitsSection(context)
    });
  }

  // AI insights
  if (config.includeInsights) {
    briefing.sections.push({
      title: "Insights",
      type: "insights",
      content: await generateInsightsSection(context)
    });
  }

  // Suggested focus
  briefing.suggestedFocus = determineSuggestedFocus(context);

  return briefing;
}

function generateGreeting(ctx: UserContext): string {
  const greetings = {
    early_morning: "Early bird! Here's what's ahead today.",
    morning: "Good morning! Ready to make today count?",
    midday: "Good afternoon! Here's where you stand.",
    afternoon: "Afternoon check-in. Let's finish strong.",
    evening: "Evening review. Here's how today went.",
    night: "Burning the midnight oil? Here's a quick overview."
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

function generatePrioritySection(ctx: UserContext): PrioritySectionContent {
  const priorities: PriorityItem[] = [];

  // 1. Overdue items first
  const overdue = ctx.priorities.criticalItems.filter(i =>
    i.dueAt && new Date(i.dueAt) < new Date()
  );
  overdue.forEach(item => {
    priorities.push({
      item,
      reason: "Overdue",
      urgency: "critical",
      suggestion: "Handle immediately or reschedule"
    });
  });

  // 2. Blocking items
  ctx.priorities.blockingItems.forEach(item => {
    if (!priorities.find(p => p.item.id === item.id)) {
      const blockedCount = ctx.priorities.blockedItems.filter(b =>
        isBlockedBy(b.id, item.id)
      ).length;
      priorities.push({
        item,
        reason: `Blocks ${blockedCount} other task${blockedCount > 1 ? 's' : ''}`,
        urgency: "high",
        suggestion: "Complete to unblock other work"
      });
    }
  });

  // 3. Due today
  const dueToday = ctx.priorities.criticalItems.filter(i =>
    i.dueAt && isToday(new Date(i.dueAt))
  );
  dueToday.forEach(item => {
    if (!priorities.find(p => p.item.id === item.id)) {
      priorities.push({
        item,
        reason: "Due today",
        urgency: "high",
        suggestion: estimateFitInSchedule(item, ctx)
      });
    }
  });

  // 4. At-risk deadlines
  ctx.priorities.atRiskDeadlines.forEach(item => {
    if (!priorities.find(p => p.item.id === item.id)) {
      priorities.push({
        item,
        reason: "Deadline at risk",
        urgency: "medium",
        suggestion: "Needs attention soon or scope reduction"
      });
    }
  });

  return {
    items: priorities.slice(0, 5),
    totalCritical: priorities.filter(p => p.urgency === "critical").length,
    totalOpen: ctx.workload.totalOpenItems
  };
}

async function generateInsightsSection(ctx: UserContext): Promise<InsightsSectionContent> {
  const insights: Insight[] = [];

  // Workload insight
  if (ctx.workload.capacityUtilization > 1.0) {
    const excess = Math.round((ctx.workload.capacityUtilization - 1) * ctx.workload.availableHoursThisWeek);
    insights.push({
      type: "warning",
      title: "Overcommitted",
      message: `You have ~${excess} more hours of work than available time. Consider deferring ${Math.ceil(excess / 2)} tasks.`,
      action: {
        label: "Help me prioritize",
        prompt: "Help me decide which tasks to defer this week"
      }
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
        prompt: "Help me align my tasks with my goals"
      }
    });
  }

  // Pattern-based insight
  if (ctx.patterns.productiveHours.length > 0) {
    const currentHour = new Date().getHours();
    const inProductiveTime = ctx.patterns.productiveHours.some(h => isInHourRange(currentHour, h));

    if (inProductiveTime && ctx.priorities.criticalItems.length > 0) {
      insights.push({
        type: "suggestion",
        title: "Prime time",
        message: "You're in your peak productivity hours. Tackle something challenging!",
        action: {
          label: "Start focus session",
          prompt: `Start a focus session on "${ctx.priorities.criticalItems[0].title}"`
        }
      });
    }
  }

  // Streak protection
  const atRiskStreaks = Object.entries(ctx.habits.streaks)
    .filter(([id, days]) => days >= 5 && ctx.habits.missedHabitsToday.some(h => h.id === id));

  if (atRiskStreaks.length > 0) {
    insights.push({
      type: "warning",
      title: "Streak at risk",
      message: `Your ${atRiskStreaks[0][1]}-day streak is at risk! Don't forget today's habit.`,
      action: {
        label: "Log habit",
        prompt: "Log my habit completion"
      }
    });
  }

  return { insights };
}
```

### 2.2 Smart Rescheduling Engine

```typescript
// src/lib/ai/features/rescheduling.ts

interface RescheduleContext {
  item: Item;
  reason: "missed" | "conflict" | "user_request" | "cascade";
  constraints?: {
    notBefore?: Date;
    notAfter?: Date;
    preferredTimes?: string[];
    avoidDays?: string[];
  };
}

interface RescheduleOption {
  newDueAt: Date;
  confidence: number; // 0-1
  reasoning: string;
  impact: {
    conflictsCreated: number;
    cascadeEffects: Item[];
    capacityChange: number;
  };
}

export async function suggestReschedule(
  userId: string,
  ctx: RescheduleContext
): Promise<RescheduleOption[]> {
  const context = await assembleContext(userId);
  const options: RescheduleOption[] = [];

  const { item, constraints } = ctx;
  const estimatedHours = (item.estimatedMinutes || 60) / 60;

  // Strategy 1: Find next available slot that fits
  const freeSlots = await findFreeSlots(userId, estimatedHours, constraints);

  for (const slot of freeSlots.slice(0, 3)) {
    const impact = await calculateRescheduleImpact(item, slot.start, context);

    options.push({
      newDueAt: slot.start,
      confidence: calculateConfidence(slot, item, context),
      reasoning: generateReasoning(slot, item, context),
      impact
    });
  }

  // Strategy 2: Suggest deadline extension if no good slots
  if (options.every(o => o.confidence < 0.5)) {
    const extendedDeadline = suggestExtendedDeadline(item, context);
    const impact = await calculateRescheduleImpact(item, extendedDeadline, context);

    options.push({
      newDueAt: extendedDeadline,
      confidence: 0.7,
      reasoning: "Extending deadline to allow proper completion without rushing",
      impact
    });
  }

  // Sort by confidence
  return options.sort((a, b) => b.confidence - a.confidence);
}

async function findFreeSlots(
  userId: string,
  requiredHours: number,
  constraints?: RescheduleContext["constraints"]
): Promise<TimeSlot[]> {
  const now = new Date();
  const lookAhead = addDays(now, 14); // Look 2 weeks ahead

  // Get calendar events
  const events = await getCalendarEvents(userId, now, lookAhead);

  // Get user's work hours preference
  const preferences = await getUserPreferences(userId);
  const workHours = preferences.find(p => p.key === "work_hours")?.value || "9-17";

  // Find gaps
  const slots: TimeSlot[] = [];
  let currentDate = now;

  while (currentDate < lookAhead && slots.length < 10) {
    // Skip if constraint says to avoid this day
    if (constraints?.avoidDays?.includes(getDayName(currentDate))) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Get free blocks for this day
    const dayBlocks = findDayFreeBlocks(currentDate, events, workHours);

    for (const block of dayBlocks) {
      // Check if block is big enough
      if (block.durationMinutes >= requiredHours * 60) {
        // Check constraints
        if (constraints?.notBefore && block.start < constraints.notBefore) continue;
        if (constraints?.notAfter && block.end > constraints.notAfter) continue;

        slots.push({
          start: block.start,
          end: block.end,
          durationMinutes: block.durationMinutes,
          quality: calculateSlotQuality(block, preferences)
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // Sort by quality (considers user preferences, time of day, etc.)
  return slots.sort((a, b) => b.quality - a.quality);
}

function calculateConfidence(slot: TimeSlot, item: Item, ctx: UserContext): number {
  let confidence = 0.5;

  // Boost if slot is in user's productive hours
  if (ctx.patterns.productiveHours.some(h => isInHourRange(slot.start.getHours(), h))) {
    confidence += 0.2;
  }

  // Boost if slot has buffer (longer than needed)
  const neededMinutes = item.estimatedMinutes || 60;
  if (slot.durationMinutes > neededMinutes * 1.5) {
    confidence += 0.15;
  }

  // Reduce if it's a weekend and item is work-related
  if (isWeekend(slot.start) && item.type === "task") {
    confidence -= 0.1;
  }

  // Reduce if far in the future (urgency decay)
  const daysAway = differenceInDays(slot.start, new Date());
  if (daysAway > 7) {
    confidence -= 0.1;
  }

  // Boost if aligned with preferred times
  const preferences = ctx.preferences.find(p => p.key === "preferred_work_time");
  if (preferences && slot.start.getHours() === parseInt(preferences.value)) {
    confidence += 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}

async function calculateRescheduleImpact(
  item: Item,
  newDueAt: Date,
  ctx: UserContext
): Promise<RescheduleOption["impact"]> {
  // Check for conflicts at new time
  const conflicts = ctx.calendar.meetingsToday.filter(m =>
    doTimesOverlap(m.start, m.end, newDueAt, addMinutes(newDueAt, item.estimatedMinutes || 60))
  );

  // Check cascade effects (items depending on this one)
  const dependentItems = ctx.priorities.blockedItems.filter(i =>
    isBlockedBy(i.id, item.id)
  );

  const cascadeEffects = dependentItems.filter(dep => {
    // If this item moves, does the dependent item's deadline become at risk?
    return dep.dueAt && new Date(dep.dueAt) < addDays(newDueAt, 1);
  });

  // Calculate capacity change
  const oldDate = item.dueAt ? new Date(item.dueAt) : new Date();
  const oldWeek = getWeekNumber(oldDate);
  const newWeek = getWeekNumber(newDueAt);

  let capacityChange = 0;
  if (oldWeek !== newWeek) {
    // Moving work between weeks changes capacity
    capacityChange = (item.estimatedMinutes || 60) / 60;
  }

  return {
    conflictsCreated: conflicts.length,
    cascadeEffects,
    capacityChange
  };
}
```

### 2.3 Dependency Intelligence

```typescript
// src/lib/ai/features/dependencies.ts

interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: DependencyEdge[];
  criticalPath: string[]; // Item IDs in critical path order
  blockedChains: BlockedChain[];
}

interface GraphNode {
  item: Item;
  inDegree: number; // Number of items blocking this
  outDegree: number; // Number of items this blocks
  depth: number; // Distance from root (no blockers)
  isCritical: boolean;
  estimatedUnblockDate: Date | null;
}

interface BlockedChain {
  rootBlocker: Item; // The item at the top of the chain
  chainLength: number;
  totalBlockedItems: number;
  totalBlockedHours: number;
  unblockImpact: string; // Human readable impact
}

export async function analyzeDependencies(userId: string): Promise<DependencyGraph> {
  const items = await listItems(undefined, { userId });
  const openItems = items.filter(i => i.status !== "completed");
  const dependencies = await getAllDependencies(userId);

  // Build graph
  const nodes = new Map<string, GraphNode>();
  const edges: DependencyEdge[] = [];

  // Initialize nodes
  for (const item of openItems) {
    nodes.set(item.id, {
      item,
      inDegree: 0,
      outDegree: 0,
      depth: 0,
      isCritical: false,
      estimatedUnblockDate: null
    });
  }

  // Add edges and calculate degrees
  for (const dep of dependencies) {
    const blocker = nodes.get(dep.blockerId);
    const blocked = nodes.get(dep.blockedId);

    if (blocker && blocked) {
      blocker.outDegree++;
      blocked.inDegree++;
      edges.push({
        from: dep.blockerId,
        to: dep.blockedId,
        type: dep.type || "blocks"
      });
    }
  }

  // Calculate depths using BFS
  const roots = [...nodes.values()].filter(n => n.inDegree === 0);
  const queue = roots.map(n => ({ node: n, depth: 0 }));

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    node.depth = Math.max(node.depth, depth);

    // Find items this node blocks
    const blockedIds = edges.filter(e => e.from === node.item.id).map(e => e.to);
    for (const blockedId of blockedIds) {
      const blockedNode = nodes.get(blockedId);
      if (blockedNode) {
        queue.push({ node: blockedNode, depth: depth + 1 });
      }
    }
  }

  // Find critical path
  const criticalPath = findCriticalPath(nodes, edges);

  // Mark critical nodes
  for (const itemId of criticalPath) {
    const node = nodes.get(itemId);
    if (node) node.isCritical = true;
  }

  // Estimate unblock dates
  for (const node of nodes.values()) {
    node.estimatedUnblockDate = estimateUnblockDate(node, nodes, edges);
  }

  // Find blocked chains
  const blockedChains = findBlockedChains(nodes, edges);

  return {
    nodes,
    edges,
    criticalPath,
    blockedChains
  };
}

function findCriticalPath(
  nodes: Map<string, GraphNode>,
  edges: DependencyEdge[]
): string[] {
  // Critical path = longest chain of dependencies
  // Uses dynamic programming approach

  const memo = new Map<string, { length: number; path: string[] }>();

  function dfs(nodeId: string): { length: number; path: string[] } {
    if (memo.has(nodeId)) return memo.get(nodeId)!;

    const node = nodes.get(nodeId);
    if (!node) return { length: 0, path: [] };

    // Find all items this blocks
    const blockedIds = edges.filter(e => e.from === nodeId).map(e => e.to);

    if (blockedIds.length === 0) {
      // Leaf node
      const result = { length: 1, path: [nodeId] };
      memo.set(nodeId, result);
      return result;
    }

    // Find longest path through children
    let longest = { length: 0, path: [] as string[] };
    for (const blockedId of blockedIds) {
      const childResult = dfs(blockedId);
      if (childResult.length > longest.length) {
        longest = childResult;
      }
    }

    const result = {
      length: longest.length + 1,
      path: [nodeId, ...longest.path]
    };
    memo.set(nodeId, result);
    return result;
  }

  // Start from all roots and find the longest overall path
  const roots = [...nodes.values()].filter(n => n.inDegree === 0);
  let criticalPath: string[] = [];

  for (const root of roots) {
    const result = dfs(root.item.id);
    if (result.path.length > criticalPath.length) {
      criticalPath = result.path;
    }
  }

  return criticalPath;
}

function findBlockedChains(
  nodes: Map<string, GraphNode>,
  edges: DependencyEdge[]
): BlockedChain[] {
  const chains: BlockedChain[] = [];

  // Find root blockers (items that block others but aren't blocked themselves)
  const rootBlockers = [...nodes.values()].filter(n =>
    n.outDegree > 0 && n.inDegree === 0
  );

  for (const root of rootBlockers) {
    // BFS to find all downstream blocked items
    const visited = new Set<string>();
    const queue = [root.item.id];
    let totalItems = 0;
    let totalHours = 0;
    let maxDepth = 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = nodes.get(currentId);
      if (!node) continue;

      totalItems++;
      totalHours += (node.item.estimatedMinutes || 60) / 60;
      maxDepth = Math.max(maxDepth, node.depth);

      // Add blocked items to queue
      const blockedIds = edges.filter(e => e.from === currentId).map(e => e.to);
      queue.push(...blockedIds);
    }

    // Don't count the root itself
    totalItems--;
    totalHours -= (root.item.estimatedMinutes || 60) / 60;

    if (totalItems > 0) {
      chains.push({
        rootBlocker: root.item,
        chainLength: maxDepth,
        totalBlockedItems: totalItems,
        totalBlockedHours: totalHours,
        unblockImpact: `Completing "${root.item.title}" unblocks ${totalItems} tasks (${totalHours.toFixed(1)}h of work)`
      });
    }
  }

  // Sort by impact (total blocked hours)
  return chains.sort((a, b) => b.totalBlockedHours - a.totalBlockedHours);
}

// Tool for the AI to use
export const analyzeDependenciesTool = {
  name: "analyze_dependencies",
  description: "Analyze the dependency graph to understand what blocks what, find critical paths, and identify high-impact items to unblock.",
  input_schema: {
    type: "object",
    properties: {
      focusItemId: {
        type: "string",
        description: "Optional - focus analysis on a specific item's dependency chain"
      },
      includeCompleted: {
        type: "boolean",
        default: false
      }
    }
  },
  execute: async (input: { focusItemId?: string; includeCompleted?: boolean }, ctx: { userId: string }) => {
    const graph = await analyzeDependencies(ctx.userId);

    return {
      summary: {
        totalNodes: graph.nodes.size,
        criticalPathLength: graph.criticalPath.length,
        blockedChains: graph.blockedChains.length
      },
      criticalPath: graph.criticalPath.map(id => {
        const node = graph.nodes.get(id);
        return {
          id,
          title: node?.item.title,
          status: node?.item.status,
          isCritical: true
        };
      }),
      highImpactBlockers: graph.blockedChains.slice(0, 5).map(chain => ({
        blocker: {
          id: chain.rootBlocker.id,
          title: chain.rootBlocker.title,
          status: chain.rootBlocker.status
        },
        impact: chain.unblockImpact,
        blockedCount: chain.totalBlockedItems,
        blockedHours: chain.totalBlockedHours
      })),
      recommendations: generateDependencyRecommendations(graph)
    };
  }
};

function generateDependencyRecommendations(graph: DependencyGraph): string[] {
  const recommendations: string[] = [];

  // Recommend tackling high-impact blockers
  if (graph.blockedChains.length > 0) {
    const topBlocker = graph.blockedChains[0];
    recommendations.push(
      `Focus on "${topBlocker.rootBlocker.title}" - it unblocks ${topBlocker.totalBlockedItems} other tasks`
    );
  }

  // Warn about long critical paths
  if (graph.criticalPath.length > 5) {
    recommendations.push(
      `Long dependency chain detected (${graph.criticalPath.length} items). Consider parallelizing some work.`
    );
  }

  // Find items close to being unblocked
  const almostUnblocked = [...graph.nodes.values()].filter(n =>
    n.inDegree === 1 &&
    n.item.status !== "completed"
  );
  if (almostUnblocked.length > 0) {
    const item = almostUnblocked[0];
    recommendations.push(
      `"${item.item.title}" is waiting on just 1 item - close to being unblocked`
    );
  }

  return recommendations;
}
```

### 2.4 Goal Alignment Engine

```typescript
// src/lib/ai/features/goalAlignment.ts

interface AlignmentAnalysis {
  overallAlignment: number; // 0-1
  byGoal: GoalAlignment[];
  byArea: AreaAlignment[];
  drift: DriftAnalysis;
  recommendations: AlignmentRecommendation[];
}

interface GoalAlignment {
  goal: Goal;
  alignedItems: Item[];
  alignedHours: number;
  progress: number;
  trend: "improving" | "stable" | "declining";
  projectedCompletion: Date | null;
}

interface AreaAlignment {
  area: string; // work, personal, health, etc.
  itemCount: number;
  hoursAllocated: number;
  percentageOfTotal: number;
  trend: "increasing" | "stable" | "decreasing";
  lastActivity: Date | null;
}

interface DriftAnalysis {
  isDrifting: boolean;
  driftDirection: string | null;
  driftSeverity: "low" | "medium" | "high";
  explanation: string;
}

export async function analyzeGoalAlignment(userId: string): Promise<AlignmentAnalysis> {
  const [items, goals, activity] = await Promise.all([
    listItems(undefined, { userId }),
    listGoals(userId),
    getRecentActivity(userId, 30) // Last 30 days
  ]);

  const openItems = items.filter(i => i.status !== "completed");
  const recentItems = items.filter(i => {
    const updated = new Date(i.updatedAt);
    return updated >= subDays(new Date(), 7);
  });

  // Analyze by goal
  const byGoal: GoalAlignment[] = goals.map(goal => {
    const alignedItems = openItems.filter(i => isAlignedWithGoal(i, goal));
    const alignedHours = alignedItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30) / 60, 0);

    // Calculate trend from recent activity
    const recentAligned = recentItems.filter(i => isAlignedWithGoal(i, goal));
    const previousPeriodAligned = items.filter(i => {
      const updated = new Date(i.updatedAt);
      return updated >= subDays(new Date(), 14) && updated < subDays(new Date(), 7) &&
             isAlignedWithGoal(i, goal);
    });

    const trend = recentAligned.length > previousPeriodAligned.length ? "improving" :
                  recentAligned.length < previousPeriodAligned.length ? "declining" : "stable";

    return {
      goal,
      alignedItems,
      alignedHours,
      progress: goal.currentValue / goal.targetValue,
      trend,
      projectedCompletion: projectCompletionDate(goal, activity)
    };
  });

  // Analyze by life area
  const areas = ["work", "personal", "health", "learning", "finance", "relationships", "side_projects"];
  const byArea: AreaAlignment[] = areas.map(area => {
    const areaItems = openItems.filter(i => i.area === area);
    const hoursAllocated = areaItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30) / 60, 0);
    const totalHours = openItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30) / 60, 0);

    const lastActivityItem = items
      .filter(i => i.area === area)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    return {
      area,
      itemCount: areaItems.length,
      hoursAllocated,
      percentageOfTotal: totalHours > 0 ? hoursAllocated / totalHours : 0,
      trend: calculateAreaTrend(area, activity),
      lastActivity: lastActivityItem ? new Date(lastActivityItem.updatedAt) : null
    };
  });

  // Detect drift
  const drift = detectDrift(byGoal, byArea, activity);

  // Calculate overall alignment
  const alignedWork = byGoal.reduce((sum, g) => sum + g.alignedHours, 0);
  const totalWork = openItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30) / 60, 0);
  const overallAlignment = totalWork > 0 ? alignedWork / totalWork : 0;

  // Generate recommendations
  const recommendations = generateAlignmentRecommendations(byGoal, byArea, drift);

  return {
    overallAlignment,
    byGoal,
    byArea,
    drift,
    recommendations
  };
}

function isAlignedWithGoal(item: Item, goal: Goal): boolean {
  // Check explicit link
  if (item.goalId === goal.id) return true;

  // Check area match
  if (item.area && goal.area && item.area === goal.area) return true;

  // Check project match (if goal is linked to project)
  if (item.projectId && goal.projectId && item.projectId === goal.projectId) return true;

  // Could add semantic matching here in the future
  return false;
}

function detectDrift(
  byGoal: GoalAlignment[],
  byArea: AreaAlignment[],
  activity: ActivityLog[]
): DriftAnalysis {
  // Check if recent work is misaligned with stated goals
  const decliningGoals = byGoal.filter(g => g.trend === "declining");
  const neglectedAreas = byArea.filter(a => {
    const daysSinceActivity = a.lastActivity
      ? differenceInDays(new Date(), a.lastActivity)
      : 999;
    return daysSinceActivity > 7 && a.itemCount > 0;
  });

  if (decliningGoals.length >= 2 || neglectedAreas.length >= 2) {
    return {
      isDrifting: true,
      driftDirection: neglectedAreas.length > 0
        ? `Away from ${neglectedAreas.map(a => a.area).join(", ")}`
        : "Away from stated goals",
      driftSeverity: decliningGoals.length >= 3 || neglectedAreas.length >= 3 ? "high" : "medium",
      explanation: `${decliningGoals.length} goals showing declining activity, ${neglectedAreas.length} life areas neglected`
    };
  }

  if (decliningGoals.length === 1 || neglectedAreas.length === 1) {
    return {
      isDrifting: true,
      driftDirection: neglectedAreas[0]?.area || decliningGoals[0]?.goal.name,
      driftSeverity: "low",
      explanation: "Slight drift detected - one area needs attention"
    };
  }

  return {
    isDrifting: false,
    driftDirection: null,
    driftSeverity: "low",
    explanation: "Work is well-aligned with goals"
  };
}

function generateAlignmentRecommendations(
  byGoal: GoalAlignment[],
  byArea: AreaAlignment[],
  drift: DriftAnalysis
): AlignmentRecommendation[] {
  const recommendations: AlignmentRecommendation[] = [];

  // Recommend focus on declining goals
  for (const goalAlign of byGoal.filter(g => g.trend === "declining")) {
    recommendations.push({
      type: "focus",
      priority: "high",
      title: `Refocus on "${goalAlign.goal.name}"`,
      description: `This goal has seen declining activity. Consider adding tasks to move it forward.`,
      suggestedAction: {
        type: "create_item",
        params: {
          title: `Work on ${goalAlign.goal.name}`,
          goalId: goalAlign.goal.id
        }
      }
    });
  }

  // Recommend balance for neglected areas
  for (const area of byArea.filter(a => a.lastActivity && differenceInDays(new Date(), a.lastActivity) > 7)) {
    recommendations.push({
      type: "balance",
      priority: "medium",
      title: `Don't forget ${area.area}`,
      description: `No activity in ${area.area} for ${differenceInDays(new Date(), area.lastActivity!)} days.`,
      suggestedAction: {
        type: "list_items",
        params: { area: area.area }
      }
    });
  }

  // Recommend reviewing goals if overall alignment is low
  if (byGoal.every(g => g.alignedHours < 2)) {
    recommendations.push({
      type: "review",
      priority: "medium",
      title: "Review your goals",
      description: "Most of your work doesn't seem connected to your stated goals. Consider updating your goals or linking tasks to them.",
      suggestedAction: {
        type: "navigate",
        params: { to: "/goals" }
      }
    });
  }

  return recommendations;
}

// Tool for the AI
export const analyzeAlignmentTool = {
  name: "analyze_goal_alignment",
  description: "Analyze how well current work aligns with stated goals and life areas. Detects drift and provides recommendations.",
  input_schema: {
    type: "object",
    properties: {
      focusGoalId: {
        type: "string",
        description: "Optional - focus on a specific goal"
      },
      focusArea: {
        type: "string",
        description: "Optional - focus on a specific life area"
      },
      lookbackDays: {
        type: "number",
        default: 7,
        description: "Days to analyze for trends"
      }
    }
  }
};
```

---

## Part 3: New Tools for Phase 2

### 3.1 Intelligence Tools

```typescript
// src/lib/ai/tools/intelligence.ts

export const getMorningBriefingTool = {
  name: "get_morning_briefing",
  description: "Generate a comprehensive morning briefing with schedule, priorities, habits, and insights. Use when user says good morning or asks for an overview of their day.",
  input_schema: {
    type: "object",
    properties: {
      includeCalendar: { type: "boolean", default: true },
      includePriorities: { type: "boolean", default: true },
      includeHabits: { type: "boolean", default: true },
      includeInsights: { type: "boolean", default: true },
      verbosity: {
        type: "string",
        enum: ["brief", "normal", "detailed"],
        default: "normal"
      }
    }
  }
};

export const suggestRescheduleTool = {
  name: "suggest_reschedule",
  description: "Suggest rescheduling options for an item. Considers calendar, workload, and user patterns to find optimal times.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "Item to reschedule"
      },
      reason: {
        type: "string",
        enum: ["missed", "conflict", "user_request", "cascade"],
        description: "Why rescheduling is needed"
      },
      constraints: {
        type: "object",
        properties: {
          notBefore: { type: "string", description: "ISO date" },
          notAfter: { type: "string", description: "ISO date" },
          preferMorning: { type: "boolean" },
          preferAfternoon: { type: "boolean" },
          avoidWeekends: { type: "boolean" }
        }
      }
    },
    required: ["itemId"]
  }
};

export const getContextSummaryTool = {
  name: "get_context_summary",
  description: "Get a comprehensive summary of the user's current context - workload, calendar, priorities, patterns. Use to understand the full picture before making recommendations.",
  input_schema: {
    type: "object",
    properties: {
      focus: {
        type: "array",
        items: {
          type: "string",
          enum: ["workload", "calendar", "priorities", "goals", "habits", "patterns"]
        },
        description: "Which aspects to include"
      },
      timeframe: {
        type: "string",
        enum: ["today", "this_week", "this_month"],
        default: "this_week"
      }
    }
  }
};

export const checkCapacityTool = {
  name: "check_capacity",
  description: "Check if the user has capacity for new work. Compares estimated work hours with available time.",
  input_schema: {
    type: "object",
    properties: {
      additionalHours: {
        type: "number",
        description: "Hours of new work being considered"
      },
      timeframe: {
        type: "string",
        enum: ["today", "this_week", "next_week"],
        default: "this_week"
      }
    }
  }
};

export const findOptimalTimeTool = {
  name: "find_optimal_time",
  description: "Find the optimal time slot for a specific type of work, considering user patterns, calendar, and task requirements.",
  input_schema: {
    type: "object",
    properties: {
      taskType: {
        type: "string",
        enum: ["deep_work", "meetings", "admin", "creative", "learning"],
        description: "Type of work to schedule"
      },
      durationMinutes: {
        type: "number",
        description: "How long the task will take"
      },
      deadline: {
        type: "string",
        description: "Must be scheduled before this date"
      },
      preferences: {
        type: "object",
        properties: {
          preferMorning: { type: "boolean" },
          needsQuiet: { type: "boolean" },
          canSplit: { type: "boolean" }
        }
      }
    },
    required: ["taskType", "durationMinutes"]
  }
};
```

### 3.2 Analysis Tools

```typescript
// src/lib/ai/tools/analysis.ts

export const analyzeProductivityTool = {
  name: "analyze_productivity",
  description: "Deep analysis of productivity patterns. Identifies peak times, common blockers, estimation accuracy, and trends.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["last_week", "last_month", "last_quarter"],
        default: "last_month"
      },
      focus: {
        type: "array",
        items: {
          type: "string",
          enum: ["peak_times", "blockers", "estimation", "completion_rate", "focus_sessions", "trends"]
        }
      },
      compareWithPrevious: {
        type: "boolean",
        default: true
      }
    }
  }
};

export const identifyBottlenecksTool = {
  name: "identify_bottlenecks",
  description: "Identify what's slowing down progress. Finds blocked items, overdue tasks, and systemic issues.",
  input_schema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["all", "project", "goal", "area"],
        default: "all"
      },
      scopeId: {
        type: "string",
        description: "ID if scope is project/goal"
      }
    }
  }
};

export const forecastCompletionTool = {
  name: "forecast_completion",
  description: "Forecast when items or projects will be completed based on current velocity and patterns.",
  input_schema: {
    type: "object",
    properties: {
      itemIds: {
        type: "array",
        items: { type: "string" },
        description: "Items to forecast (or leave empty for all open items)"
      },
      includeConfidenceInterval: {
        type: "boolean",
        default: true
      }
    }
  }
};

export const suggestPrioritizationTool = {
  name: "suggest_prioritization",
  description: "Suggest how to prioritize work based on deadlines, dependencies, goals, and capacity.",
  input_schema: {
    type: "object",
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "string",
          enum: ["deadline", "dependencies", "goal_alignment", "quick_wins", "blocking_others"]
        },
        description: "Criteria to consider"
      },
      maxItems: {
        type: "number",
        default: 10
      }
    }
  }
};
```

---

## Part 4: Enhanced System Prompts

### 4.1 Intelligence-Aware System Prompt

```typescript
// src/lib/ai/prompts/phase2.ts

export function buildPhase2SystemPrompt(context: UserContext): string {
  return `You are an intelligent personal assistant with deep understanding of productivity and time management. You don't just respond to requests - you understand the user's full context and provide proactive, insightful guidance.

## Your Intelligence Capabilities

You can:
1. **Understand Context Deeply** - You know the user's workload, calendar, patterns, goals, and current state
2. **Analyze Dependencies** - You understand what blocks what and can identify high-impact work
3. **Detect Issues Early** - You can spot overcommitment, goal drift, and at-risk deadlines
4. **Suggest Optimally** - Your suggestions consider timing, capacity, and user patterns
5. **Learn and Adapt** - You remember preferences and improve over time

## Current Context Summary

${buildContextSummary(context)}

## Intelligence Guidelines

### When to Be Proactive
- User seems overwhelmed → Offer to help prioritize
- Detecting goal drift → Mention it gently
- Calendar conflicts → Alert immediately
- Streaks at risk → Remind about habits
- Optimal work time → Suggest important tasks

### When to Dig Deeper
- Vague requests → Use tools to understand before acting
- Complex planning → Analyze dependencies and capacity first
- Research requests → Do thorough multi-source research
- Scheduling requests → Check calendar and patterns

### When to Just Execute
- Clear, specific requests → Do it without over-explaining
- Simple queries → Answer directly
- Follow-up actions → Complete without re-asking

## Communication Style

1. **Be Insightful**: Don't just state facts - provide analysis
   - Bad: "You have 5 overdue tasks"
   - Good: "You have 5 overdue tasks. 2 are blocking other work - I'd start with 'Fix API bug' since it unblocks 3 other tasks."

2. **Be Concise but Complete**: Give the full picture efficiently
   - Include relevant context without being verbose
   - Use formatting to make information scannable

3. **Be Actionable**: Every insight should have a next step
   - Don't just identify problems - suggest solutions
   - Offer to execute actions, not just describe them

4. **Be Human**: Show understanding of work/life balance
   - Acknowledge when workload is heavy
   - Celebrate wins and streaks
   - Be realistic about capacity

## Tool Usage Patterns

### Morning/Overview Requests
1. get_morning_briefing → comprehensive overview
2. Highlight 2-3 key things to focus on
3. Mention any concerns (overdue, conflicts, capacity)

### Planning Requests
1. get_context_summary → understand current state
2. analyze_dependencies → find blockers and critical path
3. check_capacity → ensure realistic
4. create_item/break_down_task → create the plan

### "What should I work on?" Requests
1. get_context_summary → current state
2. suggest_prioritization → ranked recommendations
3. Consider time of day and user patterns
4. Suggest starting a focus session

### Rescheduling Requests
1. suggest_reschedule → get optimal times
2. analyze_dependencies → check cascade effects
3. Present options with trade-offs
4. Execute chosen option

### Goal/Progress Requests
1. analyze_goal_alignment → full alignment picture
2. get_analytics → quantitative progress
3. Identify drift and make recommendations

Remember: You're not just a task manager - you're a thinking partner who helps the user be more effective.
`;
}

function buildContextSummary(ctx: UserContext): string {
  const sections: string[] = [];

  // Quick status
  let status = "🟢 On track";
  if (ctx.workload.overdueCount > 3) status = "🔴 Behind";
  else if (ctx.workload.overdueCount > 0 || ctx.workload.capacityUtilization > 1) status = "🟡 Needs attention";

  sections.push(`**Status**: ${status}`);

  // Key numbers
  sections.push(`**Workload**: ${ctx.workload.totalOpenItems} open items, ${ctx.workload.overdueCount} overdue`);
  sections.push(`**Capacity**: ${Math.round(ctx.workload.capacityUtilization * 100)}% utilized this week`);
  sections.push(`**Today**: ${ctx.calendar.meetingsToday.length} meetings, ${ctx.workload.dueTodayCount} items due`);

  // Critical items
  if (ctx.priorities.criticalItems.length > 0) {
    const names = ctx.priorities.criticalItems.slice(0, 3).map(i => i.title);
    sections.push(`**Critical**: ${names.join(", ")}`);
  }

  // Patterns
  if (ctx.patterns.productiveHours.length > 0) {
    sections.push(`**Peak hours**: ${ctx.patterns.productiveHours.join(", ")}`);
  }

  return sections.join("\n");
}
```

---

## Part 5: Database Schema Additions

### 5.1 Context Cache Table

```sql
-- Cache computed context to avoid re-computing on every request
CREATE TABLE IF NOT EXISTS context_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'full', 'workload', 'calendar', etc.
  context_data TEXT NOT NULL, -- JSON blob
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  UNIQUE(user_id, context_type)
);

CREATE INDEX idx_context_cache_expiry ON context_cache(expires_at);
```

### 5.2 Briefing History Table

```sql
-- Track briefings for analysis and user feedback
CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'morning', 'evening', 'weekly'
  content TEXT NOT NULL, -- The generated briefing (JSON)
  context_snapshot TEXT, -- Context at time of generation
  user_feedback TEXT, -- User's reaction/feedback
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_briefings_user_date ON briefings(user_id, created_at);
```

### 5.3 Productivity Metrics Table

```sql
-- Store computed productivity metrics for trend analysis
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metrics TEXT NOT NULL, -- JSON blob with all metrics for the day
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_productivity_metrics_date ON productivity_metrics(user_id, date);
```

---

## Part 6: Implementation Timeline

### Week 1: Context Engine
- [ ] Define context types and interfaces
- [ ] Implement context assemblers for each domain
- [ ] Build context caching layer
- [ ] Create context summary generator
- [ ] Update system prompts with context

### Week 2: Core Intelligence Features
- [ ] Morning briefing generation
- [ ] Smart rescheduling engine
- [ ] Capacity checking
- [ ] Optimal time finder

### Week 3: Dependency & Goal Intelligence
- [ ] Dependency graph analysis
- [ ] Critical path identification
- [ ] Goal alignment analysis
- [ ] Drift detection

### Week 4: Tools & Integration
- [ ] Implement all Phase 2 tools
- [ ] Update AI agent to use new tools
- [ ] Enhanced system prompts
- [ ] End-to-end testing

### Week 5: Polish & Optimization
- [ ] Performance optimization
- [ ] Context caching fine-tuning
- [ ] Prompt refinement based on testing
- [ ] Edge case handling

---

## Part 7: Example Interactions

### 7.1 Morning Briefing

**User**: "Good morning"

**Agent** (internally):
1. `get_morning_briefing()`
2. `get_context_summary({ focus: ["workload", "calendar", "habits"] })`

**Response**:
```
Good morning! Here's your Monday briefing:

📅 **Today's Schedule**
- 10:00 AM: Team standup (30 min)
- 2:00 PM: 1:1 with Sarah (45 min)
- Free blocks: 8-10 AM, 10:30 AM-2 PM, 2:45-6 PM

🎯 **Top 3 Priorities**
1. **Fix auth bug** (overdue) - Blocks deployment and 2 other tasks
2. **Finish proposal draft** - Due today, ~2 hours remaining
3. **Review PR #156** - Quick win, 15 min

⚠️ **Heads Up**
- You're at 115% capacity this week - might need to defer something
- "Learn Spanish" goal has had no activity in 8 days

💪 **Habits**
- Exercise: 5-day streak 🔥
- Reading: Done yesterday
- Meditation: Pending

I'd suggest tackling the auth bug first while you're fresh - it unblocks the most work. Want me to start a focus session for it?
```

### 7.2 Smart Rescheduling

**User**: "I couldn't finish the proposal yesterday, help me reschedule"

**Agent** (internally):
1. `list_items({ title: "proposal" })` → find the item
2. `suggest_reschedule({ itemId: "...", reason: "missed" })`
3. `analyze_dependencies({ focusItemId: "..." })`
4. `get_calendar_context({ timeframe: "this_week" })`

**Response**:
```
I found "Finish proposal draft" - let me find the best time to reschedule.

**Option 1: Tomorrow 9-11 AM** (Recommended)
- ✅ Your most productive hours (based on your patterns)
- ✅ 2-hour uninterrupted block
- ✅ Before your Wednesday deadline
- ⚠️ Means less buffer if something comes up

**Option 2: Today 3-5 PM**
- ✅ Gets it done sooner
- ⚠️ Afternoon is typically less productive for you
- ⚠️ You have a meeting at 2 PM that might run over

**Option 3: Split - 1 hour today, 1 hour tomorrow**
- ✅ Starts progress today
- ⚠️ Context switching cost

No downstream tasks depend on this, so the timing is flexible.

Which option works best? I can reschedule and block your calendar.
```

### 7.3 Goal Alignment Check

**User**: "Am I making progress on my goals?"

**Agent** (internally):
1. `analyze_goal_alignment()`
2. `get_analytics({ period: "this_month", focus: ["completion_rate", "trends"] })`

**Response**:
```
Let me analyze your goal progress:

📊 **Overall Alignment: 62%**
About 62% of your recent work connects to your stated goals.

**Goal Breakdown:**

🟢 **"Ship v2.0 by March"** - On Track
- 12 tasks completed this month
- Projected completion: Feb 28 (2 days early!)
- Recommendation: Keep momentum

🟡 **"Get healthier"** - Needs Attention
- Exercise habit: 5-day streak ✓
- But: No gym visits logged this week
- Recommendation: Schedule specific workout times

🔴 **"Learn Spanish"** - Stalled
- Last activity: 12 days ago
- 0 hours logged this month
- Recommendation: Even 15 min/day would help

**Drift Alert**: 80% of your time went to work tasks, but "health" and "learning" goals are falling behind.

Would you like me to:
1. Schedule dedicated time for Spanish practice?
2. Add health-related tasks to your routine?
3. Review and possibly adjust your goals?
```

---

## Part 8: Success Metrics

### Quantitative
- [ ] Context assembly < 500ms
- [ ] Briefing generation < 2s
- [ ] 90%+ accuracy on capacity predictions
- [ ] Rescheduling suggestions accepted > 70%

### Qualitative
- [ ] Briefings feel personalized and useful
- [ ] Suggestions account for user patterns
- [ ] Dependency analysis provides actionable insights
- [ ] Goal alignment feedback is accurate

### User Experience
- [ ] User says "good morning" → Gets useful briefing
- [ ] User asks "what should I work on?" → Gets contextual answer
- [ ] User misses deadline → AI proactively helps reschedule
- [ ] User drifts from goals → AI gently alerts

---

## Summary

Phase 2 transforms the AI from a capable executor (Phase 1) into an intelligent advisor that:

1. **Understands deeply** - Rich context model covering all aspects of user's work life
2. **Advises wisely** - Recommendations based on patterns, capacity, and goals
3. **Analyzes comprehensively** - Dependencies, alignment, productivity patterns
4. **Communicates effectively** - Insightful, actionable, human-friendly

This sets the stage for Phase 3 (Proactive) where the AI initiates assistance, and Phase 4 (Learning) where it continuously improves from experience.
