import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type FavoriteType = "item" | "project" | "note" | "view";

export type Favorite = {
  id: string;
  userId: string;
  itemType: FavoriteType;
  itemId: string;
  createdAt: string;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  created_at: string;
};

function mapRow(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    itemType: row.item_type as FavoriteType,
    itemId: row.item_id,
    createdAt: row.created_at,
  };
}

export function addFavorite(
  input: { itemType: FavoriteType; itemId: string },
  options?: { userId?: string }
): Favorite {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  // Check if already favorited
  const existing = db
    .prepare(
      "SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?"
    )
    .get(userId, input.itemType, input.itemId);

  if (existing) {
    return getFavorite(input.itemType, input.itemId, options)!;
  }

  db.prepare(
    `INSERT INTO favorites (id, user_id, item_type, item_id, created_at)
     VALUES (@id, @user_id, @item_type, @item_id, @created_at)`
  ).run({
    id,
    user_id: userId,
    item_type: input.itemType,
    item_id: input.itemId,
    created_at: now,
  });

  return {
    id,
    userId,
    itemType: input.itemType,
    itemId: input.itemId,
    createdAt: now,
  };
}

export function removeFavorite(
  itemType: FavoriteType,
  itemId: string,
  options?: { userId?: string }
): boolean {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const result = db
    .prepare(
      "DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?"
    )
    .run(userId, itemType, itemId);

  return result.changes > 0;
}

export function getFavorite(
  itemType: FavoriteType,
  itemId: string,
  options?: { userId?: string }
): Favorite | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(
      "SELECT * FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?"
    )
    .get(userId, itemType, itemId) as FavoriteRow | undefined;

  return row ? mapRow(row) : null;
}

export function isFavorite(
  itemType: FavoriteType,
  itemId: string,
  options?: { userId?: string }
): boolean {
  return getFavorite(itemType, itemId, options) !== null;
}

export function listFavorites(
  options?: { userId?: string; itemType?: FavoriteType }
): Favorite[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  if (options?.itemType) {
    const rows = db
      .prepare(
        "SELECT * FROM favorites WHERE user_id = ? AND item_type = ? ORDER BY created_at DESC"
      )
      .all(userId, options.itemType) as FavoriteRow[];
    return rows.map(mapRow);
  }

  const rows = db
    .prepare("SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as FavoriteRow[];

  return rows.map(mapRow);
}

export function toggleFavorite(
  itemType: FavoriteType,
  itemId: string,
  options?: { userId?: string }
): { favorited: boolean; favorite?: Favorite } {
  if (isFavorite(itemType, itemId, options)) {
    removeFavorite(itemType, itemId, options);
    return { favorited: false };
  } else {
    const favorite = addFavorite({ itemType, itemId }, options);
    return { favorited: true, favorite };
  }
}
