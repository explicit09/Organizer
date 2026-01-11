import type { RecentActivityContext, ContextItem, FocusSessionInfo } from "./types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function getRecentActivityContext(userId: string): RecentActivityContext {
  const db = getDb();
  const items = listItems(undefined, { userId });

  const toContextItem = (item: typeof items[0]): ContextItem => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    priority: item.priority,
    dueAt: item.dueAt,
    estimatedMinutes: item.estimatedMinutes,
    projectId: item.projectId,
    area: item.area,
  });

  // Last activity
  const lastActivity = db
    .prepare(
      `
      SELECT created_at FROM activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `
    )
    .get(userId) as { created_at: string } | undefined;

  const lastActiveAt = lastActivity ? new Date(lastActivity.created_at) : null;

  // Last completed item
  const completedItems = items
    .filter((i) => i.status === "completed" && i.updatedAt)
    .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());

  const lastCompletedItem = completedItems.length > 0
    ? toContextItem(completedItems[0])
    : null;

  // Last created item
  const sortedByCreated = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const lastCreatedItem = sortedByCreated.length > 0
    ? toContextItem(sortedByCreated[0])
    : null;

  // Recently viewed (from activity log)
  const recentViews = db
    .prepare(
      `
      SELECT DISTINCT item_id FROM activity_log
      WHERE user_id = ? AND action = 'view'
      ORDER BY created_at DESC
      LIMIT 10
    `
    )
    .all(userId) as Array<{ item_id: string }>;

  const recentlyViewed = recentViews
    .map((r) => items.find((i) => i.id === r.item_id))
    .filter((i): i is NonNullable<typeof i> => i !== undefined)
    .map(toContextItem);

  // Current focus session
  const activeSession = db
    .prepare(
      `
      SELECT fs.id, fs.item_id, fs.started_at, fs.duration_minutes, i.title as item_title
      FROM focus_sessions fs
      LEFT JOIN items i ON fs.item_id = i.id
      WHERE fs.user_id = ? AND fs.ended_at IS NULL
      ORDER BY fs.started_at DESC
      LIMIT 1
    `
    )
    .get(userId) as {
    id: string;
    item_id: string | null;
    started_at: string;
    duration_minutes: number;
    item_title: string | null;
  } | undefined;

  const currentFocusSession: FocusSessionInfo | null = activeSession
    ? {
        id: activeSession.id,
        itemId: activeSession.item_id || undefined,
        itemTitle: activeSession.item_title || undefined,
        startedAt: new Date(activeSession.started_at),
        duration: activeSession.duration_minutes,
      }
    : null;

  // Today's completions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaysCompletions = completedItems
    .filter((i) => new Date(i.updatedAt!) >= todayStart)
    .map(toContextItem);

  return {
    lastActiveAt,
    lastCompletedItem,
    lastCreatedItem,
    recentlyViewed,
    currentFocusSession,
    todaysCompletions,
  };
}
