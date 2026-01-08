import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { logActivity } from "./activity";
import { getDefaultUserId } from "./auth";
import { upsertNotificationForItem } from "./notifications";

export const itemTypeValues = ["task", "meeting", "school"] as const;
export const itemStatusValues = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
] as const;
export const itemPriorityValues = ["urgent", "high", "medium", "low"] as const;

export type ItemType = (typeof itemTypeValues)[number];
export type ItemStatus = (typeof itemStatusValues)[number];
export type ItemPriority = (typeof itemPriorityValues)[number];

export const recurrenceRuleValues = ["daily", "weekly", "biweekly", "monthly", "yearly"] as const;
export type RecurrenceRule = (typeof recurrenceRuleValues)[number];

export type Item = {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  details?: string;
  status: ItemStatus;
  priority: ItemPriority;
  tags: string[];
  dueAt?: string;
  startAt?: string;
  endAt?: string;
  estimatedMinutes?: number;
  parentId?: string;
  courseId?: string;
  projectId?: string;
  // Recurring task fields
  recurrenceRule?: RecurrenceRule;
  recurrenceEnd?: string;
  originalItemId?: string;
  // Meeting fields
  agenda?: string;
  bufferBefore?: number;
  bufferAfter?: number;
  // School fields
  grade?: number;
  gradeWeight?: number;
  // Assignment fields
  assigneeId?: string;
  moduleId?: string;
  cycleId?: string;
  createdAt: string;
  updatedAt: string;
};

const itemCreateSchema = z.object({
  type: z.enum(itemTypeValues),
  title: z.string().min(1),
  details: z.string().optional(),
  status: z.enum(itemStatusValues).optional().default("not_started"),
  priority: z.enum(itemPriorityValues).optional().default("medium"),
  tags: z.array(z.string()).optional().default([]),
  dueAt: z.string().datetime().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  parentId: z.string().optional(),
  courseId: z.string().optional(),
  projectId: z.string().optional(),
  // Recurring task fields
  recurrenceRule: z.enum(recurrenceRuleValues).optional(),
  recurrenceEnd: z.string().datetime().optional(),
  originalItemId: z.string().optional(),
  // Meeting fields
  agenda: z.string().optional(),
  bufferBefore: z.number().int().min(0).optional(),
  bufferAfter: z.number().int().min(0).optional(),
  // School fields
  grade: z.number().min(0).max(100).optional(),
  gradeWeight: z.number().min(0).max(100).optional(),
  // Assignment fields
  assigneeId: z.string().optional(),
  moduleId: z.string().optional(),
  cycleId: z.string().optional(),
});

const itemPatchSchema = itemCreateSchema.partial();

