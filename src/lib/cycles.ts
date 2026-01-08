import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { listItems, type Item } from "./items";

export type CycleStatus = "planned" | "active" | "completed";

export type Cycle = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type CycleWithProgress = Cycle & {
  items: Item[];
  totalItems: number;
  completedItems: number;
  progress: number;
};

type CycleRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CycleRow): Cycle {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    name: row.name,
    description: row.description ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    status: (row.status as CycleStatus) || "planned",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCycle(
  input: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  },
  options?: { userId?: string }
): Cycle {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      INSERT INTO cycles (id, user_id, name, description, start_date, end_date, status, created_at, updated_at)
      VALUES (@id, @user_id, @name, @description, @start_date, @end_date, 'planned', @created_at, @updated_at)
    `
  ).run({
    id,
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    start_date: input.startDate,
    end_date: input.endDate,
    created_at: now,
    updated_at: now,
  });

  return {
    id,
    userId,
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "planned",
    createdAt: now,
    updatedAt: now,
  };
}

export function listCycles(options?: { userId?: string }): Cycle[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare("SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC")
    .all(userId) as CycleRow[];

  return rows.map(mapRow);
}

export function getCycle(id: string, options?: { userId?: string }): Cycle | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare("SELECT * FROM cycles WHERE id = ? AND user_id = ?")
    .get(id, userId) as CycleRow | undefined;

  return row ? mapRow(row) : null;
}

export function getCycleWithProgress(
  id: string,
  options?: { userId?: string }
): CycleWithProgress | null {
  const cycle = getCycle(id, options);
  if (!cycle) return null;

  const allItems = listItems(undefined, options);
  const cycleItems = allItems.filter((item) => (item as Item & { cycleId?: string }).cycleId === id);
  const completedItems = cycleItems.filter((item) => item.status === "completed").length;
  const progress = cycleItems.length > 0 ? Math.round((completedItems / cycleItems.length) * 100) : 0;

  return {
    ...cycle,
    items: cycleItems,
    totalItems: cycleItems.length,
    completedItems,
    progress,
  };
}

export function updateCycle(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: CycleStatus;
  }>,
  options?: { userId?: string }
): Cycle | null {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(
    `
      UPDATE cycles SET
        name = COALESCE(@name, name),
        description = COALESCE(@description, description),
        start_date = COALESCE(@start_date, start_date),
        end_date = COALESCE(@end_date, end_date),
        status = COALESCE(@status, status),
        updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `
  ).run({
    id,
    user_id: userId,
    name: updates.name ?? null,
    description: updates.description ?? null,
    start_date: updates.startDate ?? null,
    end_date: updates.endDate ?? null,
    status: updates.status ?? null,
    updated_at: now,
  });

  return getCycle(id, options);
}

export function deleteCycle(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  // Remove cycle_id from items
  db.prepare("UPDATE items SET cycle_id = NULL WHERE cycle_id = ?").run(id);

  const result = db
    .prepare("DELETE FROM cycles WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}

export function addItemToCycle(itemId: string, cycleId: string): void {
  const db = getDb();
  db.prepare("UPDATE items SET cycle_id = ? WHERE id = ?").run(cycleId, itemId);
}

export function removeItemFromCycle(itemId: string): void {
  const db = getDb();
  db.prepare("UPDATE items SET cycle_id = NULL WHERE id = ?").run(itemId);
}

export function getActiveCycle(options?: { userId?: string }): Cycle | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(
      `
        SELECT * FROM cycles
        WHERE user_id = ? AND status = 'active'
        ORDER BY start_date DESC
        LIMIT 1
      `
    )
    .get(userId) as CycleRow | undefined;

  return row ? mapRow(row) : null;
}
