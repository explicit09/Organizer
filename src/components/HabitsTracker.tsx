"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Check,
  Flame,
  Trophy,
  Target,
  MoreHorizontal,
  Trash2,
  Archive,
  Edit2,
} from "lucide-react";
import { clsx } from "clsx";
import { Dialog, DialogContent, DialogTitle } from "./ui/Dialog";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "./ui/ContextMenu";

type HabitWithStats = {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  targetCount: number;
  color: string;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  completedToday: boolean;
  todayCount: number;
};

const COLORS = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function HabitsTracker() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newFrequency, setNewFrequency] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [newTarget, setNewTarget] = useState(1);

  const fetchHabits = async () => {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      setHabits(data.habits ?? []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const toggleHabit = async (habitId: string, completed: boolean) => {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completedToday: !completed,
              todayCount: completed ? 0 : h.targetCount,
              currentStreak: completed ? h.currentStreak - 1 : h.currentStreak + 1,
            }
          : h
      )
    );

    try {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: completed ? "unlog" : "log",
          habitId,
        }),
      });
      fetchHabits();
    } catch {
      fetchHabits();
    }
  };

  const createHabit = async () => {
    if (!newTitle.trim()) return;

    try {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          color: newColor,
          frequency: newFrequency,
          targetCount: newTarget,
        }),
      });

      setNewTitle("");
      setNewDescription("");
      setNewColor(COLORS[0]);
      setNewFrequency("daily");
      setNewTarget(1);
      setShowNewHabit(false);
      fetchHabits();
    } catch (error) {
      console.error("Failed to create habit:", error);
    }
  };

  const updateHabit = async () => {
    if (!editingHabit || !newTitle.trim()) return;

    try {
      await fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingHabit.id,
          title: newTitle,
          description: newDescription,
          color: newColor,
          frequency: newFrequency,
          targetCount: newTarget,
        }),
      });

      setEditingHabit(null);
      setNewTitle("");
      setNewDescription("");
      fetchHabits();
    } catch (error) {
      console.error("Failed to update habit:", error);
    }
  };

  const archiveHabit = async (habitId: string) => {
    try {
      await fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: habitId, archived: true }),
      });
      fetchHabits();
    } catch (error) {
      console.error("Failed to archive habit:", error);
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      await fetch(`/api/habits?id=${habitId}`, { method: "DELETE" });
      fetchHabits();
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  };

  const openEditDialog = (habit: HabitWithStats) => {
    setEditingHabit(habit);
    setNewTitle(habit.title);
    setNewDescription(habit.description ?? "");
    setNewColor(habit.color);
    setNewFrequency(habit.frequency as "daily" | "weekdays" | "weekly");
    setNewTarget(habit.targetCount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Daily Habits</h2>
          <p className="text-sm text-muted-foreground">
            {habits.filter((h) => h.completedToday).length}/{habits.length} completed today
          </p>
        </div>
        <button
          onClick={() => setShowNewHabit(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus size={16} />
          New Habit
        </button>
      </div>

      {/* Habits Grid */}
      {habits.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-white/[0.06] bg-[#0a0a0b]">
          <Target size={32} className="text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">No habits yet</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Start building positive habits today
          </p>
          <button
            onClick={() => setShowNewHabit(true)}
            className="text-sm text-primary hover:underline"
          >
            Create your first habit →
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <ContextMenu key={habit.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={clsx(
                    "relative rounded-xl border p-4 transition-all cursor-pointer group",
                    habit.completedToday
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/[0.06] bg-[#0a0a0b] hover:border-white/[0.12]"
                  )}
                  onClick={() => toggleHabit(habit.id, habit.completedToday)}
                >
                  {/* Color indicator */}
                  <div
                    className="absolute top-0 left-4 w-8 h-1 rounded-b-full"
                    style={{ backgroundColor: habit.color }}
                  />

                  {/* Content */}
                  <div className="flex items-start justify-between pt-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={clsx(
                          "font-medium truncate",
                          habit.completedToday
                            ? "text-emerald-400"
                            : "text-white"
                        )}
                      >
                        {habit.title}
                      </h3>
                      {habit.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {habit.description}
                        </p>
                      )}
                    </div>

                    {/* Check */}
                    <div
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        habit.completedToday
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-white/20 group-hover:border-white/40"
                      )}
                    >
                      {habit.completedToday && (
                        <Check size={14} className="text-white" />
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame size={12} className="text-amber-400" />
                      <span>{habit.currentStreak}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Trophy size={12} className="text-purple-400" />
                      <span>{habit.longestStreak}</span>
                    </div>
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {habit.completionRate}%
                    </span>
                  </div>
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent>
                <ContextMenuItem onClick={() => openEditDialog(habit)}>
                  <Edit2 size={14} className="mr-2" />
                  Edit
                </ContextMenuItem>
                <ContextMenuItem onClick={() => archiveHabit(habit.id)}>
                  <Archive size={14} className="mr-2" />
                  Archive
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => deleteHabit(habit.id)}
                  destructive
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      {/* New/Edit Habit Dialog */}
      <Dialog
        open={showNewHabit || !!editingHabit}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewHabit(false);
            setEditingHabit(null);
            setNewTitle("");
            setNewDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingHabit ? "Edit Habit" : "New Habit"}
          </DialogTitle>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-white">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Exercise, Read, Meditate"
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white">Frequency</label>
              <div className="flex gap-2 mt-1">
                {["daily", "weekdays", "weekly"].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setNewFrequency(freq as typeof newFrequency)}
                    className={clsx(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      newFrequency === freq
                        ? "bg-primary text-white"
                        : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
                    )}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Color</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={clsx(
                      "w-8 h-8 rounded-full transition-all",
                      newColor === color && "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0b]"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowNewHabit(false);
                  setEditingHabit(null);
                }}
                className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={editingHabit ? updateHabit : createHabit}
                disabled={!newTitle.trim()}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {editingHabit ? "Save Changes" : "Create Habit"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
