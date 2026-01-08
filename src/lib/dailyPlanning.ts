import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems, type Item } from "./items";

// ========== Types ==========

export type TimeBlock = {
  id: string;
  itemId?: string;
  title: string;
  startTime: string; // HH:mm format
  endTime: string;
  type: "task" | "meeting" | "focus" | "break" | "buffer";
};

export type TopPriority = {
  id: string;
  itemId?: string;
  title: string;
  completed: boolean;
};

export type Reflection = {
  wentWell: string[];
  couldImprove: string[];
  gratitude: string;
  energyLevel: number; // 1-5
  notes: string;
};

export type DailyPlan = {
  id: string;
  userId: string;
  date: string;
  topPriorities: TopPriority[];
  timeBlocks: TimeBlock[];
  reflection?: Reflection;
  energyLevel?: "morning" | "afternoon" | "evening";
  createdAt: string;
  updatedAt: string;
};

type DailyPlanRow = {
  id: string;
  user_id: string;
  date: string;
  top_priorities_json: string | null;
  time_blocks_json: string | null;
  reflection_json: string | null;
  energy_level: string | null;
  created_at: string;
  updated_at: string;
};

// ========== Helpers ==========

function mapRow(row: DailyPlanRow): DailyPlan {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    topPriorities: row.top_priorities_json ? JSON.parse(row.top_priorities_json) : [],
    timeBlocks: row.time_blocks_json ? JSON.parse(row.time_blocks_json) : [],
    reflection: row.reflection_json ? JSON.parse(row.reflection_json) : undefined,
    energyLevel: row.energy_level as DailyPlan["energyLevel"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ========== CRUD Operations ==========

export function getDailyPlan(
  date: Date | string,
  options?: { userId?: string }
): DailyPlan | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const dateKey = typeof date === "string" ? date : toDateKey(date);

  const row = db
    .prepare(
      `SELECT * FROM daily_plans WHERE user_id = ? AND date = ?`
    )
    .get(userId, dateKey) as DailyPlanRow | undefined;

  return row ? mapRow(row) : null;
}

export function createOrUpdateDailyPlan(
  date: Date | string,
  data: Partial<{
    topPriorities: TopPriority[];
    timeBlocks: TimeBlock[];
    reflection: Reflection;
    energyLevel: "morning" | "afternoon" | "evening";
  }>,
  options?: { userId?: string }
): DailyPlan {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const dateKey = typeof date === "string" ? date : toDateKey(date);
  const now = new Date().toISOString();

  const existing = getDailyPlan(dateKey, { userId });

  if (existing) {
    const updated = {
      topPriorities: data.topPriorities ?? existing.topPriorities,
      timeBlocks: data.timeBlocks ?? existing.timeBlocks,
      reflection: data.reflection ?? existing.reflection,
      energyLevel: data.energyLevel ?? existing.energyLevel,
    };

    db.prepare(
      `UPDATE daily_plans SET
        top_priorities_json = ?,
        time_blocks_json = ?,
        reflection_json = ?,
        energy_level = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      JSON.stringify(updated.topPriorities),
      JSON.stringify(updated.timeBlocks),
      updated.reflection ? JSON.stringify(updated.reflection) : null,
      updated.energyLevel ?? null,
      now,
      existing.id
    );

    return getDailyPlan(dateKey, { userId })!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO daily_plans (id, user_id, date, top_priorities_json, time_blocks_json, reflection_json, energy_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    dateKey,
    JSON.stringify(data.topPriorities ?? []),
    JSON.stringify(data.timeBlocks ?? []),
    data.reflection ? JSON.stringify(data.reflection) : null,
    data.energyLevel ?? null,
    now,
    now
  );

  return getDailyPlan(dateKey, { userId })!;
}

export function setTopPriorities(
  date: Date | string,
  priorities: TopPriority[],
  options?: { userId?: string }
): DailyPlan {
  return createOrUpdateDailyPlan(date, { topPriorities: priorities }, options);
}

export function markPriorityComplete(
  date: Date | string,
  priorityId: string,
  completed: boolean,
  options?: { userId?: string }
): DailyPlan | null {
  const plan = getDailyPlan(date, options);
  if (!plan) return null;

  const updated = plan.topPriorities.map((p) =>
    p.id === priorityId ? { ...p, completed } : p
  );

  return createOrUpdateDailyPlan(date, { topPriorities: updated }, options);
}

export function setTimeBlocks(
  date: Date | string,
  blocks: TimeBlock[],
  options?: { userId?: string }
): DailyPlan {
  return createOrUpdateDailyPlan(date, { timeBlocks: blocks }, options);
}

export function saveReflection(
  date: Date | string,
  reflection: Reflection,
  options?: { userId?: string }
): DailyPlan {
  return createOrUpdateDailyPlan(date, { reflection }, options);
}

// ========== AI-Powered Plan Generation ==========

export type DailyBriefing = {
  greeting: string;
  date: string;
  summary: {
    totalItems: number;
    meetings: number;
    tasks: number;
    school: number;
    overdue: number;
  };
  suggestedPriorities: TopPriority[];
  upcomingDeadlines: Array<{ title: string; dueAt: string; daysUntil: number }>;
  conflicts: Array<{ message: string }>;
  motivationalMessage: string;
};

export function generateDailyBriefing(options?: { userId?: string }): DailyBriefing {
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date();
  const today = toDateKey(now);
  const hour = now.getHours();

  // Greeting based on time
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  // Get all items for today
  const allItems = listItems(undefined, { userId });
  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // Items due today or with start time today
  const todayItems = allItems.filter((item) => {
    if (item.status === "completed") return false;
    const dueDate = item.dueAt ? new Date(item.dueAt) : null;
    const startDate = item.startAt ? new Date(item.startAt) : null;
    return (
      (dueDate && dueDate >= todayStart && dueDate <= todayEnd) ||
      (startDate && startDate >= todayStart && startDate <= todayEnd)
    );
  });

  // Overdue items
  const overdueItems = allItems.filter((item) => {
    if (item.status === "completed") return false;
    const dueDate = item.dueAt ? new Date(item.dueAt) : null;
    return dueDate && dueDate < todayStart;
  });

  // Summary
  const summary = {
    totalItems: todayItems.length + overdueItems.length,
    meetings: todayItems.filter((i) => i.type === "meeting").length,
    tasks: todayItems.filter((i) => i.type === "task").length,
    school: todayItems.filter((i) => i.type === "school").length,
    overdue: overdueItems.length,
  };

  // Suggested priorities (top 3 by priority and due date)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...todayItems, ...overdueItems].sort((a, b) => {
    const aPrio = priorityOrder[a.priority] ?? 3;
    const bPrio = priorityOrder[b.priority] ?? 3;
    if (aPrio !== bPrio) return aPrio - bPrio;
    return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  });

  const suggestedPriorities: TopPriority[] = sorted.slice(0, 3).map((item) => ({
    id: randomUUID(),
    itemId: item.id,
    title: item.title,
    completed: false,
  }));

  // Upcoming deadlines (next 7 days)
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const upcomingDeadlines = allItems
    .filter((item) => {
      if (item.status === "completed") return false;
      const dueDate = item.dueAt ? new Date(item.dueAt) : null;
      return dueDate && dueDate > todayEnd && dueDate <= weekFromNow;
    })
    .map((item) => {
      const dueDate = new Date(item.dueAt!);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return { title: item.title, dueAt: item.dueAt!, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Detect conflicts (overlapping meetings)
  const conflicts: Array<{ message: string }> = [];
  const meetings = todayItems
    .filter((i) => i.type === "meeting" && i.startAt && i.endAt)
    .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));

  for (let i = 0; i < meetings.length - 1; i++) {
    const current = meetings[i];
    const next = meetings[i + 1];
    if (current.endAt && next.startAt && current.endAt > next.startAt) {
      conflicts.push({
        message: `"${current.title}" overlaps with "${next.title}"`,
      });
    }
  }

  // Motivational messages
  const messages = [
    "You've got this! Focus on one thing at a time.",
    "Small progress is still progress. Keep going!",
    "Today is a new opportunity to make things happen.",
    "Remember: done is better than perfect.",
    "Take breaks when you need them. You're doing great!",
  ];
  const motivationalMessage = messages[Math.floor(Math.random() * messages.length)];

  return {
    greeting,
    date: today,
    summary,
    suggestedPriorities,
    upcomingDeadlines,
    conflicts,
    motivationalMessage,
  };
}

// ========== Time Block Suggestions ==========

export function suggestTimeBlocks(
  items: Item[],
  options?: {
    workStartHour?: number;
    workEndHour?: number;
    focusDuration?: number;
    breakDuration?: number;
  }
): TimeBlock[] {
  const workStart = options?.workStartHour ?? 9;
  const workEnd = options?.workEndHour ?? 18;
  const focusDuration = options?.focusDuration ?? 90; // minutes
  const breakDuration = options?.breakDuration ?? 15;

  const blocks: TimeBlock[] = [];
  let currentMinutes = workStart * 60;
  const endMinutes = workEnd * 60;

  // First, add all meetings
  const meetings = items
    .filter((i) => i.type === "meeting" && i.startAt && i.endAt)
    .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));

  for (const meeting of meetings) {
    const start = new Date(meeting.startAt!);
    const end = new Date(meeting.endAt!);
    blocks.push({
      id: randomUUID(),
      itemId: meeting.id,
      title: meeting.title,
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      type: "meeting",
    });
  }

  // Fill gaps with focus blocks for tasks
  const tasks = items.filter(
    (i) => i.type === "task" && i.status !== "completed"
  );

  let taskIndex = 0;
  while (currentMinutes < endMinutes && taskIndex < tasks.length) {
    const startHour = Math.floor(currentMinutes / 60);
    const startMin = currentMinutes % 60;
    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;

    // Check for meeting conflict
    const meetingConflict = blocks.find((b) => {
      if (b.type !== "meeting") return false;
      const [mStartH, mStartM] = b.startTime.split(":").map(Number);
      const [mEndH, mEndM] = b.endTime.split(":").map(Number);
      const mStartMins = mStartH * 60 + mStartM;
      const mEndMins = mEndH * 60 + mEndM;
      return currentMinutes >= mStartMins && currentMinutes < mEndMins;
    });

    if (meetingConflict) {
      const [mEndH, mEndM] = meetingConflict.endTime.split(":").map(Number);
      currentMinutes = mEndH * 60 + mEndM;
      continue;
    }

    // Add focus block
    const task = tasks[taskIndex];
    const duration = Math.min(task.estimatedMinutes ?? focusDuration, endMinutes - currentMinutes);
    const endMins = currentMinutes + duration;
    const endHour = Math.floor(endMins / 60);
    const endMin = endMins % 60;

    blocks.push({
      id: randomUUID(),
      itemId: task.id,
      title: task.title,
      startTime,
      endTime: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
      type: "focus",
    });

    currentMinutes = endMins + breakDuration;
    taskIndex++;

    // Add break if there's time
    if (currentMinutes < endMinutes && taskIndex < tasks.length) {
      const breakEndMins = Math.min(currentMinutes, endMinutes);
      const breakStartMins = breakEndMins - breakDuration;
      if (breakStartMins >= 0) {
        blocks.push({
          id: randomUUID(),
          title: "Break",
          startTime: `${String(Math.floor(breakStartMins / 60)).padStart(2, "0")}:${String(breakStartMins % 60).padStart(2, "0")}`,
          endTime: `${String(Math.floor(breakEndMins / 60)).padStart(2, "0")}:${String(breakEndMins % 60).padStart(2, "0")}`,
          type: "break",
        });
      }
    }
  }

  // Sort blocks by start time
  return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ========== History ==========

export function listDailyPlans(
  options?: { userId?: string; limit?: number; startDate?: string; endDate?: string }
): DailyPlan[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 30;

  let query = `SELECT * FROM daily_plans WHERE user_id = ?`;
  const params: (string | number)[] = [userId];

  if (options?.startDate) {
    query += ` AND date >= ?`;
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ` AND date <= ?`;
    params.push(options.endDate);
  }

  query += ` ORDER BY date DESC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(query).all(...params) as DailyPlanRow[];
  return rows.map(mapRow);
}

export function getDailyPlanStreak(options?: { userId?: string }): number {
  const userId = options?.userId ?? getDefaultUserId();
  const plans = listDailyPlans({ userId, limit: 60 });

  if (plans.length === 0) return 0;

  let streak = 0;
  const today = toDateKey(new Date());
  let checkDate = new Date(today);

  for (let i = 0; i < 60; i++) {
    const dateKey = toDateKey(checkDate);
    const hasPlan = plans.some((p) => p.date === dateKey);

    if (hasPlan) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today doesn't have a plan yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
