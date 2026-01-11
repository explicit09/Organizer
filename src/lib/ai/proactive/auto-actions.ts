// Auto-Action Framework
// Handles automated actions triggered by the proactive system

import type { ActionResult, AutomationRule, RuleCondition } from "./types";
import { getDb } from "../../db";
import { randomUUID } from "crypto";

// Action handler type
type ActionHandler = (
  params: Record<string, unknown>,
  userId: string
) => Promise<ActionResult>;

// Registry of action handlers
const actionHandlers = new Map<string, ActionHandler>();

// Register an action handler
export function registerAction(type: string, handler: ActionHandler): void {
  actionHandlers.set(type, handler);
}

// Execute an action
export async function executeAction(
  type: string,
  params: Record<string, unknown>,
  userId: string
): Promise<ActionResult> {
  const handler = actionHandlers.get(type);

  if (!handler) {
    return {
      success: false,
      message: `Unknown action type: ${type}`,
    };
  }

  try {
    const result = await handler(params, userId);

    // Log the action execution
    await logActionExecution(userId, type, params, result);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Action failed: ${message}`,
    };
  }
}

// Log action execution for audit trail
async function logActionExecution(
  userId: string,
  actionType: string,
  params: Record<string, unknown>,
  result: ActionResult
): Promise<void> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO action_log
     (id, user_id, action_type, params_json, result_json, executed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, actionType, JSON.stringify(params), JSON.stringify(result), now);
}

// Built-in Action Handlers

// Start focus session
registerAction("start_focus", async (params, userId) => {
  const db = getDb();
  const itemId = params.itemId as string | undefined;
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO focus_sessions
     (id, user_id, item_id, started_at, status)
     VALUES (?, ?, ?, ?, 'active')`
  ).run(id, userId, itemId || null, now);

  return {
    success: true,
    message: "Focus session started",
    undoAction: {
      type: "end_focus",
      params: { sessionId: id },
    },
  };
});

// End focus session
registerAction("end_focus", async (params, userId) => {
  const db = getDb();
  const sessionId = params.sessionId as string;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE focus_sessions SET ended_at = ?, status = 'completed'
     WHERE id = ? AND user_id = ?`
  ).run(now, sessionId, userId);

  return {
    success: true,
    message: "Focus session ended",
  };
});

// Start break
registerAction("start_break", async (params, userId) => {
  const db = getDb();
  const duration = (params.minutes as number) || 15;
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO breaks
     (id, user_id, started_at, planned_duration)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, now, duration);

  return {
    success: true,
    message: `Break started (${duration} minutes)`,
  };
});

// Navigate to a route
registerAction("navigate", async (params, _userId) => {
  const to = params.to as string;

  return {
    success: true,
    message: `Navigate to ${to}`,
    // Frontend will handle the actual navigation
  };
});

// View item
registerAction("view_item", async (params, _userId) => {
  const itemId = params.itemId as string;

  return {
    success: true,
    message: `View item ${itemId}`,
  };
});

// Complete habit
registerAction("complete_habit", async (params, userId) => {
  const db = getDb();
  const habitId = params.habitId as string;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO habit_completions
     (id, habit_id, user_id, completed_at)
     VALUES (?, ?, ?, ?)`
  ).run(randomUUID(), habitId, userId, now);

  return {
    success: true,
    message: "Habit completed",
    undoAction: {
      type: "undo_habit_completion",
      params: { habitId },
    },
  };
});

// Batch complete habits
registerAction("batch_complete_habits", async (params, userId) => {
  const db = getDb();
  const habitIds = params.habitIds as string[];
  const now = new Date().toISOString();

  for (const habitId of habitIds) {
    db.prepare(
      `INSERT INTO habit_completions
       (id, habit_id, user_id, completed_at)
       VALUES (?, ?, ?, ?)`
    ).run(randomUUID(), habitId, userId, now);
  }

  return {
    success: true,
    message: `${habitIds.length} habits completed`,
  };
});

// Dismiss notification
registerAction("dismiss", async (_params, _userId) => {
  return {
    success: true,
    message: "Dismissed",
  };
});

// Suggest reschedule
registerAction("suggest_reschedule", async (params, _userId) => {
  const itemId = params.itemId as string;
  const reason = params.reason as string | undefined;

  return {
    success: true,
    message: `Suggest reschedule for ${itemId}`,
    // Frontend will show reschedule dialog
  };
});

