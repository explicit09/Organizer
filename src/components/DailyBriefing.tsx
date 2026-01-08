"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  CloudSun,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Target,
} from "lucide-react";
import { clsx } from "clsx";

type DailyBriefing = {
  greeting: string;
  date: string;
  summary: {
    totalItems: number;
    meetings: number;
    tasks: number;
    school: number;
    overdue: number;
  };
  suggestedPriorities: Array<{
    id: string;
    itemId?: string;
    title: string;
    completed: boolean;
  }>;
  upcomingDeadlines: Array<{ title: string; dueAt: string; daysUntil: number }>;
  conflicts: Array<{ message: string }>;
  motivationalMessage: string;
};

type Props = {
  onSetPriorities?: (priorities: DailyBriefing["suggestedPriorities"]) => void;
  onStartDay?: () => void;
};

export function DailyBriefing({ onSetPriorities, onStartDay }: Props) {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/daily-plan?briefing=true")
      .then((res) => res.json())
      .then((data) => {
        setBriefing(data.briefing);
        // Auto-select suggested priorities
        if (data.briefing?.suggestedPriorities) {
          setSelectedPriorities(new Set(data.briefing.suggestedPriorities.map((p: { id: string }) => p.id)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const togglePriority = (id: string) => {
    const newSet = new Set(selectedPriorities);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < 3) {
      newSet.add(id);
    }
    setSelectedPriorities(newSet);
  };

  const handleStartDay = () => {
    if (briefing && onSetPriorities) {
      const priorities = briefing.suggestedPriorities.filter((p) =>
        selectedPriorities.has(p.id)
      );
      onSetPriorities(priorities);
    }
    onStartDay?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!briefing) {
    return null;
  }

  const hour = new Date().getHours();
  const TimeIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TimeIcon size={16} />
            <span className="text-xs uppercase tracking-wider">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{briefing.greeting}!</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-medium text-primary">AI Briefing</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Today"
          value={briefing.summary.totalItems}
          icon={<Target size={16} />}
          color="purple"
        />
        <SummaryCard
          label="Meetings"
          value={briefing.summary.meetings}
          icon={<Calendar size={16} />}
          color="blue"
        />
        <SummaryCard
          label="Tasks"
          value={briefing.summary.tasks}
          icon={<CheckCircle2 size={16} />}
          color="green"
        />
        {briefing.summary.overdue > 0 && (
          <SummaryCard
            label="Overdue"
            value={briefing.summary.overdue}
            icon={<AlertCircle size={16} />}
            color="red"
          />
        )}
      </div>

      {/* Conflicts Warning */}
      {briefing.conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Schedule Conflicts</span>
          </div>
          <ul className="space-y-1">
            {briefing.conflicts.map((conflict, i) => (
              <li key={i} className="text-sm text-amber-200/80">
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Priorities */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Pick Your Top 3 Priorities
          </h3>
          <span className="text-xs text-muted-foreground">
            {selectedPriorities.size}/3 selected
          </span>
        </div>
        <div className="space-y-2">
          {briefing.suggestedPriorities.map((priority) => (
            <button
              key={priority.id}
              onClick={() => togglePriority(priority.id)}
              className={clsx(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                selectedPriorities.has(priority.id)
                  ? "border-primary/50 bg-primary/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              )}
            >
              <div
                className={clsx(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPriorities.has(priority.id)
                    ? "border-primary bg-primary"
                    : "border-white/20"
                )}
              >
                {selectedPriorities.has(priority.id) && (
                  <CheckCircle2 size={12} className="text-white" />
                )}
              </div>
              <span
                className={clsx(
                  "text-sm flex-1",
                  selectedPriorities.has(priority.id)
                    ? "text-white"
                    : "text-muted-foreground"
                )}
              >
                {priority.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      {briefing.upcomingDeadlines.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Upcoming This Week
          </h3>
          <div className="space-y-2">
            {briefing.upcomingDeadlines.map((deadline, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-sm text-muted-foreground">
                  {deadline.title}
                </span>
                <span
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full",
                    deadline.daysUntil <= 1
                      ? "bg-red-500/20 text-red-400"
                      : deadline.daysUntil <= 3
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-white/[0.06] text-muted-foreground"
                  )}
                >
                  {deadline.daysUntil === 1
                    ? "Tomorrow"
                    : `${deadline.daysUntil} days`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground italic">
          "{briefing.motivationalMessage}"
        </p>
      </div>

      {/* Start Day Button */}
      <button
        onClick={handleStartDay}
        disabled={selectedPriorities.size === 0}
        className={clsx(
          "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all",
          selectedPriorities.size > 0
            ? "bg-primary text-white hover:bg-primary/90"
            : "bg-white/[0.06] text-muted-foreground cursor-not-allowed"
        )}
      >
        <Clock size={18} />
        Start My Day
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "purple" | "blue" | "green" | "red";
}) {
  const colorClasses = {
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div
      className={clsx(
        "rounded-xl border p-3 flex flex-col gap-1",
        colorClasses[color]
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  );
}
