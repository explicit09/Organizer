import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { getItem, type Item } from "./items";

export type Dependency = {
  id: string;
  userId: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
};

export type DependencyWithItems = Dependency & {
  blocker: Item;
  blocked: Item;
};

type DependencyRow = {
  id: string;
  user_id: string | null;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

function mapRow(row: DependencyRow): Dependency {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    blockerId: row.blocker_id,
    blockedId: row.blocked_id,
    createdAt: row.created_at,
  };
}

export function createDependency(
  input: { blockerId: string; blockedId: string },
  options?: { userId?: string }
): Dependency {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  // Prevent self-dependency
  if (input.blockerId === input.blockedId) {
    throw new Error("An item cannot block itself");
  }

  // Check for circular dependency
  const existingReverse = db
    .prepare(
      "SELECT id FROM dependencies WHERE blocker_id = ? AND blocked_id = ? AND user_id = ?"
    )
    .get(input.blockedId, input.blockerId, userId);

  if (existingReverse) {
    throw new Error("This would create a circular dependency");
  }

  db.prepare(
    `
      INSERT INTO dependencies (id, user_id, blocker_id, blocked_id, created_at)
      VALUES (@id, @user_id, @blocker_id, @blocked_id, @created_at)
    `
  ).run({
    id,
    user_id: userId,
    blocker_id: input.blockerId,
    blocked_id: input.blockedId,
    created_at: now,
  });

  return {
    id,
    userId,
    blockerId: input.blockerId,
    blockedId: input.blockedId,
    createdAt: now,
  };
}

export function deleteDependency(id: string, options?: { userId?: string }): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare("DELETE FROM dependencies WHERE id = ? AND user_id = ?")
    .run(id, userId);

  return result.changes > 0;
}

export function getBlockers(
  itemId: string,
  options?: { userId?: string }
): Item[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT blocker_id FROM dependencies
        WHERE blocked_id = ? AND user_id = ?
      `
    )
    .all(itemId, userId) as { blocker_id: string }[];

  return rows.map((row) => {
    try {
      return getItem(row.blocker_id, options);
    } catch {
      return null;
    }
  }).filter((item): item is Item => item !== null);
}

export function getBlocking(
  itemId: string,
  options?: { userId?: string }
): Item[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const rows = db
    .prepare(
      `
        SELECT blocked_id FROM dependencies
        WHERE blocker_id = ? AND user_id = ?
      `
    )
    .all(itemId, userId) as { blocked_id: string }[];

  return rows.map((row) => {
    try {
      return getItem(row.blocked_id, options);
    } catch {
      return null;
    }
  }).filter((item): item is Item => item !== null);
}

export function getItemDependencies(
  itemId: string,
  options?: { userId?: string }
): { blockers: Item[]; blocking: Item[] } {
  return {
    blockers: getBlockers(itemId, options),
    blocking: getBlocking(itemId, options),
  };
}

export function isBlocked(
  itemId: string,
  options?: { userId?: string }
): boolean {
  const blockers = getBlockers(itemId, options);
  return blockers.some((blocker) => blocker.status !== "completed");
}