// Set reminder
registerAction("set_reminder", async (params, userId) => {
  const db = getDb();
  const itemId = params.itemId as string;
  const habitId = params.habitId as string;
  const minutes = (params.minutes as number) || 30;
  const id = randomUUID();
  const now = new Date();
  const remindAt = new Date(now.getTime() + minutes * 60 * 1000);

  db.prepare(
    `INSERT INTO reminders
     (id, user_id, item_id, habit_id, remind_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, itemId || null, habitId || null, remindAt.toISOString(), now.toISOString());

  return {
    success: true,
    message: `Reminder set for ${minutes} minutes`,
    undoAction: {
      type: "cancel_reminder",
      params: { reminderId: id },
    },
  };
});

// Cancel reminder
registerAction("cancel_reminder", async (params, _userId) => {
  const db = getDb();
  const reminderId = params.reminderId as string;

  db.prepare(`DELETE FROM reminders WHERE id = ?`).run(reminderId);

  return {
    success: true,
    message: "Reminder cancelled",
  };
});

// Show quick wins
registerAction("show_quick_wins", async (_params, _userId) => {
  return {
    success: true,
    message: "Navigate to quick wins view",
  };
});

// Show morning briefing
registerAction("show_morning_briefing", async (_params, userId) => {
  return {
    success: true,
    message: "Show morning briefing",
  };
});

// Create catch-up plan
registerAction("create_catchup_plan", async (params, userId) => {
  // This would trigger the AI to create a catch-up plan
  return {
    success: true,
    message: "Creating catch-up plan...",
  };
});

// Delete item
registerAction("delete_item", async (params, userId) => {
  const db = getDb();
  const itemId = params.itemId as string;

  // Soft delete
  db.prepare(
    `UPDATE items SET deleted_at = ? WHERE id = ? AND user_id = ?`
  ).run(new Date().toISOString(), itemId, userId);

  return {
    success: true,
    message: "Item deleted",
    undoAction: {
      type: "restore_item",
      params: { itemId },
    },
  };
});

// Restore item
registerAction("restore_item", async (params, userId) => {
  const db = getDb();
  const itemId = params.itemId as string;

  db.prepare(
    `UPDATE items SET deleted_at = NULL WHERE id = ? AND user_id = ?`
  ).run(itemId, userId);

  return {
    success: true,
    message: "Item restored",
  };
});

// Join meeting
registerAction("join_meeting", async (params, _userId) => {
  const itemId = params.itemId as string;
  // Would look up meeting URL and open it

  return {
    success: true,
    message: "Opening meeting...",
  };
});

// Batch reschedule
registerAction("batch_reschedule", async (params, userId) => {
  // This would trigger the AI to suggest reschedules for multiple items
  return {
    success: true,
    message: "Preparing batch reschedule...",
  };
});

// Automation Rule System

// Evaluate a rule against an event
export function evaluateRule(
  rule: AutomationRule,
  eventData: Record<string, unknown>
): boolean {
  if (!rule.enabled) return false;

  // Check all conditions
  return rule.trigger.conditions.every((condition) =>
    evaluateCondition(condition, eventData)
  );
}

// Evaluate a single condition
function evaluateCondition(
  condition: RuleCondition,
  data: Record<string, unknown>
): boolean {
  const value = data[condition.field];

  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    case "contains":
      return (
        typeof value === "string" &&
        typeof condition.value === "string" &&
        value.includes(condition.value)
      );
    case "greater_than":
      return (
        typeof value === "number" &&
        typeof condition.value === "number" &&
        value > condition.value
      );
    case "less_than":
      return (
        typeof value === "number" &&
        typeof condition.value === "number" &&
        value < condition.value
      );
    default:
      return false;
  }
}

// Execute a rule's actions
export async function executeRule(
  rule: AutomationRule,
  userId: string
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of rule.actions) {
    const result = await executeAction(action.type, action.params || {}, userId);
    results.push(result);
  }

  // Update rule trigger count
  const db = getDb();
  db.prepare(
    `UPDATE automation_rules SET
       last_triggered_at = ?,
       trigger_count = trigger_count + 1
     WHERE id = ?`
  ).run(new Date().toISOString(), rule.id);

  return results;
}

// Get user's automation rules
export async function getUserRules(userId: string): Promise<AutomationRule[]> {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT * FROM automation_rules WHERE user_id = ? AND deleted_at IS NULL`
    )
    .all(userId) as Array<{
    id: string;
    user_id: string;
    name: string;
    enabled: number;
    trigger_json: string;
    actions_json: string;
    created_at: string;
    last_triggered_at: string | null;
    trigger_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    enabled: row.enabled === 1,
    trigger: JSON.parse(row.trigger_json),
    actions: JSON.parse(row.actions_json),
    createdAt: new Date(row.created_at),
    lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : null,
    triggerCount: row.trigger_count,
  }));
}

// Create a new automation rule
export async function createRule(
  userId: string,
  rule: Omit<AutomationRule, "id" | "userId" | "createdAt" | "lastTriggeredAt" | "triggerCount">
): Promise<string> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO automation_rules
     (id, user_id, name, enabled, trigger_json, actions_json, created_at, trigger_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    userId,
    rule.name,
    rule.enabled ? 1 : 0,
    JSON.stringify(rule.trigger),
    JSON.stringify(rule.actions),
    now
  );

  return id;
}

// Update automation rule
export async function updateRule(
  ruleId: string,
  updates: Partial<Pick<AutomationRule, "name" | "enabled" | "trigger" | "actions">>
): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    sets.push("name = ?");
    values.push(updates.name);
  }
  if (updates.enabled !== undefined) {
    sets.push("enabled = ?");
    values.push(updates.enabled ? 1 : 0);
  }
  if (updates.trigger !== undefined) {
    sets.push("trigger_json = ?");
    values.push(JSON.stringify(updates.trigger));
  }
  if (updates.actions !== undefined) {
    sets.push("actions_json = ?");
    values.push(JSON.stringify(updates.actions));
  }

  if (sets.length === 0) return;

  values.push(ruleId);
  db.prepare(`UPDATE automation_rules SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

// Delete automation rule
export async function deleteRule(ruleId: string): Promise<void> {
  const db = getDb();
  db.prepare(`UPDATE automation_rules SET deleted_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    ruleId
  );
}
