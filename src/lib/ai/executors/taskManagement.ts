import type { ToolResult, ToolExecutionContext } from "../types";
import {
  createItem,
  updateItem,
  deleteItem,
  listItems,
  getItem,
  searchItems,
  type Item,
} from "../../items";
import { logActivity } from "../../activity";

// Helper to find item by ID or title (fuzzy matching)
function findItem(idOrTitle: string, userId: string): Item | null {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrTitle);
    if (isUUID) {
      try {
        const byId = getItem(idOrTitle, { userId });
        if (byId) return byId;
      } catch {
        // Not found by ID, continue to title search
      }
    }

    const allItems = listItems(undefined, { userId });
    const searchLower = idOrTitle.toLowerCase().trim();

    // Exact match
    const exact = allItems.find((i) => i.title.toLowerCase() === searchLower);
    if (exact) return exact;

    // Partial match
    const partial = allItems.find((i) => i.title.toLowerCase().includes(searchLower));
    if (partial) return partial;

    // Reverse partial
    const reversePartial = allItems.find((i) => searchLower.includes(i.title.toLowerCase()));
    if (reversePartial) return reversePartial;

    // Fuzzy word match
    const searchWords = searchLower.split(/\s+/).filter((w) => w.length > 2);
    const fuzzy = allItems.find((i) => {
      const titleLower = i.title.toLowerCase();
      return searchWords.some((word) => titleLower.includes(word));
    });
    if (fuzzy) return fuzzy;

    return null;
  } catch {
    return null;
  }
}

// Helper to parse dates
function parseDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Invalid date
  }
  return undefined;
}

export async function executeCreateItem(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const item = createItem(
      {
        type: (input.type as "task" | "meeting" | "school") || "task",
        title: input.title as string,
        priority: (input.priority as "low" | "medium" | "high" | "urgent") || "medium",
        status: (input.status as "not_started" | "in_progress" | "completed" | "blocked") || "not_started",
        dueAt: parseDate(input.dueAt as string),
        details: input.details as string | undefined,
        estimatedMinutes: input.estimatedMinutes as number | undefined,
        parentId: input.parentId as string | undefined,
        tags: (input.tags as string[]) || [],
      },
      { userId: ctx.userId }
    );

    return {
      success: true,
      data: {
        message: `Created ${item.type}: "${item.title}"`,
        item: {
          id: item.id,
          title: item.title,
          type: item.type,
          priority: item.priority,
          status: item.status,
          dueAt: item.dueAt,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
    };
  }
}

export async function executeListItems(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const now = new Date();
    let items = listItems(undefined, { userId: ctx.userId });

    // Apply filters
    if (input.type) {
      items = items.filter((i) => i.type === input.type);
    }
    if (input.status) {
      items = items.filter((i) => i.status === input.status);
    }
    if (input.priority) {
      items = items.filter((i) => i.priority === input.priority);
    }
    if (!input.includeCompleted) {
      items = items.filter((i) => i.status !== "completed");
    }
    if (input.overdue) {
      items = items.filter((i) => {
        if (!i.dueAt || i.status === "completed") return false;
        return new Date(i.dueAt) < now;
      });
    }
    if (input.dueToday) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      items = items.filter((i) => {
        if (!i.dueAt) return false;
        const due = new Date(i.dueAt);
        return due >= todayStart && due <= todayEnd;
      });
    }
    if (input.dueBefore) {
      const before = new Date(input.dueBefore as string);
      items = items.filter((i) => i.dueAt && new Date(i.dueAt) < before);
    }
    if (input.dueAfter) {
      const after = new Date(input.dueAfter as string);
      items = items.filter((i) => i.dueAt && new Date(i.dueAt) > after);
    }

    const limit = (input.limit as number) || 20;
    items = items.slice(0, limit);

    return {
      success: true,
      data: {
        count: items.length,
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          priority: i.priority,
          dueAt: i.dueAt,
          details: i.details?.substring(0, 100),
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list items",
    };
  }
}

