import type { PriorityContext, ContextItem } from "./types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function getPriorityContext(userId: string): PriorityContext {
  const now = new Date();
  const items = listItems(undefined, { userId });
  const openItems = items.filter((i) => i.status !== "completed");

  // Get dependencies
  const db = getDb();
  const dependencies = db
    .prepare("SELECT blocker_id, blocked_id FROM dependencies WHERE user_id = ?")
    .all(userId) as Array<{ blocker_id: string; blocked_id: string }>;

  const blockingItemIds = new Set(dependencies.map((d) => d.blocker_id));
  const blockedItemIds = new Set(dependencies.map((d) => d.blocked_id));

  // Map items to ContextItem
  const toContextItem = (item: typeof openItems[0]): ContextItem => ({
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

  // Critical = urgent or high priority
  const criticalItems = openItems
    .filter((i) => i.priority === "urgent" || i.priority === "high")
    .map(toContextItem)
    .slice(0, 10);

  // Blocking = blocks other work
  const blockingItems = openItems
    .filter((i) => blockingItemIds.has(i.id))
    .map(toContextItem)
    .slice(0, 10);

  // Blocked = waiting on something
  const blockedItems = openItems
    .filter((i) => blockedItemIds.has(i.id))
    .map(toContextItem)
    .slice(0, 10);

  // Quick wins = low estimated time, not blocked
  const quickWins = openItems
    .filter((i) => (i.estimatedMinutes || 30) <= 30 && !blockedItemIds.has(i.id))
    .map(toContextItem)
    .slice(0, 5);

  // At risk = due soon but not enough time
  const atRiskDeadlines = openItems
    .filter((i) => {
      if (!i.dueAt) return false;
      const hoursUntilDue =
        (new Date(i.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60);
      const estimatedHours = (i.estimatedMinutes || 60) / 60;
      return hoursUntilDue > 0 && hoursUntilDue < estimatedHours * 2;
    })
    .map(toContextItem)
    .slice(0, 5);

  return {
    criticalItems,
    blockingItems,
    blockedItems,
    quickWins,
    atRiskDeadlines,
  };
}
