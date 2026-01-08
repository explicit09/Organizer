import { createItem, updateItem, deleteItem, listItems, getItem, type Item } from "./items";
import { createLabel, listLabels, addLabelToItem, removeLabelFromItem } from "./labels";
import { listAllNotifications, markNotificationDelivered, markAllNotificationsDelivered } from "./notifications";
import { logActivity } from "./activity";

// Helper to find item by ID or title
function findItem(idOrTitle: string, userId: string): Item | null {
  // First try by ID
  const byId = getItem(idOrTitle, { userId });
  if (byId) return byId;

  // Then search by title (case-insensitive)
  const allItems = listItems(undefined, { userId });
  const searchLower = idOrTitle.toLowerCase().trim();

  console.log(`[findItem] Searching for "${idOrTitle}" among ${allItems.length} items for user ${userId}`);

  // Exact match first
  const exact = allItems.find((i) => i.title.toLowerCase() === searchLower);
  if (exact) {
    console.log(`[findItem] Found exact match: "${exact.title}"`);
    return exact;
  }

  // Partial match - search term in title
  const partial = allItems.find((i) => i.title.toLowerCase().includes(searchLower));
  if (partial) {
    console.log(`[findItem] Found partial match: "${partial.title}"`);
    return partial;
  }

  // Reverse partial - title in search term
  const reversePartial = allItems.find((i) => searchLower.includes(i.title.toLowerCase()));
  if (reversePartial) {
    console.log(`[findItem] Found reverse partial match: "${reversePartial.title}"`);
    return reversePartial;
  }

  // Fuzzy match - any word matches
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2);
  const fuzzy = allItems.find((i) => {
    const titleLower = i.title.toLowerCase();
    return searchWords.some(word => titleLower.includes(word));
  });
  if (fuzzy) {
    console.log(`[findItem] Found fuzzy match: "${fuzzy.title}"`);
    return fuzzy;
  }

  console.log(`[findItem] No match found. Available titles: ${allItems.slice(0, 5).map(i => i.title).join(", ")}`);
  return null;
}

// ========== Action Types ==========

export type AgentAction =
  | { type: "create_item"; data: CreateItemAction }
  | { type: "update_item"; data: UpdateItemAction }
  | { type: "delete_item"; data: DeleteItemAction }
  | { type: "list_items"; data: ListItemsAction }
  | { type: "search_items"; data: SearchItemsAction }
  | { type: "move_item"; data: MoveItemAction }
  | { type: "create_label"; data: CreateLabelAction }
  | { type: "add_label"; data: AddLabelAction }
  | { type: "mark_complete"; data: MarkCompleteAction }
  | { type: "reschedule"; data: RescheduleAction }
  | { type: "prioritize"; data: PrioritizeAction }
  | { type: "get_summary"; data: GetSummaryAction }
  | { type: "clear_notifications"; data: ClearNotificationsAction }
  | { type: "navigate"; data: NavigateAction }
  | { type: "respond"; data: RespondAction };

type CreateItemAction = {
  title: string;
  type?: "task" | "meeting" | "school";
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "not_started" | "in_progress" | "completed" | "blocked";
  dueAt?: string;
  details?: string;
  tags?: string[];
};

type UpdateItemAction = {
  itemId: string;
  updates: Partial<{
    title: string;
    type: "task" | "meeting" | "school";
    priority: "low" | "medium" | "high" | "urgent";
    status: "not_started" | "in_progress" | "completed" | "blocked";
    dueAt: string;
    details: string;
    tags: string[];
  }>;
};

type DeleteItemAction = {
  itemId: string;
};

type ListItemsAction = {
  type?: string;
  status?: string;
  priority?: string;
  limit?: number;
};

type SearchItemsAction = {
  query: string;
  limit?: number;
};

type MoveItemAction = {
  itemId: string;
  toType: "task" | "meeting" | "school";
};

type CreateLabelAction = {
  name: string;
  color: string;
};

type AddLabelAction = {
  itemId: string;
  labelId: string;
};

type MarkCompleteAction = {
  itemIds: string[];
};

type RescheduleAction = {
  itemId: string;
  newDueAt: string;
};

type PrioritizeAction = {
  itemId: string;
  priority: "low" | "medium" | "high" | "urgent";
};

type GetSummaryAction = {
  period?: "today" | "week" | "month";
};

