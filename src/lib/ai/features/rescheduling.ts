import type {
  UserContext,
  ContextItem,
  RescheduleContext,
  RescheduleOption,
  RescheduleConstraints,
  TimeBlock,
} from "../context/types";
import { assembleFullContext } from "../context/assembler";
import { listItems, getItem } from "../../items";

export function suggestReschedule(
  userId: string,
  itemId: string,
  reason: RescheduleContext["reason"],
  constraints?: RescheduleConstraints
): RescheduleOption[] {
  const context = assembleFullContext({ userId });
  const items = listItems(undefined, { userId });
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return [];
  }

  const contextItem: ContextItem = {
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    priority: item.priority,
    dueAt: item.dueAt,
    estimatedMinutes: item.estimatedMinutes,
  };

  const estimatedHours = (item.estimatedMinutes || 60) / 60;
  const options: RescheduleOption[] = [];

  // Find suitable time slots
  const slots = findSuitableSlots(
    context,
    estimatedHours,
    constraints
  );

  // Generate options from slots
  for (const slot of slots.slice(0, 3)) {
    const impact = calculateRescheduleImpact(contextItem, slot.start, context);
    const confidence = calculateConfidence(slot, contextItem, context);

    options.push({
      newDueAt: slot.start,
      confidence,
      reasoning: generateReasoning(slot, contextItem, context),
      impact,
    });
  }

  // If no good options, suggest extending deadline
  if (options.every((o) => o.confidence < 0.5)) {
    const extendedDate = suggestExtendedDeadline(contextItem, context);
    const impact = calculateRescheduleImpact(contextItem, extendedDate, context);

    options.push({
      newDueAt: extendedDate,
      confidence: 0.7,
      reasoning: "Extending deadline to allow proper completion without rushing",
      impact,
    });
  }

  // Sort by confidence
  return options.sort((a, b) => b.confidence - a.confidence);
}

function findSuitableSlots(
  context: UserContext,
  requiredHours: number,
  constraints?: RescheduleConstraints
): TimeBlock[] {
  const slots: TimeBlock[] = [];
  const now = context.temporal.now;
  const lookAhead = new Date(now);
  lookAhead.setDate(lookAhead.getDate() + 14);

  // Combine today's and week's free blocks
  const allFreeBlocks = [
    ...context.calendar.freeBlocksToday,
    ...context.calendar.freeBlocksThisWeek,
  ];

  // Filter and score blocks
  for (const block of allFreeBlocks) {
    // Check duration
    if (block.durationMinutes < requiredHours * 60) continue;

    // Check constraints
    if (constraints?.notBefore && block.start < constraints.notBefore) continue;
    if (constraints?.notAfter && block.end > constraints.notAfter) continue;

    // Check weekend avoidance
    const dayOfWeek = block.start.getDay();
    if (constraints?.avoidWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    // Check day avoidance
    const dayName = block.start.toLocaleDateString("en-US", { weekday: "long" });
    if (constraints?.avoidDays?.includes(dayName)) continue;

    // Calculate slot quality
    const quality = calculateSlotQuality(block, context);
    slots.push({ ...block, quality });
  }

  // Sort by quality
  return slots.sort((a, b) => (b.quality || 0) - (a.quality || 0));
}

function calculateSlotQuality(slot: TimeBlock, context: UserContext): number {
  let quality = 0.5;

  const hour = slot.start.getHours();

  // Boost if in productive hours
  const isProductive = context.patterns.productiveHours.some((h) => {
    const [start] = h.split("-").map((t) => parseInt(t));
    return Math.abs(hour - start) <= 1;
  });
  if (isProductive) quality += 0.2;

  // Boost for morning slots (generally more productive)
  if (hour >= 9 && hour <= 11) quality += 0.1;

  // Reduce for late afternoon (energy dip)
  if (hour >= 14 && hour <= 16) quality -= 0.1;

  // Boost for longer blocks (more buffer)
  if (slot.durationMinutes > 120) quality += 0.1;

  // Reduce for weekend slots
  const dayOfWeek = slot.start.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) quality -= 0.15;

  return Math.max(0, Math.min(1, quality));
}

