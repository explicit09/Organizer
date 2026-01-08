"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Play,
  CheckCircle2,
  Loader2,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/Dialog";

type CycleStatus = "planned" | "active" | "completed";

type Cycle = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  totalItems?: number;
  completedItems?: number;
  progress?: number;
};

const statusConfig: Record<CycleStatus, { label: string; color: string; icon: typeof Play }> = {
  planned: { label: "Planned", color: "text-slate-500", icon: Calendar },
  active: { label: "Active", color: "text-emerald-500", icon: Play },
  completed: { label: "Completed", color: "text-blue-500", icon: CheckCircle2 },
};

interface CyclesManagerProps {
  className?: string;
}

export function CyclesManager({ className }: CyclesManagerProps) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  async function fetchCycles() {
    try {
      const res = await fetch("/api/cycles");
      if (res.ok) {
        const data = await res.json();
        setCycles(data.cycles || []);
      }
    } catch (error) {
      console.error("Failed to fetch cycles:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingCycle(null);
    setName("");
    setDescription("");
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(nextWeek.toISOString().split("T")[0]);
    setDialogOpen(true);
  }

  function openEditDialog(cycle: Cycle) {
    setEditingCycle(cycle);
    setName(cycle.name);
    setDescription(cycle.description || "");
    setStartDate(cycle.startDate.split("T")[0]);
    setEndDate(cycle.endDate.split("T")[0]);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return;

    setSaving(true);
    try {
      const payload = { name, description, startDate, endDate };

      if (editingCycle) {
        const res = await fetch(`/api/cycles/${editingCycle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setCycles((prev) =>
            prev.map((c) => (c.id === data.cycle.id ? data.cycle : c))
          );
        }
      } else {
        const res = await fetch("/api/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setCycles((prev) => [data.cycle, ...prev]);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save cycle:", error);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(cycle: Cycle, status: CycleStatus) {
    try {
      const res = await fetch(`/api/cycles/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setCycles((prev) =>
          prev.map((c) => (c.id === data.cycle.id ? data.cycle : c))
        );
      }
    } catch (error) {
      console.error("Failed to update cycle status:", error);
    }
  }

  async function deleteCycle(id: string) {
    try {
      const res = await fetch(`/api/cycles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCycles((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete cycle:", error);
    }
  }

  function formatDateRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
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
          <h2 className="text-lg font-semibold">Cycles</h2>
          <p className="text-sm text-muted-foreground">
            Organize work into time-boxed sprints
          </p>
        </div>
        <button
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          New Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No cycles yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create cycles to organize your work into sprints
          </p>
          <button
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            Create Cycle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const config = statusConfig[cycle.status];
            const Icon = config.icon;
            return (
              <div
                key={cycle.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className={config.color} />
                      <h3 className="font-medium truncate">{cycle.name}</h3>
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full bg-muted", config.color)}>
                        {config.label}
                      </span>
                    </div>
                    {cycle.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {cycle.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDateRange(cycle.startDate, cycle.endDate)}
                      </span>
                      {typeof cycle.progress === "number" && (
                        <span className="flex items-center gap-1">
                          <BarChart3 size={14} />
                          {cycle.progress}% complete
                        </span>
                      )}
                    </div>
                    {typeof cycle.progress === "number" && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${cycle.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {cycle.status === "planned" && (
                      <button
                        onClick={() => updateStatus(cycle, "active")}
                        className="rounded-md p-2 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                        title="Start cycle"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {cycle.status === "active" && (
                      <button
                        onClick={() => updateStatus(cycle, "completed")}
                        className="rounded-md p-2 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                        title="Complete cycle"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditDialog(cycle)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteCycle(cycle.id)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
              {editingCycle ? "Edit Cycle" : "New Cycle"}
            </DialogTitle>
            <DialogDescription>
              Create a time-boxed sprint to organize your work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sprint 1"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the focus of this cycle?"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
              disabled={!name.trim() || !startDate || !endDate || saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingCycle ? "Save Changes" : "Create Cycle"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