type ClearNotificationsAction = {
  all?: boolean;
  notificationId?: string;
};

type NavigateAction = {
  to: string;
};

type RespondAction = {
  message: string;
};

// ========== Action Execution ==========

export type ActionResult = {
  success: boolean;
  message: string;
  data?: unknown;
  navigate?: string;
};

export async function executeAction(
  action: AgentAction,
  options: { userId: string }
): Promise<ActionResult> {
  const { userId } = options;

  try {
    switch (action.type) {
      case "create_item": {
        const item = createItem(
          {
            type: action.data.type || "task",
            title: action.data.title,
            priority: action.data.priority || "medium",
            status: action.data.status || "not_started",
            dueAt: action.data.dueAt,
            details: action.data.details,
            tags: action.data.tags || [],
          },
          { userId }
        );
        logActivity({
          userId,
          action: "item_created",
          itemId: item.id,
          data: { type: item.type, title: item.title },
        });
        return {
          success: true,
          message: `Created ${action.data.type || "task"}: "${action.data.title}"`,
          data: item,
        };
      }

      case "update_item": {
        // Find by ID or title
        const existing = findItem(action.data.itemId, userId);
        if (!existing) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        const item = updateItem(existing.id, action.data.updates, { userId });
        if (!item) {
          return { success: false, message: "Failed to update item" };
        }
        logActivity({
          userId,
          action: "item_updated",
          itemId: item.id,
          data: action.data.updates,
        });
        return {
          success: true,
          message: `Updated item: "${item.title}"`,
          data: item,
        };
      }

      case "delete_item": {
        const item = findItem(action.data.itemId, userId);
        if (!item) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        const deleted = deleteItem(item.id, { userId });
        if (!deleted) {
          return { success: false, message: "Failed to delete item" };
        }
        logActivity({
          userId,
          action: "item_deleted",
          itemId: action.data.itemId,
          data: { title: item?.title },
        });
        return {
          success: true,
          message: `Deleted item: "${item?.title}"`,
        };
      }

      case "list_items": {
        const items = listItems(undefined, { userId });
        let filtered = items;

        if (action.data.type) {
          filtered = filtered.filter((i) => i.type === action.data.type);
        }
        if (action.data.status) {
          filtered = filtered.filter((i) => i.status === action.data.status);
        }
        if (action.data.priority) {
          filtered = filtered.filter((i) => i.priority === action.data.priority);
        }

        const limit = action.data.limit || 10;
        filtered = filtered.slice(0, limit);

        return {
          success: true,
          message: `Found ${filtered.length} items`,
          data: filtered,
        };
      }

      case "search_items": {
        const items = listItems(undefined, { userId });
        const query = action.data.query.toLowerCase();
        const results = items.filter(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            i.details?.toLowerCase().includes(query) ||
            i.tags?.some((t) => t.toLowerCase().includes(query))
        );
        const limit = action.data.limit || 10;
        return {
          success: true,
          message: `Found ${results.length} items matching "${action.data.query}"`,
          data: results.slice(0, limit),
        };
      }

      case "move_item": {
        const existing = findItem(action.data.itemId, userId);
        if (!existing) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        const item = updateItem(
          existing.id,
          { type: action.data.toType },
          { userId }
        );
        if (!item) {
          return { success: false, message: "Failed to move item" };
        }
        return {
          success: true,
          message: `Moved "${item.title}" to ${action.data.toType}`,
          data: item,
        };
      }

      case "create_label": {
        const label = createLabel(
          { name: action.data.name, color: action.data.color },
          { userId }
        );
        return {
          success: true,
          message: `Created label: "${action.data.name}"`,
          data: label,
        };
      }

      case "add_label": {
        const existing = findItem(action.data.itemId, userId);
        if (!existing) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        addLabelToItem(existing.id, action.data.labelId);
        return {
          success: true,
          message: "Label added to item",
        };
      }

      case "mark_complete": {
        const results: Item[] = [];
        const notFound: string[] = [];
        for (const itemIdOrTitle of action.data.itemIds) {
          const existing = findItem(itemIdOrTitle, userId);
          if (!existing) {
            notFound.push(itemIdOrTitle);
            continue;
          }
          const item = updateItem(existing.id, { status: "completed" }, { userId });
          if (item) {
            results.push(item);
            logActivity({
              userId,
              action: "item_updated",
              itemId: existing.id,
              data: { status: "completed" },
            });
          }
        }
        if (results.length === 0 && notFound.length > 0) {
          return {
            success: false,
            message: `Items not found: ${notFound.join(", ")}`,
          };
        }
        return {
          success: true,
          message: `Marked ${results.length} item(s) as complete${notFound.length > 0 ? ` (${notFound.length} not found)` : ""}`,
          data: results,
        };
      }

      case "reschedule": {
        const existing = findItem(action.data.itemId, userId);
        if (!existing) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        const item = updateItem(
          existing.id,
          { dueAt: action.data.newDueAt },
          { userId }
        );
        if (!item) {
          return { success: false, message: "Failed to reschedule item" };
        }
        return {
          success: true,
          message: `Rescheduled "${item.title}" to ${new Date(action.data.newDueAt).toLocaleDateString()}`,
          data: item,
        };
      }

      case "prioritize": {
        const existing = findItem(action.data.itemId, userId);
        if (!existing) {
          return { success: false, message: `Item not found: ${action.data.itemId}` };
        }
        const item = updateItem(
          existing.id,
          { priority: action.data.priority },
          { userId }
        );
        if (!item) {
          return { success: false, message: "Failed to update priority" };
        }
        return {
          success: true,
          message: `Set "${item.title}" to ${action.data.priority} priority`,
          data: item,
        };
      }

      case "get_summary": {
        const items = listItems(undefined, { userId });
        const now = new Date();
        let startDate = new Date(now);

        switch (action.data.period) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          default:
            startDate.setHours(0, 0, 0, 0);
        }

        const relevantItems = items.filter((i) => {
          const date = new Date(i.dueAt || i.createdAt);
          return date >= startDate && date <= now;
        });

        const stats = {
          total: relevantItems.length,
          completed: relevantItems.filter((i) => i.status === "completed").length,
          inProgress: relevantItems.filter((i) => i.status === "in_progress").length,
          notStarted: relevantItems.filter((i) => i.status === "not_started").length,
          overdue: relevantItems.filter((i) => {
            if (!i.dueAt || i.status === "completed") return false;
            return new Date(i.dueAt) < now;
          }).length,
        };

        const upcomingDue = items
          .filter((i) => i.dueAt && i.status !== "completed" && new Date(i.dueAt) > now)
          .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
          .slice(0, 5);

        return {
          success: true,
          message: `Summary for ${action.data.period || "today"}`,
          data: { stats, upcomingDue },
        };
      }

      case "clear_notifications": {
        if (action.data.all) {
          markAllNotificationsDelivered({ userId });
          return {
            success: true,
            message: "All notifications cleared",
          };
        }
        if (action.data.notificationId) {
          markNotificationDelivered(action.data.notificationId, { userId });
          return {
            success: true,
            message: "Notification cleared",
          };
        }
        return { success: false, message: "No notification specified" };
      }

      case "navigate": {
        return {
          success: true,
          message: `Navigating to ${action.data.to}`,
          navigate: action.data.to,
        };
      }

      case "respond": {
        return {
          success: true,
          message: action.data.message,
        };
      }

      default:
        return { success: false, message: "Unknown action" };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed",
    };
  }
}

