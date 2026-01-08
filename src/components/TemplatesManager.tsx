"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  FileStack,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Loader2,
  CheckSquare,
  Calendar,
  GraduationCap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/Dialog";

type ItemType = "task" | "meeting" | "school";

type Template = {
  id: string;
  name: string;
  type: ItemType;
  data: {
    title?: string;
    details?: string;
    priority?: string;
    tags?: string[];
    estimatedMinutes?: number;
  };
  createdAt: string;
};

const typeConfig: Record<ItemType, { label: string; color: string; icon: typeof CheckSquare }> = {
  task: { label: "Task", color: "text-blue-500", icon: CheckSquare },
  meeting: { label: "Meeting", color: "text-purple-500", icon: Calendar },
  school: { label: "School", color: "text-amber-500", icon: GraduationCap },
};

interface TemplatesManagerProps {
  className?: string;
  onUseTemplate?: (templateId: string) => void;
}

export function TemplatesManager({ className, onUseTemplate }: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("task");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingTemplate(null);
    setName("");
    setType("task");
    setTitle("");
    setDetails("");
    setPriority("medium");
    setEstimatedMinutes("");
    setDialogOpen(true);
  }

  function openEditDialog(template: Template) {
    setEditingTemplate(template);
    setName(template.name);
    setType(template.type);
    setTitle(template.data.title || "");
    setDetails(template.data.details || "");
    setPriority(template.data.priority || "medium");
    setEstimatedMinutes(template.data.estimatedMinutes || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name,
        type,
        data: {
          title: title || undefined,
          details: details || undefined,
          priority,
          estimatedMinutes: estimatedMinutes || undefined,
        },
      };

      if (editingTemplate) {
        const res = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates((prev) =>
            prev.map((t) => (t.id === data.template.id ? data.template : t))
          );
        }
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates((prev) => [data.template, ...prev]);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setSaving(false);
    }
  }

  async function useTemplate(templateId: string) {
    setCreating(templateId);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        onUseTemplate?.(templateId);
      }
    } catch (error) {
      console.error("Failed to use template:", error);
    } finally {
      setCreating(null);
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
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
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create reusable templates for common tasks
          </p>
        </div>
        <button
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <FileStack className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create templates to quickly add common items
          </p>
          <button
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => {
            const config = typeConfig[template.type];
            const Icon = config.icon;
            return (
              <div
                key={template.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={config.color} />
                    <h3 className="font-medium">{template.name}</h3>
                  </div>
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full bg-muted", config.color)}>
                    {config.label}
                  </span>
                </div>
                {template.data.title && (
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    Title: {template.data.title}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => useTemplate(template.id)}
                    disabled={creating === template.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                  >
                    {creating === template.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Copy size={14} />
                    )}
                    Use
                  </button>
                  <button
                    onClick={() => openEditDialog(template)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable template for quickly adding items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Report"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="task">Task</option>
                <option value="meeting">Meeting</option>
                <option value="school">School</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Default Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty to prompt each time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Default Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Optional default description"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Est. Minutes</label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="30"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
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
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