export async function executeUpdateItem(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const item = findItem(input.itemId as string, ctx.userId);
    if (!item) {
      return { success: false, error: `Item not found: ${input.itemId}` };
    }

    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.dueAt !== undefined) updates.dueAt = parseDate(input.dueAt as string);
    if (input.details !== undefined) updates.details = input.details;
    if (input.estimatedMinutes !== undefined) updates.estimatedMinutes = input.estimatedMinutes;

    const updated = updateItem(item.id, updates, { userId: ctx.userId });

    return {
      success: true,
      data: {
        message: `Updated item: "${updated.title}"`,
        item: {
          id: updated.id,
          title: updated.title,
          type: updated.type,
          status: updated.status,
          priority: updated.priority,
          dueAt: updated.dueAt,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
    };
  }
}

export async function executeDeleteItem(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const item = findItem(input.itemId as string, ctx.userId);
    if (!item) {
      return { success: false, error: `Item not found: ${input.itemId}` };
    }

    const deleted = deleteItem(item.id, { userId: ctx.userId });
    if (!deleted) {
      return { success: false, error: "Failed to delete item" };
    }

    return {
      success: true,
      data: { message: `Deleted item: "${item.title}"` },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

export async function executeMarkComplete(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const itemIds = input.itemIds as string[];
    const results: Array<{ id: string; title: string }> = [];
    const notFound: string[] = [];

    for (const idOrTitle of itemIds) {
      const item = findItem(idOrTitle, ctx.userId);
      if (!item) {
        notFound.push(idOrTitle);
        continue;
      }

      updateItem(item.id, { status: "completed" }, { userId: ctx.userId });
      results.push({ id: item.id, title: item.title });
    }

    if (results.length === 0 && notFound.length > 0) {
      return { success: false, error: `Items not found: ${notFound.join(", ")}` };
    }

    return {
      success: true,
      data: {
        message: `Marked ${results.length} item(s) as complete`,
        completed: results,
        notFound: notFound.length > 0 ? notFound : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark complete",
    };
  }
}

export async function executeBatchUpdate(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const filter = input.filter as Record<string, unknown>;
    const updates = input.updates as Record<string, unknown>;
    const now = new Date();

    let items = listItems(undefined, { userId: ctx.userId });

    // Apply filters
    if (filter.type) {
      items = items.filter((i) => i.type === filter.type);
    }
    if (filter.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter.priority) {
      items = items.filter((i) => i.priority === filter.priority);
    }
    if (filter.overdue) {
      items = items.filter((i) => {
        if (!i.dueAt || i.status === "completed") return false;
        return new Date(i.dueAt) < now;
      });
    }

    const results: Array<{ id: string; title: string }> = [];
    for (const item of items) {
      const normalizedUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) normalizedUpdates.status = updates.status;
      if (updates.priority !== undefined) normalizedUpdates.priority = updates.priority;
      if (updates.dueAt !== undefined) normalizedUpdates.dueAt = parseDate(updates.dueAt as string);

      updateItem(item.id, normalizedUpdates, { userId: ctx.userId });
      results.push({ id: item.id, title: item.title });
    }

    return {
      success: true,
      data: {
        message: `Updated ${results.length} item(s)`,
        updated: results,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to batch update",
    };
  }
}

export async function executeBulkCreate(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const itemsData = input.items as Array<Record<string, unknown>>;
    const created: Array<{ id: string; title: string }> = [];

    for (const data of itemsData) {
      const item = createItem(
        {
          type: (data.type as "task" | "meeting" | "school") || "task",
          title: data.title as string,
          priority: (data.priority as "low" | "medium" | "high" | "urgent") || "medium",
          status: "not_started",
          dueAt: parseDate(data.dueAt as string),
          details: data.details as string | undefined,
          estimatedMinutes: data.estimatedMinutes as number | undefined,
          parentId: data.parentId as string | undefined,
        },
        { userId: ctx.userId }
      );
      created.push({ id: item.id, title: item.title });
    }

    return {
      success: true,
      data: {
        message: `Created ${created.length} item(s)`,
        created,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk create",
    };
  }
}

export async function executeSearchItems(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const query = input.query as string;
    const limit = (input.limit as number) || 10;
    const results = searchItems(query, { userId: ctx.userId, limit });

    return {
      success: true,
      data: {
        count: results.length,
        items: results.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          priority: i.priority,
          dueAt: i.dueAt,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search items",
    };
  }
}
