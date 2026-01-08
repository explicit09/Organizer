"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
  Target,
  ChevronRight,
  Plus,
  Flame,
} from "lucide-react";
import { clsx } from "clsx";
import { DailyBriefing } from "./DailyBriefing";

type TopPriority = {
  id: string;
  itemId?: string;
  title: string;
  completed: boolean;
};

type TimeBlock = {
  id: string;
  itemId?: string;
  title: string;
  startTime: string;
  endTime: string;
  type: "task" | "meeting" | "focus" | "break" | "buffer";
};

type DailyPlan = {
  id: string;
  date: string;
  topPriorities: TopPriority[];
  timeBlocks: TimeBlock[];
  reflection?: {
    wentWell: string[];
    couldImprove: string[];
    gratitude: string;
    energyLevel: number;
    notes: string;
  };
};

type ViewMode = "briefing" | "plan" | "reflection";

export function TodayPageClient() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("briefing");
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reflection form state
  const [wentWell, setWentWell] = useState<string[]>([""]);
  const [couldImprove, setCouldImprove] = useState<string[]>([""]);
  const [gratitude, setGratitude] = useState("");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [reflectionNotes, setReflectionNotes] = useState("");

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-plan?briefing=true");
      const data = await res.json();
      setPlan(data.plan);
      setStreak(data.streak ?? 0);

      // If plan exists with priorities, go to plan view
      if (data.plan?.topPriorities?.length > 0) {
        setViewMode("plan");
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleSetPriorities = async (priorities: TopPriority[]) => {
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topPriorities: priorities }),
      });
      const data = await res.json();
      setPlan(data.plan);
      setViewMode("plan");
    } catch (error) {
      console.error("Failed to save priorities:", error);
    }
  };

  const togglePriorityComplete = async (priorityId: string) => {
    if (!plan) return;

    const updated = plan.topPriorities.map((p) =>
      p.id === priorityId ? { ...p, completed: !p.completed } : p
    );

    setPlan({ ...plan, topPriorities: updated });

    try {
      await fetch("/api/daily-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topPriorities: updated }),
      });
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const saveReflection = async () => {
    try {
      await fetch("/api/daily-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflection: {
            wentWell: wentWell.filter((w) => w.trim()),
            couldImprove: couldImprove.filter((c) => c.trim()),
            gratitude,
            energyLevel,
            notes: reflectionNotes,
          },
        }),
      });
      fetchPlan();
      setViewMode("plan");
    } catch (error) {
      console.error("Failed to save reflection:", error);
    }
  };

  const hour = new Date().getHours();
  const TimeIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;
  const isEvening = hour >= 17;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <TimeIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Today</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Flame size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {streak} day streak
            </span>
          </div>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        {[
          { id: "briefing", label: "Briefing", icon: Sparkles },
          { id: "plan", label: "My Plan", icon: Target },
          { id: "reflection", label: "Reflect", icon: Moon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
              viewMode === tab.id
                ? "bg-white/[0.08] text-white"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === "briefing" && (
        <DailyBriefing
          onSetPriorities={handleSetPriorities}
          onStartDay={() => setViewMode("plan")}
        />
      )}

      {viewMode === "plan" && (
        <div className="space-y-6">
          {/* Top Priorities */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target size={16} className="text-primary" />
                Today's Priorities
              </h3>
              <span className="text-xs text-muted-foreground">
                {plan?.topPriorities.filter((p) => p.completed).length ?? 0}/
                {plan?.topPriorities.length ?? 0} done
              </span>
            </div>

            {plan?.topPriorities && plan.topPriorities.length > 0 ? (
              <div className="space-y-2">
                {plan.topPriorities.map((priority, index) => (
                  <button
                    key={priority.id}
                    onClick={() => togglePriorityComplete(priority.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group",
                      priority.completed
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    )}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <div
                      className={clsx(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        priority.completed
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-white/20 group-hover:border-white/40"
                      )}
                    >
                      {priority.completed && (
                        <CheckCircle2 size={12} className="text-white" />
                      )}
                    </div>
                    <span
                      className={clsx(
                        "flex-1 text-sm",
                        priority.completed
                          ? "text-muted-foreground line-through"
                          : "text-white"
                      )}
                    >
                      {priority.title}
                    </span>
                    {priority.itemId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inbox?highlight=${priority.itemId}`);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline"
                      >
                        View
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  No priorities set for today
                </p>
                <button
                  onClick={() => setViewMode("briefing")}
                  className="text-sm text-primary hover:underline"
                >
                  Get AI recommendations →
                </button>
              </div>
            )}
          </div>

          {/* Time Blocks */}
          {plan?.timeBlocks && plan.timeBlocks.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Clock size={16} className="text-blue-400" />
                Schedule
              </h3>
              <div className="space-y-1">
                {plan.timeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={clsx(
                      "flex items-center gap-3 p-2 rounded-lg",
                      block.type === "meeting" && "bg-blue-500/10",
                      block.type === "focus" && "bg-purple-500/10",
                      block.type === "break" && "bg-emerald-500/10"
                    )}
                  >
                    <span className="text-xs text-muted-foreground w-20">
                      {block.startTime} - {block.endTime}
                    </span>
                    <span
                      className={clsx(
                        "text-sm",
                        block.type === "break"
                          ? "text-muted-foreground"
                          : "text-white"
                      )}
                    >
                      {block.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evening Prompt */}
          {isEvening && !plan?.reflection && (
            <button
              onClick={() => setViewMode("reflection")}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
            >
              <Moon size={18} />
              End your day with a reflection
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {viewMode === "reflection" && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <Moon size={32} className="text-purple-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-white">
              Evening Reflection
            </h2>
            <p className="text-sm text-muted-foreground">
              Take a moment to reflect on your day
            </p>
          </div>

          {/* What went well */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              What went well today?
            </h3>
            {wentWell.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <span className="text-emerald-400 mt-2">+</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...wentWell];
                    updated[index] = e.target.value;
                    setWentWell(updated);
                  }}
                  placeholder="Something positive..."
                  className="flex-1 bg-transparent border-b border-white/[0.08] py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
            ))}
            <button
              onClick={() => setWentWell([...wentWell, ""])}
              className="text-xs text-primary hover:underline mt-2"
            >
              + Add another
            </button>
          </div>

          {/* What could improve */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              What could be better?
            </h3>
            {couldImprove.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <span className="text-amber-400 mt-2">→</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...couldImprove];
                    updated[index] = e.target.value;
                    setCouldImprove(updated);
                  }}
                  placeholder="Room for improvement..."
                  className="flex-1 bg-transparent border-b border-white/[0.08] py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
            ))}
            <button
              onClick={() => setCouldImprove([...couldImprove, ""])}
              className="text-xs text-primary hover:underline mt-2"
            >
              + Add another
            </button>
          </div>

          {/* Gratitude */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              One thing I'm grateful for
            </h3>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="What made today special?"
              rows={2}
              className="w-full bg-transparent border border-white/[0.08] rounded-lg p-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Energy Level */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Energy level today
            </h3>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergyLevel(level)}
                  className={clsx(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all",
                    energyLevel === level
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveReflection}
            className="w-full py-3 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all"
          >
            Save Reflection
          </button>
        </div>
      )}
    </div>
  );
}
