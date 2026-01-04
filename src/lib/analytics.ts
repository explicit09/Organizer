import { listActivity } from "./activity";
import { getDefaultUserId } from "./auth";
import { listItems, type ItemType } from "./items";

type CompletionPoint = {
  date: string;
  count: number;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getCompletionSeries(
  days = 7,
  now = new Date(),
  options?: { userId?: string }
): CompletionPoint[] {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  const series: CompletionPoint[] = [];
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const key = toDateKey(day);
    counts.set(key, 0);
    series.push({ date: key, count: 0 });
  }

  const userId = options?.userId ?? getDefaultUserId();
  const activity = listActivity({ userId });
  activity.forEach((entry) => {
    if (entry.action !== "item_updated") {
      return;
    }
    const status = entry.data?.status;
    if (status !== "completed") {
      return;
    }
    const entryDate = new Date(entry.createdAt);
    if (entryDate < start || entryDate > end) {
      return;
    }
    const key = toDateKey(entryDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return series.map((point) => ({
    ...point,
    count: counts.get(point.date) ?? 0,
  }));
}

// ========== Time Allocation Tracking ==========

export type TimeAllocation = {
  type: ItemType;
  count: number;
  estimatedMinutes: number;
  completedCount: number;
  percentage: number;
};

export type TimeAllocationSummary = {
  totalItems: number;
  totalEstimatedMinutes: number;
  allocations: TimeAllocation[];
  byDay: DayAllocation[];
};

export type DayAllocation = {
  date: string;
  tasks: number;
  meetings: number;
  school: number;
  totalMinutes: number;
};

export function getTimeAllocation(
  options?: { userId?: string; days?: number }
): TimeAllocationSummary {
  const userId = options?.userId ?? getDefaultUserId();
  const days = options?.days ?? 7;
  const items = listItems(undefined, { userId });

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Filter to relevant timeframe
  const relevantItems = items.filter((item) => {
    const itemDate = item.dueAt ?? item.startAt ?? item.createdAt;
    const date = new Date(itemDate);
    return date >= startDate && date <= now;
  });

  // Calculate allocations by type
  const typeGroups: Record<ItemType, typeof relevantItems> = {
    task: [],
    meeting: [],
    school: [],
  };

  for (const item of relevantItems) {
    typeGroups[item.type].push(item);
  }

  const totalItems = relevantItems.length;
  const totalEstimatedMinutes = relevantItems.reduce(
    (sum, item) => sum + (item.estimatedMinutes ?? 30),
    0
  );

  const allocations: TimeAllocation[] = (["task", "meeting", "school"] as ItemType[]).map(
    (type) => {
      const typeItems = typeGroups[type];
      const estimatedMinutes = typeItems.reduce(
        (sum, item) => sum + (item.estimatedMinutes ?? 30),
        0
      );
      const completedCount = typeItems.filter((i) => i.status === "completed").length;

      return {
        type,
        count: typeItems.length,
        estimatedMinutes,
        completedCount,
        percentage: totalItems ? Math.round((typeItems.length / totalItems) * 100) : 0,
      };
    }
  );

  // Calculate by day
  const byDay: DayAllocation[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const dateKey = toDateKey(day);

    const dayItems = relevantItems.filter((item) => {
      const itemDate = item.dueAt ?? item.startAt ?? item.createdAt;
      return toDateKey(new Date(itemDate)) === dateKey;
    });

    byDay.push({
      date: dateKey,
      tasks: dayItems.filter((i) => i.type === "task").length,
      meetings: dayItems.filter((i) => i.type === "meeting").length,
      school: dayItems.filter((i) => i.type === "school").length,
      totalMinutes: dayItems.reduce((sum, i) => sum + (i.estimatedMinutes ?? 30), 0),
    });
  }

  return {
    totalItems,
    totalEstimatedMinutes,
    allocations,
    byDay: byDay.reverse(),
  };
}

// ========== Trend Analysis ==========

export type TrendData = {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
};

export type TrendSummary = {
  completionRate: TrendData;
  productivity: TrendData;
  taskVolume: TrendData;
  avgCompletionTime: TrendData;
  streakDays: number;
  bestDay: string;
  worstDay: string;
};

export function getTrends(
  options?: { userId?: string; periodDays?: number }
): TrendSummary {
  const userId = options?.userId ?? getDefaultUserId();
  const periodDays = options?.periodDays ?? 7;

  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);

  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

  const items = listItems(undefined, { userId });
  const activity = listActivity({ userId });

  // Current period items
  const currentItems = items.filter((item) => {
    const date = new Date(item.createdAt);
    return date >= currentPeriodStart && date <= now;
  });

  // Previous period items
  const previousItems = items.filter((item) => {
    const date = new Date(item.createdAt);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });

  // Completion rates
  const currentCompleted = currentItems.filter((i) => i.status === "completed").length;
  const previousCompleted = previousItems.filter((i) => i.status === "completed").length;

  const currentCompletionRate = currentItems.length
    ? (currentCompleted / currentItems.length) * 100
    : 0;
  const previousCompletionRate = previousItems.length
    ? (previousCompleted / previousItems.length) * 100
    : 0;

  // Task volume
  const currentVolume = currentItems.length;
  const previousVolume = previousItems.length;

  // Productivity (completed items)
  const currentProductivity = currentCompleted;
  const previousProductivity = previousCompleted;

  // Calculate completion times from activity log
  const completionTimes: number[] = [];
  const itemCreationTimes = new Map<string, Date>();

  for (const entry of activity) {
    if (entry.action === "item_created" && entry.itemId) {
      itemCreationTimes.set(entry.itemId, new Date(entry.createdAt));
    }
    if (entry.action === "item_updated" && entry.data?.status === "completed" && entry.itemId) {
      const createdAt = itemCreationTimes.get(entry.itemId);
      if (createdAt) {
        const completedAt = new Date(entry.createdAt);
        const hours = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 168) { // Within a week
          completionTimes.push(hours);
        }
      }
    }
  }

  const avgCompletionTime = completionTimes.length
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    : 0;

  // Calculate streak
  const completionSeries = getCompletionSeries(30, now, { userId });
  let streakDays = 0;
  for (let i = completionSeries.length - 1; i >= 0; i--) {
    if (completionSeries[i].count > 0) {
      streakDays++;
    } else {
      break;
    }
  }

  // Best and worst days
  const sortedDays = [...completionSeries].sort((a, b) => b.count - a.count);
  const bestDay = sortedDays[0]?.date ?? "";
  const worstDay = sortedDays[sortedDays.length - 1]?.date ?? "";

  function calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous ? Math.round((change / previous) * 100) : 0;
    const trend = change > 0 ? "up" : change < 0 ? "down" : "stable";
    return { current, previous, change, changePercent, trend };
  }

  return {
    completionRate: calculateTrend(currentCompletionRate, previousCompletionRate),
    productivity: calculateTrend(currentProductivity, previousProductivity),
    taskVolume: calculateTrend(currentVolume, previousVolume),
    avgCompletionTime: calculateTrend(avgCompletionTime, avgCompletionTime), // No previous for now
    streakDays,
    bestDay,
    worstDay,
  };
}

