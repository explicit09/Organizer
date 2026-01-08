import type { Item } from "./items";

export type Conflict = {
  itemA: Item;
  itemB: Item;
};

export function detectConflicts(items: Item[]): Conflict[] {
  const meetings = items
    .filter((item) => item.startAt && item.endAt)
    .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));

  const conflicts: Conflict[] = [];
  for (let i = 0; i < meetings.length; i += 1) {
    for (let j = i + 1; j < meetings.length; j += 1) {
      const a = meetings[i];
      const b = meetings[j];
      if (!a.startAt || !a.endAt || !b.startAt || !b.endAt) {
        continue;
      }
      const aStart = new Date(a.startAt).getTime();
      const aEnd = new Date(a.endAt).getTime();
      const bStart = new Date(b.startAt).getTime();
      const bEnd = new Date(b.endAt).getTime();

      if (bStart < aEnd && bEnd > aStart) {
        conflicts.push({ itemA: a, itemB: b });
      }
    }
  }
  return conflicts;
}

export type ScheduleSuggestion = {
  itemId: string;
  title: string;
  suggestedStart: string;
  suggestedEnd: string;
};

export function suggestTaskBlocks(
  tasks: Item[],
  events: Item[],
  options?: { days?: number; workStartHour?: number; workEndHour?: number }
) {
  const days = options?.days ?? 5;
  const workStart = options?.workStartHour ?? 9;
  const workEnd = options?.workEndHour ?? 18;

  const busy = events
    .filter((item) => item.startAt && item.endAt)
    .map((item) => ({
      start: new Date(item.startAt ?? "").getTime(),
      end: new Date(item.endAt ?? "").getTime(),
    }));

  const suggestions: ScheduleSuggestion[] = [];
  const now = new Date();

  for (const task of tasks) {
    const minutes = task.estimatedMinutes ?? 30;
    let placed = false;

    for (let dayOffset = 0; dayOffset < days && !placed; dayOffset += 1) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);
      day.setHours(workStart, 0, 0, 0);

      const dayEnd = new Date(day);
      dayEnd.setHours(workEnd, 0, 0, 0);

      let slotStart = new Date(day);
      while (slotStart < dayEnd && !placed) {
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + minutes);

        if (slotEnd > dayEnd) {
          break;
        }

        const conflict = busy.some(
          (event) =>
            slotStart.getTime() < event.end && slotEnd.getTime() > event.start
        );

        if (!conflict) {
          suggestions.push({
            itemId: task.id,
            title: task.title,
            suggestedStart: slotStart.toISOString(),
            suggestedEnd: slotEnd.toISOString(),
          });
          placed = true;
          break;
        }

        slotStart.setMinutes(slotStart.getMinutes() + 30);
      }
    }
  }

  return suggestions;
}

// ========== Available Slot Finder ==========

