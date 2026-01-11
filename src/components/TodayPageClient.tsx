"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Check,
  Sun,
  Moon,
  CloudSun,
  Target,
  ChevronRight,
  Flame,
  Sparkles,
  Plus,
  GripVertical,
} from "lucide-react";
import { clsx } from "clsx";
import { DailyBriefing } from "./DailyBriefing";
import { Button } from "./ui/Button";

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
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isEvening = hour >= 17;

  const completedPriorities = plan?.topPriorities.filter((p) => p.completed).length ?? 0;
  const totalPriorities = plan?.topPriorities.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary-subtle glow-on-hover">
            <TimeIcon size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{greeting}</p>
            <h1 className="text-xl font-semibold text-foreground">Today</h1>
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-warning-subtle border border-[hsl(25_95%_55%/0.2)] glow-on-hover">
            <Flame size={14} className="text-[hsl(25_95%_55%)]" />
            <span className="text-sm font-medium text-[hsl(25_95%_55%)]">
              {streak} day{streak !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Date */}
      <p className="text-sm text-muted-foreground">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 rounded-lg glass-subtle">
        {[
          { id: "briefing", label: "Briefing", icon: Sparkles },
          { id: "plan", label: "My Plan", icon: Target },
          { id: "reflection", label: "Reflect", icon: Moon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-200",
              viewMode === tab.id
                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
          {/* Progress */}
          {totalPriorities > 0 && (
            <div className="flex items-center gap-4 px-4 py-4 rounded-lg glass-card">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Today's progress</span>
                  <span className="font-bold text-foreground tabular-nums">{completedPriorities}/{totalPriorities}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${(completedPriorities / totalPriorities) * 100}%`,
                      background: 'linear-gradient(90deg, hsl(142 65% 48%) 0%, hsl(170 70% 45%) 100%)'
                    }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold gradient-text tabular-nums">
                {Math.round((completedPriorities / totalPriorities) * 100)}%
              </div>
            </div>
          )}

          {/* Top Priorities */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target size={14} className="text-primary" />
                Today's Priorities
              </h3>
              {totalPriorities > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedPriorities} done
                </span>
              )}
            </div>

            {plan?.topPriorities && plan.topPriorities.length > 0 ? (
              <div className="divide-y divide-border">
                {plan.topPriorities.map((priority, index) => (
                  <button
                    key={priority.id}
                    onClick={() => togglePriorityComplete(priority.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-all group",
                      priority.completed
                        ? "bg-[hsl(142_65%_48%/0.05)]"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                      {index + 1}
                    </span>
                    <div
                      className={clsx(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        priority.completed
                          ? "border-[hsl(142_65%_48%)] bg-[hsl(142_65%_48%)]"
                          : "border-border group-hover:border-muted-foreground"
                      )}
                    >
                      {priority.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span
                      className={clsx(
                        "flex-1 text-sm",
                        priority.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
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
                        className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-opacity"
                      >
                        View
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <Target size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  No priorities set for today
                </p>
                <Button size="sm" variant="outline" onClick={() => setViewMode("briefing")}>
                  Get AI recommendations
                </Button>
              </div>
            )}
          </div>

          {/* Time Blocks */}
          {plan?.timeBlocks && plan.timeBlocks.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Clock size={14} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
              </div>
              <div className="divide-y divide-border">
                {plan.timeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2.5",
                      block.type === "meeting" && "bg-[hsl(200_80%_55%/0.05)]",
                      block.type === "focus" && "bg-primary/5",
                      block.type === "break" && "bg-[hsl(142_65%_48%/0.05)]"
                    )}
                  >
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {block.startTime} - {block.endTime}
                    </span>
                    <span
                      className={clsx(
                        "text-sm",
                        block.type === "break" ? "text-muted-foreground" : "text-foreground"
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
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <Moon size={16} />
              <span className="text-sm font-medium">End your day with a reflection</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {viewMode === "reflection" && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <Moon size={28} className="text-primary mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-foreground">Evening Reflection</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Take a moment to reflect on your day
            </p>
          </div>

          {/* What went well */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              What went well today?
            </h3>
            <div className="space-y-2">
              {wentWell.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-[hsl(142_65%_48%)] mt-2">+</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...wentWell];
                      updated[index] = e.target.value;
                      setWentWell(updated);
                    }}
                    placeholder="Something positive..."
                    className="flex-1 bg-transparent border-b border-border py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
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
          </div>

          {/* What could improve */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              What could be better?
            </h3>
            <div className="space-y-2">
              {couldImprove.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-[hsl(45_95%_55%)] mt-2">→</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...couldImprove];
                      updated[index] = e.target.value;
                      setCouldImprove(updated);
                    }}
                    placeholder="Room for improvement..."
                    className="flex-1 bg-transparent border-b border-border py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
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
          </div>

          {/* Gratitude */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              One thing I'm grateful for
            </h3>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="What made today special?"
              rows={2}
              className="w-full bg-transparent border border-border rounded-md p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Energy Level */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Energy level today
            </h3>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergyLevel(level)}
                  className={clsx(
                    "flex-1 h-10 rounded-md border-2 flex items-center justify-center text-sm font-semibold transition-all",
                    energyLevel === level
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={saveReflection} className="w-full">
            Save Reflection
          </Button>
        </div>
      )}
    </div>
  );
}
