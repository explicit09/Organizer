import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems, type Item } from "./items";

export type ModuleStatus = "active" | "completed" | "cancelled";

export type Module = {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  description?: string;
  status: ModuleStatus;
  leadId?: string;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type ModuleWithProgress = Module & {
  totalItems: number;
  completedItems: number;
  progress: number;
};

type ModuleRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  status: string;
  lead_id: string | null;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ModuleRow): Module {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    projectId: row.project_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status as ModuleStatus,
    leadId: row.lead_id ?? undefined,
    startDate: row.start_date ?? undefined,
    targetDate: row.target_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createModule(
  input: {
    name: string;
    projectId?: string;
    description?: string;
    leadId?: string;
    startDate?: string;
    targetDate?: string;
  },
  options?: { userId?: string }
): Module {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `INSERT INTO modules (id, user_id, project_id, name, description, status, lead_id, start_date, target_date, created_at, updated_at)
     VALUES (@id, @user_id, @project_id, @name, @description, @status, @lead_id, @start_date, @target_date, @created_at, @updated_at)`
  ).run({
    id,
    user_id: userId,
    project_id: input.projectId ?? null,
    name: input.name,
    description: input.description ?? null,
    status: "active",
    lead_id: input.leadId ?? null,
    start_date: input.startDate ?? null,
    target_date: input.targetDate ?? null,
    created_at: now,
    updated_at: now,
  });

  return {
    id,
    userId,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    status: "active",
    leadId: input.leadId,
    startDate: input.startDate,
    targetDate: input.targetDate,
    createdAt: now,
    updatedAt: now,
  };
}

export function listModules(
  options?: { userId?: string; projectId?: string }
): Module[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  if (options?.projectId) {
    const rows = db
      .prepare(
        "SELECT * FROM modules WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC"
      )
      .all(userId, options.projectId) as ModuleRow[];
    return rows.map(mapRow);
  }

  const rows = db
    .prepare("SELECT * FROM modules WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as ModuleRow[];

  return rows.map(mapRow);
}

export function getModule(
  id: string,
  options?: { userId?: string }
): Module | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare("SELECT * FROM modules WHERE id = ? AND user_id = ?")
    .get(id, userId) as ModuleRow | undefined;

  return row ? mapRow(row) : null;
}

export function updateModule(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    status: ModuleStatus;
    leadId: string;
    startDate: string;
    targetDate: string;
  }>,
  options?: { userId?: string }
): Module | null {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `UPDATE modules SET
       name = COALESCE(@name, name),
       description = COALESCE(@description, description),
       status = COALESCE(@status, status),
       lead_id = COALESCE(@lead_id, lead_id),
       start_date = COALESCE(@start_date, start_date),
       target_date = COALESCE(@target_date, target_date),
       updated_at = @updated_at
     WHERE id = @id AND user_id = @user_id`
  ).run({
    id,
    user_id: userId,
    name: updates.name ?? null,
    description: updates.description ?? null,
    status: updates.status ?? null,
    lead_id: updates.leadId ?? null,
    start_date: updates.startDate ?? null,
    target_date: updates.targetDate ?? null,
    updated_at: now,
  });

  return getModule(id, options);
}

export function deleteModule(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare("DELETE FROM modules WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}

export function getModuleWithProgress(
  id: string,
  options?: { userId?: string }
): ModuleWithProgress | null {
  const module = getModule(id, options);
  if (!module) return null;

  const items = listItems(undefined, options);
  const moduleItems = items.filter((item) => (item as Item & { moduleId?: string }).moduleId === id);
  const completedItems = moduleItems.filter((item) => item.status === "completed").length;
  const totalItems = moduleItems.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    ...module,
    totalItems,
    completedItems,
    progress,
  };
}

export function listModulesWithProgress(
  options?: { userId?: string; projectId?: string }
): ModuleWithProgress[] {
  const modules = listModules(options);
  const items = listItems(undefined, options);

  return modules.map((module) => {
    const moduleItems = items.filter((item) => (item as Item & { moduleId?: string }).moduleId === module.id);
    const completedItems = moduleItems.filter((item) => item.status === "completed").length;
    const totalItems = moduleItems.length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      ...module,
      totalItems,
      completedItems,
      progress,
    };
  });
}