// ========== Proactive Suggestions ==========

export type ProactiveSuggestion = {
  type: "reschedule" | "break_down" | "prioritize" | "delegate" | "review";
  message: string;
  itemIds: string[];
  priority: "low" | "medium" | "high";
};

export function getProactiveSuggestions(
  options?: { userId?: string }
): ProactiveSuggestion[] {
  const userId = options?.userId ?? getDefaultUserId();
  const items = listItems(undefined, { userId });
  const suggestions: ProactiveSuggestion[] = [];

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Items due tomorrow
  const dueTomorrow = items.filter((item) => {
    if (!item.dueAt || item.status === "completed") return false;
    const dueDate = new Date(item.dueAt);
    return dueDate >= now && dueDate <= tomorrow;
  });

  if (dueTomorrow.length >= 3) {
    suggestions.push({
      type: "reschedule",
      message: `You have ${dueTomorrow.length} items due tomorrow. Consider rescheduling some.`,
      itemIds: dueTomorrow.map((i) => i.id),
      priority: dueTomorrow.length >= 5 ? "high" : "medium",
    });
  }

  // Overdue items
  const overdue = items.filter((item) => {
    if (!item.dueAt || item.status === "completed") return false;
    return new Date(item.dueAt) < now;
  });

  if (overdue.length > 0) {
    suggestions.push({
      type: "prioritize",
      message: `${overdue.length} overdue item${overdue.length > 1 ? "s" : ""} need attention.`,
      itemIds: overdue.map((i) => i.id),
      priority: "high",
    });
  }

  // Large tasks that could be broken down
  const largeTasks = items.filter(
    (item) =>
      item.status !== "completed" &&
      item.estimatedMinutes &&
      item.estimatedMinutes > 120 &&
      !item.parentId
  );

  for (const task of largeTasks) {
    suggestions.push({
      type: "break_down",
      message: `"${task.title}" is estimated at ${task.estimatedMinutes} minutes. Consider breaking it into subtasks.`,
      itemIds: [task.id],
      priority: "low",
    });
  }

  // Blocked items
  const blocked = items.filter((item) => item.status === "blocked");
  if (blocked.length > 0) {
    suggestions.push({
      type: "review",
      message: `${blocked.length} item${blocked.length > 1 ? "s are" : " is"} blocked. Review and unblock.`,
      itemIds: blocked.map((i) => i.id),
      priority: "medium",
    });
  }

  // Items in progress for too long (> 3 days)
  const staleInProgress = items.filter((item) => {
    if (item.status !== "in_progress") return false;
    const updated = new Date(item.updatedAt);
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 3;
  });

  if (staleInProgress.length > 0) {
    suggestions.push({
      type: "review",
      message: `${staleInProgress.length} item${staleInProgress.length > 1 ? "s have" : " has"} been in progress for over 3 days.`,
      itemIds: staleInProgress.map((i) => i.id),
      priority: "medium",
    });
  }

  return suggestions;
}
