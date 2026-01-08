import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { updateItem, type Item } from "./items";

export type AutomationTrigger =
  | "item_created"
  | "item_updated"
  | "status_changed"
  | "due_date_approaching"
  | "item_overdue";

export type AutomationAction =
  | { type: "set_status"; status: string }
  | { type: "set_priority"; priority: string }
  | { type: "add_tag"; tag: string }
  | { type: "notify"; message: string };

export type AutomationCondition = {
  field: "type" | "status" | "priority" | "tags";
  operator: "equals" | "not_equals" | "contains";
  value: string;
};

export type Automation = {
  id: string;
  userId: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

// In-memory automation store (would be DB in production)
const automationsStore = new Map<string, Automation[]>();

export function createAutomation(
  input: {
    name: string;
    trigger: AutomationTrigger;
    conditions?: AutomationCondition[];
    actions: AutomationAction[];
  },
  options?: { userId?: string }
): Automation {
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();
  const id = randomUUID();

  const automation: Automation = {
    id,
    userId,
    name: input.name,
    trigger: input.trigger,
    conditions: input.conditions ?? [],
    actions: input.actions,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const userAutomations = automationsStore.get(userId) ?? [];
  userAutomations.push(automation);
  automationsStore.set(userId, userAutomations);

  return automation;
}

export function listAutomations(options?: { userId?: string }): Automation[] {
  const userId = options?.userId ?? getDefaultUserId();
  return automationsStore.get(userId) ?? [];
}

export function getAutomation(id: string, options?: { userId?: string }): Automation | null {
  const automations = listAutomations(options);
  return automations.find((a) => a.id === id) ?? null;
}

export function updateAutomation(
  id: string,
  updates: Partial<{
    name: string;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    enabled: boolean;
  }>,
  options?: { userId?: string }
): Automation | null {
  const userId = options?.userId ?? getDefaultUserId();
  const automations = automationsStore.get(userId) ?? [];
  const index = automations.findIndex((a) => a.id === id);

  if (index === -1) return null;

  const automation = automations[index];
  const updated: Automation = {
    ...automation,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  automations[index] = updated;
  automationsStore.set(userId, automations);

  return updated;
}

export function deleteAutomation(id: string, options?: { userId?: string }): boolean {
  const userId = options?.userId ?? getDefaultUserId();
  const automations = automationsStore.get(userId) ?? [];
  const filtered = automations.filter((a) => a.id !== id);

  if (filtered.length === automations.length) return false;

  automationsStore.set(userId, filtered);
  return true;
}

// Check if an item matches automation conditions
function matchesConditions(item: Item, conditions: AutomationCondition[]): boolean {
  for (const condition of conditions) {
    let value: string | string[];

    switch (condition.field) {
      case "type":
        value = item.type;
        break;
      case "status":
        value = item.status;
        break;
      case "priority":
        value = item.priority;
        break;
      case "tags":
        value = item.tags;
        break;
      default:
        continue;
    }

    switch (condition.operator) {
      case "equals":
        if (Array.isArray(value)) {
          if (!value.includes(condition.value)) return false;
        } else {
          if (value !== condition.value) return false;
        }
        break;
      case "not_equals":
        if (Array.isArray(value)) {
          if (value.includes(condition.value)) return false;
        } else {
          if (value === condition.value) return false;
        }
        break;
      case "contains":
        if (Array.isArray(value)) {
          if (!value.some((v) => v.includes(condition.value))) return false;
        } else {
          if (!value.includes(condition.value)) return false;
        }
        break;
    }
  }

  return true;
}

// Execute automation actions on an item
export function executeAutomationActions(
  item: Item,
  actions: AutomationAction[],
  options?: { userId?: string }
): void {
  for (const action of actions) {
    switch (action.type) {
      case "set_status":
        updateItem(
          item.id,
          { status: action.status as Item["status"] },
          options
        );
        break;
      case "set_priority":
        updateItem(
          item.id,
          { priority: action.priority as Item["priority"] },
          options
        );
        break;
      case "add_tag":
        if (!item.tags.includes(action.tag)) {
          updateItem(
            item.id,
            { tags: [...item.tags, action.tag] },
            options
          );
        }
        break;
      case "notify":
        // Would create a notification here
        console.log(`Automation notification: ${action.message}`);
        break;
    }
  }
}

// Run automations for a trigger event
export function runAutomations(
  trigger: AutomationTrigger,
  item: Item,
  options?: { userId?: string }
): void {
  const automations = listAutomations(options);
  const matchingAutomations = automations.filter(
    (a) => a.enabled && a.trigger === trigger && matchesConditions(item, a.conditions)
  );

  for (const automation of matchingAutomations) {
    executeAutomationActions(item, automation.actions, options);
  }
}

// Default automations
export function createDefaultAutomations(options?: { userId?: string }): void {
  const existing = listAutomations(options);
  if (existing.length > 0) return;

  // Auto-mark overdue items as high priority
  createAutomation(
    {
      name: "Mark overdue as high priority",
      trigger: "item_overdue",
      conditions: [{ field: "priority", operator: "not_equals", value: "urgent" }],
      actions: [{ type: "set_priority", priority: "high" }],
    },
    options
  );

  // Auto-complete parent when all subtasks done
  createAutomation(
    {
      name: "Add 'urgent' tag when item is blocked",
      trigger: "status_changed",
      conditions: [{ field: "status", operator: "equals", value: "blocked" }],
      actions: [{ type: "add_tag", tag: "needs-attention" }],
    },
    options
  );
}