// ========== Context Building ==========

export type AgentContext = {
  currentDate: string;
  currentTime: string;
  itemCounts: {
    total: number;
    tasks: number;
    meetings: number;
    school: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  upcomingItems: Array<{
    id: string;
    title: string;
    type: string;
    dueAt: string;
    priority: string;
  }>;
  recentItems: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
  }>;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  unreadNotifications: number;
};

export function buildAgentContext(options: { userId: string }): AgentContext {
  const { userId } = options;
  const now = new Date();
  const items = listItems(undefined, { userId });
  const labels = listLabels({ userId });
  const notifications = listAllNotifications({ userId, limit: 50 });

  const overdue = items.filter((i) => {
    if (!i.dueAt || i.status === "completed") return false;
    return new Date(i.dueAt) < now;
  });

  const upcoming = items
    .filter((i) => i.dueAt && i.status !== "completed" && new Date(i.dueAt) > now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  const recent = items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    currentDate: now.toISOString().split("T")[0],
    currentTime: now.toTimeString().split(" ")[0],
    itemCounts: {
      total: items.length,
      tasks: items.filter((i) => i.type === "task").length,
      meetings: items.filter((i) => i.type === "meeting").length,
      school: items.filter((i) => i.type === "school").length,
      notStarted: items.filter((i) => i.status === "not_started").length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      completed: items.filter((i) => i.status === "completed").length,
      overdue: overdue.length,
    },
    upcomingItems: upcoming.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      dueAt: i.dueAt!,
      priority: i.priority,
    })),
    recentItems: recent.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      status: i.status,
    })),
    labels: labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    unreadNotifications: notifications.filter((n) => !n.deliveredAt).length,
  };
}