type ItemRow = {
  id: string;
  user_id: string | null;
  type: ItemType;
  title: string;
  details: string | null;
  status: ItemStatus;
  priority: ItemPriority;
  tags_json: string | null;
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  estimated_minutes: number | null;
  parent_id: string | null;
  course_id: string | null;
  project_id: string | null;
  recurrence_rule: string | null;
  recurrence_end: string | null;
  original_item_id: string | null;
  agenda: string | null;
  buffer_before: number | null;
  buffer_after: number | null;
  grade: number | null;
  grade_weight: number | null;
  assignee_id: string | null;
  module_id: string | null;
  cycle_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    type: row.type,
    title: row.title,
    details: row.details ?? undefined,
    status: row.status,
    priority: row.priority,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
    dueAt: row.due_at ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    parentId: row.parent_id ?? undefined,
    courseId: row.course_id ?? undefined,
    projectId: row.project_id ?? undefined,
    recurrenceRule: (row.recurrence_rule as RecurrenceRule) ?? undefined,
    recurrenceEnd: row.recurrence_end ?? undefined,
    originalItemId: row.original_item_id ?? undefined,
    agenda: row.agenda ?? undefined,
    bufferBefore: row.buffer_before ?? undefined,
    bufferAfter: row.buffer_after ?? undefined,
    grade: row.grade ?? undefined,
    gradeWeight: row.grade_weight ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    moduleId: row.module_id ?? undefined,
    cycleId: row.cycle_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createItem(
  input: z.input<typeof itemCreateSchema>,
  options?: { userId?: string }
): Item {
  const data = itemCreateSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO items (
        id, user_id, type, title, details, status, priority, tags_json, due_at, start_at, end_at,
        estimated_minutes, parent_id, course_id, project_id,
        recurrence_rule, recurrence_end, original_item_id,
        agenda, buffer_before, buffer_after, grade, grade_weight,
        assignee_id, module_id, cycle_id,
        created_at, updated_at
      )
      VALUES (
        @id, @user_id, @type, @title, @details, @status, @priority, @tags_json, @due_at, @start_at, @end_at,
        @estimated_minutes, @parent_id, @course_id, @project_id,
        @recurrence_rule, @recurrence_end, @original_item_id,
        @agenda, @buffer_before, @buffer_after, @grade, @grade_weight,
        @assignee_id, @module_id, @cycle_id,
        @created_at, @updated_at
      )
    `
  ).run({
    id,
    user_id: userId,
    type: data.type,
    title: data.title,
    details: data.details ?? null,
    status: data.status,
    priority: data.priority,
    tags_json: JSON.stringify(data.tags ?? []),
    due_at: data.dueAt ?? null,
    start_at: data.startAt ?? null,
    end_at: data.endAt ?? null,
    estimated_minutes: data.estimatedMinutes ?? null,
    parent_id: data.parentId ?? null,
    course_id: data.courseId ?? null,
    project_id: data.projectId ?? null,
    recurrence_rule: data.recurrenceRule ?? null,
    recurrence_end: data.recurrenceEnd ?? null,
    original_item_id: data.originalItemId ?? null,
    agenda: data.agenda ?? null,
    buffer_before: data.bufferBefore ?? null,
    buffer_after: data.bufferAfter ?? null,
    grade: data.grade ?? null,
    grade_weight: data.gradeWeight ?? null,
    assignee_id: data.assigneeId ?? null,
    module_id: data.moduleId ?? null,
    cycle_id: data.cycleId ?? null,
    created_at: now,
    updated_at: now,
  });

  logActivity({
    userId,
    itemId: id,
    action: "item_created",
    data: { type: data.type, title: data.title },
  });

  const item = getItem(id, { userId });
  upsertNotificationForItem(item, { userId });
  return item;
}

export function getItem(id: string, options?: { userId?: string }): Item {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db
    .prepare(
      `
        SELECT
          id, user_id, type, title, details, status, priority, tags_json,
          due_at, start_at, end_at, estimated_minutes, parent_id,
          course_id, project_id, recurrence_rule, recurrence_end, original_item_id,
          agenda, buffer_before, buffer_after, grade, grade_weight,
          assignee_id, module_id, cycle_id,
          created_at, updated_at
        FROM items
        WHERE id = ? AND user_id = ?
      `
    )
    .get(id, userId) as ItemRow | undefined;

  if (!row) {
    throw new Error(`Item not found: ${id}`);
  }

  return mapRow(row);
}

export function listItems(
  filters?: { type?: ItemType; status?: ItemStatus },
  options?: { userId?: string }
) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const clauses: string[] = [];
  const params: Record<string, ItemType | ItemStatus | string> = {
    user_id: userId,
  };

  clauses.push("user_id = @user_id");

  if (filters?.type) {
    clauses.push("type = @type");
    params.type = filters.type;
  }

  if (filters?.status) {
    clauses.push("status = @status");
    params.status = filters.status;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
        SELECT
          id, user_id, type, title, details, status, priority, tags_json,
          due_at, start_at, end_at, estimated_minutes, parent_id,
          course_id, project_id, recurrence_rule, recurrence_end, original_item_id,
          agenda, buffer_before, buffer_after, grade, grade_weight,
          created_at, updated_at
        FROM items
        ${where}
        ORDER BY created_at DESC
      `
    )
    .all(params) as ItemRow[];

  return rows.map(mapRow);
}

export function searchItems(
  query: string,
  options?: { userId?: string; limit?: number }
) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 10;
  const like = `%${query.trim().toLowerCase()}%`;

  const rows = db
    .prepare(
      `
        SELECT
          id, user_id, type, title, details, status, priority, tags_json,
          due_at, start_at, end_at, estimated_minutes, parent_id,
          course_id, project_id, recurrence_rule, recurrence_end, original_item_id,
          agenda, buffer_before, buffer_after, grade, grade_weight,
          created_at, updated_at
        FROM items
        WHERE user_id = @user_id
          AND (
            LOWER(title) LIKE @like
            OR LOWER(COALESCE(details, '')) LIKE @like
            OR LOWER(COALESCE(tags_json, '')) LIKE @like
          )
        ORDER BY created_at DESC
        LIMIT @limit
      `
    )
    .all({ user_id: userId, like, limit }) as ItemRow[];

  return rows.map(mapRow);
}