function calculateConfidence(
  slot: TimeBlock,
  item: ContextItem,
  context: UserContext
): number {
  let confidence = slot.quality || 0.5;

  // Boost if slot is much larger than needed
  const neededMinutes = item.estimatedMinutes || 60;
  if (slot.durationMinutes > neededMinutes * 1.5) {
    confidence += 0.15;
  }

  // Reduce if far in the future
  const daysAway = Math.floor(
    (slot.start.getTime() - context.temporal.now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysAway > 7) confidence -= 0.1;
  if (daysAway > 14) confidence -= 0.1;

  // Boost if no conflicts
  const hasConflict = context.calendar.meetingsToday.some((m) => {
    return doTimesOverlap(
      m.start,
      m.end,
      slot.start,
      new Date(slot.start.getTime() + neededMinutes * 60 * 1000)
    );
  });
  if (!hasConflict) confidence += 0.1;

  return Math.max(0.1, Math.min(1.0, confidence));
}

function generateReasoning(
  slot: TimeBlock,
  item: ContextItem,
  context: UserContext
): string {
  const parts: string[] = [];
  const hour = slot.start.getHours();

  // Time of day
  if (hour >= 9 && hour <= 11) {
    parts.push("Morning slot - typically high focus time");
  } else if (hour >= 14 && hour <= 16) {
    parts.push("Afternoon slot - consider energy levels");
  }

  // Productive hours
  const isProductive = context.patterns.productiveHours.some((h) => {
    const [start] = h.split("-").map((t) => parseInt(t));
    return Math.abs(hour - start) <= 1;
  });
  if (isProductive) {
    parts.push("Aligns with your productive hours");
  }

  // Buffer
  const neededMinutes = item.estimatedMinutes || 60;
  if (slot.durationMinutes > neededMinutes * 1.5) {
    parts.push("Has buffer time for unexpected complexity");
  }

  // Day info
  const dayName = slot.start.toLocaleDateString("en-US", { weekday: "long" });
  const dayOfWeek = slot.start.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    parts.push(`Weekend (${dayName}) - consider if work is appropriate`);
  }

  return parts.length > 0 ? parts.join(". ") : "Available time slot";
}

function calculateRescheduleImpact(
  item: ContextItem,
  newDueAt: Date,
  context: UserContext
): RescheduleOption["impact"] {
  // Check for meeting conflicts
  const conflictsCreated = context.calendar.meetingsToday.filter((m) => {
    return doTimesOverlap(
      m.start,
      m.end,
      newDueAt,
      new Date(newDueAt.getTime() + (item.estimatedMinutes || 60) * 60 * 1000)
    );
  }).length;

  // Check cascade effects (items depending on this one)
  const cascadeEffects = context.priorities.blockedItems.filter((blocked) => {
    if (!blocked.dueAt) return false;
    return new Date(blocked.dueAt) < new Date(newDueAt.getTime() + 24 * 60 * 60 * 1000);
  });

  // Calculate capacity change
  const oldDueAt = item.dueAt ? new Date(item.dueAt) : context.temporal.now;
  const oldWeek = getWeekNumber(oldDueAt);
  const newWeek = getWeekNumber(newDueAt);

  let capacityChange = 0;
  if (oldWeek !== newWeek) {
    capacityChange = (item.estimatedMinutes || 60) / 60;
  }

  return {
    conflictsCreated,
    cascadeEffects,
    capacityChange,
  };
}

function suggestExtendedDeadline(item: ContextItem, context: UserContext): Date {
  const now = context.temporal.now;
  const currentDue = item.dueAt ? new Date(item.dueAt) : now;

  // Extend by 50% of estimated time or 3 days, whichever is more
  const estimatedDays = Math.ceil((item.estimatedMinutes || 60) / (60 * 6)); // Assuming 6 productive hours/day
  const extension = Math.max(estimatedDays * 1.5, 3);

  const newDate = new Date(Math.max(currentDue.getTime(), now.getTime()));
  newDate.setDate(newDate.getDate() + Math.ceil(extension));

  // Avoid weekends
  while (newDate.getDay() === 0 || newDate.getDay() === 6) {
    newDate.setDate(newDate.getDate() + 1);
  }

  return newDate;
}

function doTimesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