// ========== System Prompt ==========

export function getSystemPrompt(context: AgentContext): string {
  return `You are an AI assistant for the Organizer app, a personal productivity platform. You help users manage their tasks, meetings, and school work.

CURRENT CONTEXT:
- Date: ${context.currentDate}
- Time: ${context.currentTime}
- Total items: ${context.itemCounts.total}
- Tasks: ${context.itemCounts.tasks}, Meetings: ${context.itemCounts.meetings}, School: ${context.itemCounts.school}
- Not started: ${context.itemCounts.notStarted}, In progress: ${context.itemCounts.inProgress}, Completed: ${context.itemCounts.completed}
- Overdue items: ${context.itemCounts.overdue}
- Unread notifications: ${context.unreadNotifications}

UPCOMING ITEMS:
${context.upcomingItems.map((i) => `- [${i.type}] "${i.title}" (${i.priority}) - Due: ${i.dueAt}`).join("\n") || "None"}

RECENT ITEMS:
${context.recentItems.map((i) => `- [${i.type}] "${i.title}" - Status: ${i.status}`).join("\n") || "None"}

AVAILABLE LABELS:
${context.labels.map((l) => `- ${l.name} (${l.color})`).join("\n") || "None"}

You can perform the following actions by responding with JSON:

1. CREATE ITEM:
{"action": "create_item", "data": {"title": "...", "type": "task|meeting|school", "priority": "low|medium|high|urgent", "dueAt": "ISO date", "details": "...", "tags": ["..."]}}

2. UPDATE ITEM:
{"action": "update_item", "data": {"itemId": "...", "updates": {"title": "...", "status": "...", "priority": "...", ...}}}

3. DELETE ITEM:
{"action": "delete_item", "data": {"itemId": "..."}}

4. LIST ITEMS:
{"action": "list_items", "data": {"type": "task", "status": "not_started", "limit": 10}}

5. SEARCH ITEMS:
{"action": "search_items", "data": {"query": "...", "limit": 10}}

6. MARK COMPLETE:
{"action": "mark_complete", "data": {"itemIds": ["...", "..."]}}

7. RESCHEDULE:
{"action": "reschedule", "data": {"itemId": "...", "newDueAt": "ISO date"}}

8. PRIORITIZE:
{"action": "prioritize", "data": {"itemId": "...", "priority": "urgent"}}

9. GET SUMMARY:
{"action": "get_summary", "data": {"period": "today|week|month"}}

10. NAVIGATE:
{"action": "navigate", "data": {"to": "/tasks|/meetings|/school|/dashboard|/inbox"}}

11. RESPOND (for conversation):
{"action": "respond", "data": {"message": "Your response to the user"}}

RULES:
- Always respond with valid JSON
- You can include multiple actions in an array
- For dates, use ISO format (YYYY-MM-DDTHH:mm:ss)
- When the user asks about their schedule/tasks, first get a summary or list items
- Be proactive in suggesting organization improvements
- When creating items, infer the type from context (study/homework = school, team meeting = meeting, etc.)
- Always be helpful and concise
- If you don't understand, ask for clarification using the respond action`;
}

// ========== Parse Actions from LLM Response ==========

export function parseActionsFromResponse(response: string): AgentAction[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) {
      // No JSON found, treat as a respond action
      return [{ type: "respond", data: { message: response } }];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Handle single action or array of actions
    const actions = Array.isArray(parsed) ? parsed : [parsed];

    return actions.map((a): AgentAction => {
      if (a.action && a.data) {
        return { type: a.action, data: a.data };
      }
      // Handle direct action format
      if (a.type && a.data) {
        return a;
      }
      // Fallback to respond
      return { type: "respond", data: { message: JSON.stringify(a) } };
    });
  } catch {
    // If parsing fails, treat the whole response as a message
    return [{ type: "respond", data: { message: response } }];
  }
}