export function updateItem(
  id: string,
  patch: z.input<typeof itemPatchSchema>,
  options?: { userId?: string }
): Item {
  const data = itemPatchSchema.parse(patch);
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      UPDATE items
      SET
        type = COALESCE(@type, type),
        title = COALESCE(@title, title),
        details = COALESCE(@details, details),
        status = COALESCE(@status, status),
        priority = COALESCE(@priority, priority),
        tags_json = COALESCE(@tags_json, tags_json),
        due_at = COALESCE(@due_at, due_at),
        start_at = COALESCE(@start_at, start_at),
        end_at = COALESCE(@end_at, end_at),
        estimated_minutes = COALESCE(@estimated_minutes, estimated_minutes),
        parent_id = COALESCE(@parent_id, parent_id),
        course_id = COALESCE(@course_id, course_id),
        project_id = COALESCE(@project_id, project_id),
        recurrence_rule = COALESCE(@recurrence_rule, recurrence_rule),
        recurrence_end = COALESCE(@recurrence_end, recurrence_end),
        original_item_id = COALESCE(@original_item_id, original_item_id),
        agenda = COALESCE(@agenda, agenda),
        buffer_before = COALESCE(@buffer_before, buffer_before),
        buffer_after = COALESCE(@buffer_after, buffer_after),
        grade = COALESCE(@grade, grade),
        grade_weight = COALESCE(@grade_weight, grade_weight),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    type: data.type ?? null,
    title: data.title ?? null,
    details: data.details ?? null,
    status: data.status ?? null,
    priority: data.priority ?? null,
    tags_json: data.tags ? JSON.stringify(data.tags) : null,
    due_at: data.dueAt ?? null,
    start_at: data.startAt ?? null,
    end_at: data.endAt ?? null,
    estimated_minutes: data.estimatedMinutes ?? null,
    parent_id: data.parentId ?? null,
    course_id: data.courseId ?? null,
    project_id: data.projectId ?? null,
    recurrence_rule: data.recurrenceRule ?? null,
    recurrence_end: data.recurrenceEnd ?? null,
    original_item_id: data.originalItemId ?? null,
    agenda: data.agenda ?? null,
    buffer_before: data.bufferBefore ?? null,
    buffer_after: data.bufferAfter ?? null,
    grade: data.grade ?? null,
    grade_weight: data.gradeWeight ?? null,
    updated_at: now,
  });

  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(updateData).length > 0) {
    logActivity({
      userId,
      itemId: id,
      action: "item_updated",
      data: updateData,
    });
  }

  const item = getItem(id, { userId });
  upsertNotificationForItem(item, { userId });
  return item;
}

export function deleteItem(id: string, options?: { userId?: string }) {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const result = db
    .prepare("DELETE FROM items WHERE id = ? AND user_id = ?")
    .run(id, userId);

  if (result.changes > 0) {
    logActivity({
      userId,
      itemId: id,
      action: "item_deleted",
    });
  }

  return result.changes > 0;
}

// ========== Subtask Progress Tracking ==========

export type ItemProgress = {
  total: number;
  completed: number;
  percentage: number;
};

export type ItemWithProgress = Item & {
  subtasks: Item[];
  progress: ItemProgress;
};

