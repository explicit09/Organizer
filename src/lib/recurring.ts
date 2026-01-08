import { randomUUID } from "node:crypto";
import type { Item, RecurrenceRule } from "./items";

// ========== Types ==========

export type RecurrenceConfig = {
  rule: RecurrenceRule;
  interval?: number;        // e.g., every 2 weeks
  daysOfWeek?: number[];    // 0-6 (Sun-Sat) for weekly
  dayOfMonth?: number;      // 1-31 for monthly
  endDate?: string;         // ISO date when recurrence ends
  count?: number;           // Max number of occurrences
};

export type ExpandedItem = Item & {
  isInstance: boolean;
  instanceDate: string;
  originalId: string;
};

// ========== Recurrence Parsing ==========

export function parseRecurrenceRule(rule: string): RecurrenceConfig {
  const ruleLower = rule.toLowerCase();

  // Daily
  if (ruleLower === "daily") {
    return { rule: "daily", interval: 1 };
  }

  // Weekly
  if (ruleLower === "weekly") {
    return { rule: "weekly", interval: 1 };
  }

  // Biweekly
  if (ruleLower === "biweekly") {
    return { rule: "biweekly", interval: 2 };
  }

  // Monthly
  if (ruleLower === "monthly") {
    return { rule: "monthly", interval: 1 };
  }

  // Yearly
  if (ruleLower === "yearly") {
    return { rule: "yearly", interval: 1 };
  }

  // Weekdays (Mon-Fri)
  if (ruleLower === "weekdays") {
    return { rule: "daily", interval: 1, daysOfWeek: [1, 2, 3, 4, 5] };
  }

  // Custom patterns like "every 2 weeks"
  const everyMatch = ruleLower.match(/every\s+(\d+)\s+(day|week|month|year)s?/);
  if (everyMatch) {
    const interval = parseInt(everyMatch[1]);
    const unit = everyMatch[2];

    switch (unit) {
      case "day":
        return { rule: "daily", interval };
      case "week":
        return { rule: "weekly", interval };
      case "month":
        return { rule: "monthly", interval };
      case "year":
        return { rule: "yearly", interval };
    }
  }

  // Default to weekly if unrecognized
  return { rule: "weekly", interval: 1 };
}

// ========== Instance Generation ==========

export function expandRecurringItems(
  items: Item[],
  startDate: Date,
  endDate: Date
): ExpandedItem[] {
  const result: ExpandedItem[] = [];
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  for (const item of items) {
    // Non-recurring items are included as-is within date range
    if (!item.recurrenceRule) {
      if (item.startAt) {
        const itemTime = new Date(item.startAt).getTime();
        if (itemTime >= startTime && itemTime <= endTime) {
          result.push({
            ...item,
            isInstance: false,
            instanceDate: item.startAt.slice(0, 10),
            originalId: item.id,
          });
        }
      } else if (item.dueAt) {
        const itemTime = new Date(item.dueAt).getTime();
        if (itemTime >= startTime && itemTime <= endTime) {
          result.push({
            ...item,
            isInstance: false,
            instanceDate: item.dueAt.slice(0, 10),
            originalId: item.id,
          });
        }
      }
      continue;
    }

    // Recurring items: generate instances
    const config = parseRecurrenceRule(item.recurrenceRule);
    const recurrenceEnd = item.recurrenceEnd 
      ? new Date(item.recurrenceEnd).getTime() 
      : endTime;

    // Start from item's start date or today
    const baseDate = item.startAt 
      ? new Date(item.startAt) 
      : item.createdAt 
        ? new Date(item.createdAt) 
        : new Date();

    baseDate.setHours(0, 0, 0, 0);

    let currentDate = new Date(baseDate);
    let count = 0;
    const maxInstances = config.count ?? 365; // Max 1 year of instances

    while (
      currentDate.getTime() <= Math.min(endTime, recurrenceEnd) &&
      count < maxInstances
    ) {
      // Check if current date is within our range
      if (currentDate.getTime() >= startTime) {
        // Check day of week filter
        if (config.daysOfWeek && !config.daysOfWeek.includes(currentDate.getDay())) {
          // Advance to next day
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Create instance
        const instanceDate = currentDate.toISOString().slice(0, 10);
        
        // Calculate start/end times for this instance
        let instanceStart: string | undefined;
        let instanceEnd: string | undefined;

        if (item.startAt && item.endAt) {
          const originalStart = new Date(item.startAt);
          const originalEnd = new Date(item.endAt);
          const duration = originalEnd.getTime() - originalStart.getTime();

          instanceStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            originalStart.getHours(),
            originalStart.getMinutes()
          ).toISOString();

          instanceEnd = new Date(
            new Date(instanceStart).getTime() + duration
          ).toISOString();
        }

        let instanceDue: string | undefined;
        if (item.dueAt) {
          const originalDue = new Date(item.dueAt);
          instanceDue = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            originalDue.getHours(),
            originalDue.getMinutes()
          ).toISOString();
        }

        result.push({
          ...item,
          id: `${item.id}-${instanceDate}`,
          startAt: instanceStart,
          endAt: instanceEnd,
          dueAt: instanceDue,
          isInstance: true,
          instanceDate,
          originalId: item.id,
        });

        count++;
      }

      // Advance to next occurrence
      switch (config.rule) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + (config.interval ?? 1));
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + (config.interval ?? 1) * 7);
          break;
        case "biweekly":
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + (config.interval ?? 1));
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + (config.interval ?? 1));
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 7);
      }
    }
  }

  // Sort by date
  result.sort((a, b) => {
    const aDate = a.startAt ?? a.dueAt ?? a.instanceDate;
    const bDate = b.startAt ?? b.dueAt ?? b.instanceDate;
    return (aDate ?? "").localeCompare(bDate ?? "");
  });

  return result;
}

// ========== Recurrence Description ==========

export function getRecurrenceDescription(rule: RecurrenceRule, interval?: number): string {
  if (interval && interval > 1) {
    switch (rule) {
      case "daily":
        return `Every ${interval} days`;
      case "weekly":
        return `Every ${interval} weeks`;
      case "biweekly":
        return "Every 2 weeks";
      case "monthly":
        return `Every ${interval} months`;
      case "yearly":
        return `Every ${interval} years`;
    }
  }

  switch (rule) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Recurring";
  }
}

// ========== Next Occurrence ==========

export function getNextOccurrence(
  item: Item,
  afterDate: Date = new Date()
): Date | null {
  if (!item.recurrenceRule) {
    return null;
  }

  const config = parseRecurrenceRule(item.recurrenceRule);
  const baseDate = item.startAt 
    ? new Date(item.startAt) 
    : new Date();

  // Find the next occurrence after the given date
  let currentDate = new Date(baseDate);
  const maxIterations = 365;

  for (let i = 0; i < maxIterations; i++) {
    if (currentDate > afterDate) {
      // Check day of week filter
      if (!config.daysOfWeek || config.daysOfWeek.includes(currentDate.getDay())) {
        return currentDate;
      }
    }

    // Advance to next occurrence
    switch (config.rule) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + (config.interval ?? 1));
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + (config.interval ?? 1) * 7);
        break;
      case "biweekly":
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + (config.interval ?? 1));
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + (config.interval ?? 1));
        break;
    }
  }

  return null;
}
