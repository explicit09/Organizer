"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  Play,
  Pause,
  Loader2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/Dialog";

type AutomationTrigger =
  | "item_created"
  | "item_updated"
  | "status_changed"
  | "due_date_approaching"
  | "item_overdue";

type AutomationAction =
  | { type: "set_status"; status: string }
  | { type: "set_priority"; priority: string }
  | { type: "add_tag"; tag: string }
  | { type: "notify"; message: string };

type AutomationCondition = {
  field: "type" | "status" | "priority" | "tags";
  operator: "equals" | "not_equals" | "contains";
  value: string;
};

type Automation = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const triggerLabels: Record<AutomationTrigger, string> = {
  item_created: "When item is created",
  item_updated: "When item is updated",
  status_changed: "When status changes",
  due_date_approaching: "When due date is approaching",
  item_overdue: "When item becomes overdue",
};

const actionLabels: Record<string, (action: AutomationAction) => string> = {
  set_status: (action) => `Set status to "${(action as { status: string }).status}"`,
  set_priority: (action) => `Set priority to "${(action as { priority: string }).priority}"`,
  add_tag: (action) => `Add tag "${(action as { tag: string }).tag}"`,
  notify: (action) => `Send notification: "${(action as { message: string }).message}"`,
};

interface AutomationsManagerProps {
  className?: string;
}

export function AutomationsManager({ className }: AutomationsManagerProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("item_created");
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function fetchAutomations() {
    try {
      const res = await fetch("/api/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch (error) {
      console.error("Failed to fetch automations:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingAutomation(null);
    setName("");
    setTrigger("item_created");
    setConditions([]);
    setActions([{ type: "set_status", status: "in_progress" }]);
    setDialogOpen(true);
  }

  function openEditDialog(automation: Automation) {
    setEditingAutomation(automation);
    setName(automation.name);
    setTrigger(automation.trigger);
    setConditions(automation.conditions);
    setActions(automation.actions);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || actions.length === 0) return;

    setSaving(true);
    try {
      const payload = { name, trigger, conditions, actions };

      if (editingAutomation) {
        const res = await fetch(`/api/automations/${editingAutomation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setAutomations((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a))
          );
        }
      } else {
        const res = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setAutomations((prev) => [...prev, created]);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save automation:", error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(automation: Automation) {
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !automation.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAutomations((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
      }
    } catch (error) {
      console.error("Failed to toggle automation:", error);
    }
  }

  async function deleteAutomation(id: string) {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete automation:", error);
    }
  }

  function addCondition() {
    setConditions((prev) => [
      ...prev,
      { field: "status", operator: "equals", value: "" },
    ]);
  }

  function updateCondition(index: number, updates: Partial<AutomationCondition>) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  function addAction() {
    setActions((prev) => [...prev, { type: "set_status", status: "completed" }]);
  }

  function updateAction(index: number, action: AutomationAction) {
    setActions((prev) => prev.map((a, i) => (i === index ? action : a)));
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className={clsx("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Automations</h2>
          <p className="text-sm text-muted-foreground">
            Automate repetitive tasks with custom rules
          </p>
        </div>
        <button
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No automations yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first automation to start saving time
          </p>
          <button
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            Create Automation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className={clsx(
                "rounded-lg border border-border p-4 transition-colors",
                !automation.enabled && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap
                      size={16}
                      className={automation.enabled ? "text-amber-500" : "text-muted-foreground"}
                    />
                    <h3 className="font-medium truncate">{automation.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{triggerLabels[automation.trigger]}</span>
                    <ChevronRight size={14} />
                    <span>
                      {automation.actions.length} action
                      {automation.actions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {automation.conditions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {automation.conditions.length} condition
                      {automation.conditions.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleEnabled(automation)}
                    className={clsx(
                      "rounded-md p-2 transition-colors",
                      automation.enabled
                        ? "text-emerald-500 hover:bg-emerald-500/10"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    title={automation.enabled ? "Disable" : "Enable"}
                  >
                    {automation.enabled ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  <button
                    onClick={() => openEditDialog(automation)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteAutomation(automation.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? "Edit Automation" : "New Automation"}
            </DialogTitle>
            <DialogDescription>
              Create a rule to automatically perform actions when certain events occur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mark overdue items as high priority"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">When...</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(triggerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">And if... (optional)</label>
                <button
                  onClick={addCondition}
                  className="text-xs text-primary hover:underline"
                >
                  + Add condition
                </button>
              </div>
              {conditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conditions - applies to all items</p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={condition.field}
                        onChange={(e) =>
                          updateCondition(index, {
                            field: e.target.value as AutomationCondition["field"],
                          })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="type">Type</option>
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        <option value="tags">Tags</option>
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(index, {
                            operator: e.target.value as AutomationCondition["operator"],
                          })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">does not equal</option>
                        <option value="contains">contains</option>
                      </select>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="value"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => removeCondition(index)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Then...</label>
                <button
                  onClick={addAction}
                  className="text-xs text-primary hover:underline"
                >
                  + Add action
                </button>
              </div>
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={action.type}
                      onChange={(e) => {
                        const type = e.target.value as AutomationAction["type"];
                        if (type === "set_status") {
                          updateAction(index, { type, status: "completed" });
                        } else if (type === "set_priority") {
                          updateAction(index, { type, priority: "high" });
                        } else if (type === "add_tag") {
                          updateAction(index, { type, tag: "" });
                        } else {
                          updateAction(index, { type, message: "" });
                        }
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="set_status">Set status</option>
                      <option value="set_priority">Set priority</option>
                      <option value="add_tag">Add tag</option>
                      <option value="notify">Send notification</option>
                    </select>
                    <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                    {action.type === "set_status" && (
                      <select
                        value={(action as { status: string }).status}
                        onChange={(e) =>
                          updateAction(index, { type: "set_status", status: e.target.value })
                        }
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    )}
                    {action.type === "set_priority" && (
                      <select
                        value={(action as { priority: string }).priority}
                        onChange={(e) =>
                          updateAction(index, { type: "set_priority", priority: e.target.value })
                        }
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    )}
                    {action.type === "add_tag" && (
                      <input
                        type="text"
                        value={(action as { tag: string }).tag}
                        onChange={(e) =>
                          updateAction(index, { type: "add_tag", tag: e.target.value })
                        }
                        placeholder="tag name"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    )}
                    {action.type === "notify" && (
                      <input
                        type="text"
                        value={(action as { message: string }).message}
                        onChange={(e) =>
                          updateAction(index, { type: "notify", message: e.target.value })
                        }
                        placeholder="notification message"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    )}
                    {actions.length > 1 && (
                      <button
                        onClick={() => removeAction(index)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || actions.length === 0 || saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingAutomation ? "Save Changes" : "Create Automation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