export function getSubtasks(
  parentId: string,
  options?: { userId?: string }
): Item[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT
          id, user_id, type, title, details, status, priority, tags_json,
          due_at, start_at, end_at, estimated_minutes, parent_id,
          course_id, project_id, recurrence_rule, recurrence_end, original_item_id,
          agenda, buffer_before, buffer_after, grade, grade_weight,
          created_at, updated_at
        FROM items
        WHERE parent_id = ? AND user_id = ?
        ORDER BY created_at ASC
      `
    )
    .all(parentId, userId) as ItemRow[];

  return rows.map(mapRow);
}

export function calculateProgress(items: Item[]): ItemProgress {
  const total = items.length;
  if (total === 0) {
    return { total: 0, completed: 0, percentage: 100 };
  }

  const completed = items.filter((item) => item.status === "completed").length;
  const percentage = Math.round((completed / total) * 100);

  return { total, completed, percentage };
}

export function getItemWithProgress(
  id: string,
  options?: { userId?: string }
): ItemWithProgress {
  const item = getItem(id, options);
  const subtasks = getSubtasks(id, options);
  const progress = calculateProgress(subtasks);

  return { ...item, subtasks, progress };
}

export function listItemsWithProgress(
  filters?: { type?: ItemType; status?: ItemStatus },
  options?: { userId?: string }
): ItemWithProgress[] {
  const items = listItems(filters, options);

  return items
    .filter((item) => !item.parentId) // Only top-level items
    .map((item) => {
      const subtasks = getSubtasks(item.id, options);
      const progress = calculateProgress(subtasks);
      return { ...item, subtasks, progress };
    });
}

// ========== Recurring Tasks ==========

function getNextOccurrence(
  fromDate: Date,
  rule: RecurrenceRule
): Date {
  const next = new Date(fromDate);

  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export function generateRecurringInstances(
  templateId: string,
  options?: { userId?: string; untilDate?: Date }
): Item[] {
  const template = getItem(templateId, options);

  if (!template.recurrenceRule) {
    return [];
  }

  const endDate = template.recurrenceEnd
    ? new Date(template.recurrenceEnd)
    : options?.untilDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

  const instances: Item[] = [];
  let currentDate = template.dueAt
    ? new Date(template.dueAt)
    : new Date();

  while (currentDate <= endDate) {
    currentDate = getNextOccurrence(currentDate, template.recurrenceRule);

    if (currentDate > endDate) break;

    // Check if instance already exists
    const existingInstance = listItems(undefined, options).find(
      (item) =>
        item.originalItemId === templateId &&
        item.dueAt === currentDate.toISOString()
    );

    if (!existingInstance) {
      const instance = createItem(
        {
          type: template.type,
          title: template.title,
          details: template.details,
          status: "not_started",
          priority: template.priority,
          tags: template.tags,
          dueAt: currentDate.toISOString(),
          estimatedMinutes: template.estimatedMinutes,
          courseId: template.courseId,
          projectId: template.projectId,
          originalItemId: templateId,
        },
        options
      );
      instances.push(instance);
    }
  }

  return instances;
}

export function getRecurringTemplates(
  options?: { userId?: string }
): Item[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT
          id, user_id, type, title, details, status, priority, tags_json,
          due_at, start_at, end_at, estimated_minutes, parent_id,
          course_id, project_id, recurrence_rule, recurrence_end, original_item_id,
          agenda, buffer_before, buffer_after, grade, grade_weight,
          created_at, updated_at
        FROM items
        WHERE user_id = ? AND recurrence_rule IS NOT NULL
        ORDER BY created_at DESC
      `
    )
    .all(userId) as ItemRow[];

  return rows.map(mapRow);
}

// ========== Grade Tracking ==========

export type CourseGradeSummary = {
  courseId: string;
  courseName?: string;
  totalItems: number;
  gradedItems: number;
  weightedAverage: number | null;
  simpleAverage: number | null;
};

export function getCourseGrades(
  courseId: string,
  options?: { userId?: string }
): CourseGradeSummary {
  const items = listItems({ type: "school" }, options).filter(
    (item) => item.courseId === courseId && item.grade !== undefined
  );

  const gradedItems = items.filter((item) => item.grade !== undefined);
  const totalItems = items.length;

  if (gradedItems.length === 0) {
    return {
      courseId,
      totalItems,
      gradedItems: 0,
      weightedAverage: null,
      simpleAverage: null,
    };
  }

  // Simple average
  const simpleAverage =
    gradedItems.reduce((sum, item) => sum + (item.grade ?? 0), 0) /
    gradedItems.length;

  // Weighted average (if weights are provided)
  const itemsWithWeight = gradedItems.filter((item) => item.gradeWeight);
  let weightedAverage: number | null = null;

  if (itemsWithWeight.length > 0) {
    const totalWeight = itemsWithWeight.reduce(
      (sum, item) => sum + (item.gradeWeight ?? 0),
      0
    );
    weightedAverage =
      itemsWithWeight.reduce(
        (sum, item) => sum + (item.grade ?? 0) * (item.gradeWeight ?? 0),
        0
      ) / totalWeight;
  }

  return {
    courseId,
    totalItems,
    gradedItems: gradedItems.length,
    weightedAverage,
    simpleAverage,
  };
}