export type TimeSlot = {
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type AvailableSlotOptions = {
  startDate?: Date;
  endDate?: Date;
  workStartHour?: number;
  workEndHour?: number;
  minDurationMinutes?: number;
  excludeWeekends?: boolean;
};

export function findAvailableSlots(
  events: Item[],
  options?: AvailableSlotOptions
): TimeSlot[] {
  const now = new Date();
  const startDate = options?.startDate ?? now;
  const endDate = options?.endDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const workStart = options?.workStartHour ?? 9;
  const workEnd = options?.workEndHour ?? 18;
  const minDuration = options?.minDurationMinutes ?? 30;
  const excludeWeekends = options?.excludeWeekends ?? true;

  // Get busy periods with buffer times
  const busy = events
    .filter((item) => item.startAt && item.endAt)
    .map((item) => {
      const bufferBefore = (item.bufferBefore ?? 0) * 60 * 1000;
      const bufferAfter = (item.bufferAfter ?? 0) * 60 * 1000;
      return {
        start: new Date(item.startAt ?? "").getTime() - bufferBefore,
        end: new Date(item.endAt ?? "").getTime() + bufferAfter,
      };
    })
    .sort((a, b) => a.start - b.start);

  const slots: TimeSlot[] = [];
  const currentDay = new Date(startDate);
  currentDay.setHours(0, 0, 0, 0);

  while (currentDay <= endDate) {
    // Skip weekends if configured
    const dayOfWeek = currentDay.getDay();
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    const dayStart = new Date(currentDay);
    dayStart.setHours(workStart, 0, 0, 0);

    const dayEnd = new Date(currentDay);
    dayEnd.setHours(workEnd, 0, 0, 0);

    // Find free slots in this day
    let slotStart = dayStart.getTime();
    const slotEndLimit = dayEnd.getTime();

    // Get events for this day
    const dayEvents = busy.filter(
      (event) => event.start < slotEndLimit && event.end > slotStart
    );

    for (const event of dayEvents) {
      if (slotStart < event.start) {
        const gapDuration = (event.start - slotStart) / (60 * 1000);
        if (gapDuration >= minDuration) {
          slots.push({
            start: new Date(slotStart),
            end: new Date(event.start),
            durationMinutes: gapDuration,
          });
        }
      }
      slotStart = Math.max(slotStart, event.end);
    }

    // Check for remaining time after last event
    if (slotStart < slotEndLimit) {
      const gapDuration = (slotEndLimit - slotStart) / (60 * 1000);
      if (gapDuration >= minDuration) {
        slots.push({
          start: new Date(slotStart),
          end: new Date(slotEndLimit),
          durationMinutes: gapDuration,
        });
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return slots;
}

export function findBestSlotForDuration(
  events: Item[],
  durationMinutes: number,
  options?: AvailableSlotOptions
): TimeSlot | null {
  const slots = findAvailableSlots(events, {
    ...options,
    minDurationMinutes: durationMinutes,
  });

  // Return the first slot that fits
  return slots.find((slot) => slot.durationMinutes >= durationMinutes) ?? null;
}

// ========== Study Session Scheduling ==========

export type StudySession = {
  courseId?: string;
  itemId?: string;
  title: string;
  suggestedStart: string;
  suggestedEnd: string;
  type: "study" | "review" | "practice";
};

export type StudyPlanOptions = {
  examDate?: Date;
  totalHours?: number;
  sessionsPerDay?: number;
  sessionDuration?: number;
  preferredStartHour?: number;
  preferredEndHour?: number;
};

export function generateStudyPlan(
  items: Item[],
  events: Item[],
  options?: StudyPlanOptions
): StudySession[] {
  const examDate = options?.examDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const sessionsPerDay = options?.sessionsPerDay ?? 2;
  const sessionDuration = options?.sessionDuration ?? 60;
  const preferredStart = options?.preferredStartHour ?? 9;
  const preferredEnd = options?.preferredEndHour ?? 21;

  const schoolItems = items.filter(
    (item) => item.type === "school" && item.status !== "completed"
  );

  const sessions: StudySession[] = [];
  const now = new Date();
  const daysUntilExam = Math.ceil(
    (examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Get available slots
  const availableSlots = findAvailableSlots(events, {
    startDate: now,
    endDate: examDate,
    workStartHour: preferredStart,
    workEndHour: preferredEnd,
    minDurationMinutes: sessionDuration,
  });

  let slotIndex = 0;
  let sessionsScheduled = 0;
  const maxSessions = daysUntilExam * sessionsPerDay;

  for (const item of schoolItems) {
    if (sessionsScheduled >= maxSessions || slotIndex >= availableSlots.length) {
      break;
    }

    // Schedule study session
    const slot = availableSlots[slotIndex];
    const sessionEnd = new Date(slot.start.getTime() + sessionDuration * 60 * 1000);

    sessions.push({
      courseId: item.courseId,
      itemId: item.id,
      title: `Study: ${item.title}`,
      suggestedStart: slot.start.toISOString(),
      suggestedEnd: sessionEnd.toISOString(),
      type: "study",
    });

    sessionsScheduled++;

    // Move to next slot if current is consumed
    if (sessionEnd.getTime() >= slot.end.getTime() - 30 * 60 * 1000) {
      slotIndex++;
    }

    // Add review session for items due soon
    if (item.dueAt) {
      const dueDate = new Date(item.dueAt);
      const daysBefore = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysBefore <= 3 && slotIndex < availableSlots.length) {
        const reviewSlot = availableSlots[slotIndex];
        const reviewEnd = new Date(
          reviewSlot.start.getTime() + (sessionDuration / 2) * 60 * 1000
        );

        sessions.push({
          courseId: item.courseId,
          itemId: item.id,
          title: `Review: ${item.title}`,
          suggestedStart: reviewSlot.start.toISOString(),
          suggestedEnd: reviewEnd.toISOString(),
          type: "review",
        });

        sessionsScheduled++;
        slotIndex++;
      }
    }
  }

  return sessions;
}

// ========== Workload Analysis ==========

export type WorkloadWarning = {
  type: "overloaded" | "conflict" | "deadline_cluster" | "no_breaks";
  message: string;
  severity: "low" | "medium" | "high";
  affectedDates: string[];
  affectedItems: string[];
};

export function analyzeWorkload(
  items: Item[],
  options?: { daysAhead?: number; maxItemsPerDay?: number }
): WorkloadWarning[] {
  const daysAhead = options?.daysAhead ?? 7;
  const maxItemsPerDay = options?.maxItemsPerDay ?? 5;
  const warnings: WorkloadWarning[] = [];

  const now = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Group items by day
  const itemsByDay: Map<string, Item[]> = new Map();

  for (const item of items) {
    const dateStr = item.dueAt
      ? new Date(item.dueAt).toISOString().split("T")[0]
      : item.startAt
        ? new Date(item.startAt).toISOString().split("T")[0]
        : null;

    if (dateStr) {
      const date = new Date(dateStr);
      if (date >= now && date <= endDate) {
        const existing = itemsByDay.get(dateStr) ?? [];
        existing.push(item);
        itemsByDay.set(dateStr, existing);
      }
    }
  }

  // Check for overloaded days
  for (const [dateStr, dayItems] of itemsByDay) {
    if (dayItems.length > maxItemsPerDay) {
      warnings.push({
        type: "overloaded",
        message: `${dayItems.length} items scheduled for ${dateStr}. Consider rescheduling some.`,
        severity: dayItems.length > maxItemsPerDay * 1.5 ? "high" : "medium",
        affectedDates: [dateStr],
        affectedItems: dayItems.map((i) => i.id),
      });
    }
  }

  // Check for deadline clusters (3+ deadlines within 24 hours)
  const itemsWithDue = items
    .filter((i) => i.dueAt)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  for (let i = 0; i < itemsWithDue.length - 2; i++) {
    const item = itemsWithDue[i];
    const clustered = [item];

    for (let j = i + 1; j < itemsWithDue.length; j++) {
      const diff =
        new Date(itemsWithDue[j].dueAt ?? "").getTime() -
        new Date(item.dueAt ?? "").getTime();
      if (diff <= 24 * 60 * 60 * 1000) {
        clustered.push(itemsWithDue[j]);
      } else {
        break;
      }
    }

    if (clustered.length >= 3) {
      warnings.push({
        type: "deadline_cluster",
        message: `${clustered.length} deadlines within 24 hours starting ${item.dueAt?.split("T")[0]}`,
        severity: clustered.length >= 5 ? "high" : "medium",
        affectedDates: [item.dueAt?.split("T")[0] ?? ""],
        affectedItems: clustered.map((i) => i.id),
      });
    }
  }

  // Check for conflicts
  const conflicts = detectConflicts(items);
  for (const conflict of conflicts) {
    warnings.push({
      type: "conflict",
      message: `"${conflict.itemA.title}" conflicts with "${conflict.itemB.title}"`,
      severity: "high",
      affectedDates: [conflict.itemA.startAt?.split("T")[0] ?? ""],
      affectedItems: [conflict.itemA.id, conflict.itemB.id],
    });
  }

  return warnings;
}

// ========== Smart Conflict Detection ==========

export type SchedulingConflictWarning = {
  type: "overlap" | "back_to_back" | "overloaded_day" | "deadline_risk" | "buffer_conflict";
  severity: "low" | "medium" | "high";
  message: string;
  suggestedAction?: string;
  affectedItems: string[];
};

export function detectSchedulingConflicts(
  newItem: Partial<Item>,
  existingItems: Item[]
): SchedulingConflictWarning[] {
  const warnings: SchedulingConflictWarning[] = [];

  if (!newItem.startAt || !newItem.endAt) {
    return warnings;
  }

  const newStart = new Date(newItem.startAt).getTime();
  const newEnd = new Date(newItem.endAt).getTime();
  const newDate = newItem.startAt.split("T")[0];

  // Get items on the same day
  const sameDay = existingItems.filter((item) => {
    if (!item.startAt) return false;
    return item.startAt.startsWith(newDate);
  });

  // Check for direct overlaps
  for (const item of sameDay) {
    if (!item.startAt || !item.endAt) continue;

    const itemStart = new Date(item.startAt).getTime();
    const itemEnd = new Date(item.endAt).getTime();

    // Check overlap
    if (newStart < itemEnd && newEnd > itemStart) {
      warnings.push({
        type: "overlap",
        severity: "high",
        message: `Overlaps with "${item.title}"`,
        suggestedAction: `Move to after ${new Date(itemEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        affectedItems: [item.id],
      });
    }

    // Check back-to-back (no buffer between meetings)
    const gap = Math.abs(newStart - itemEnd) / 60000; // minutes
    const gap2 = Math.abs(itemStart - newEnd) / 60000;
    
    if ((gap > 0 && gap <= 5) || (gap2 > 0 && gap2 <= 5)) {
      warnings.push({
        type: "back_to_back",
        severity: "low",
        message: `Back-to-back with "${item.title}" (no buffer time)`,
        suggestedAction: "Consider adding 15 minutes buffer",
        affectedItems: [item.id],
      });
    }

    // Check buffer conflicts
    const itemBufferBefore = (item.bufferBefore ?? 0) * 60000;
    const itemBufferAfter = (item.bufferAfter ?? 0) * 60000;
    const newBufferBefore = ((newItem as Item).bufferBefore ?? 0) * 60000;
    const newBufferAfter = ((newItem as Item).bufferAfter ?? 0) * 60000;

    if (
      (newEnd > itemStart - itemBufferBefore && newEnd <= itemStart) ||
      (newStart < itemEnd + itemBufferAfter && newStart >= itemEnd)
    ) {
      warnings.push({
        type: "buffer_conflict",
        severity: "medium",
        message: `Conflicts with buffer time for "${item.title}"`,
        suggestedAction: "Move to respect meeting buffer times",
        affectedItems: [item.id],
      });
    }
  }

  // Check for overloaded day (more than 6 hours of meetings)
  const totalMeetingMinutes = sameDay.reduce((sum, item) => {
    if (!item.startAt || !item.endAt) return sum;
    const duration = (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 60000;
    return sum + duration;
  }, 0);

  const newDuration = (newEnd - newStart) / 60000;
  if (totalMeetingMinutes + newDuration > 360) {
    warnings.push({
      type: "overloaded_day",
      severity: "medium",
      message: `Day would have ${Math.round((totalMeetingMinutes + newDuration) / 60)} hours of meetings`,
      suggestedAction: "Consider scheduling on a different day",
      affectedItems: sameDay.map((i) => i.id),
    });
  }

  // Check deadline risk (scheduling meeting when tasks are due)
  const dueTasks = existingItems.filter((item) => {
    if (!item.dueAt || item.type !== "task") return false;
    return item.dueAt.startsWith(newDate) && item.status !== "completed";
  });

  if (dueTasks.length >= 3) {
    warnings.push({
      type: "deadline_risk",
      severity: "medium",
      message: `${dueTasks.length} tasks due on this day`,
      suggestedAction: "Ensure time for task completion",
      affectedItems: dueTasks.map((t) => t.id),
    });
  }

  return warnings;
}
