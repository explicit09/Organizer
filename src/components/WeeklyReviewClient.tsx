"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Flame,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";

type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  summary: {
    itemsCreated: number;
    itemsCompleted: number;
    completionRate: number;
    focusMinutes: number;
    habitsCompletionRate: number;
    meetingsAttended: number;
  };
  wins: string[];
  incompleteItems: Array<{ id: string; title: string; priority: string }>;
  overdueItems: Array<{ id: string; title: string; dueAt: string }>;
  insights: string[];
  suggestions: string[];
  habitPerformance: Array<{
    title: string;
    completionRate: number;
    streak: number;
  }>;
  focusPatterns: {
    totalMinutes: number;
    sessionsCompleted: number;
    bestDay: string;
    averagePerDay: number;
  };
};

type SavedNotes = {
  notes: string;
  wins: string[];
  goalsNextWeek: string[];
};

export function WeeklyReviewClient() {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [savedNotes, setSavedNotes] = useState<SavedNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Form state
  const [notes, setNotes] = useState("");
  const [customWins, setCustomWins] = useState<string[]>([""]);
  const [goalsNextWeek, setGoalsNextWeek] = useState<string[]>([""]);

  const fetchReview = async (weekDate: Date) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/weekly-review?weekOf=${weekDate.toISOString()}`
      );
      const data = await res.json();
      setReview(data.review);
      setSavedNotes(data.savedNotes);

      // Populate form from saved notes
      if (data.savedNotes) {
        setNotes(data.savedNotes.notes ?? "");
        setCustomWins(
          data.savedNotes.wins?.length > 0 ? data.savedNotes.wins : [""]
        );
        setGoalsNextWeek(
          data.savedNotes.goalsNextWeek?.length > 0
            ? data.savedNotes.goalsNextWeek
            : [""]
        );
      } else {
        setNotes("");
        setCustomWins([""]);
        setGoalsNextWeek([""]);
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview(currentWeek);
  }, [currentWeek]);

  const saveReview = async () => {
    if (!review) return;

    setSaving(true);
    try {
      await fetch("/api/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: review.weekStart,
          notes,
          wins: customWins.filter((w) => w.trim()),
          goalsNextWeek: goalsNextWeek.filter((g) => g.trim()),
        }),
      });
      setSaving(false);
    } catch {
      setSaving(false);
    }
  };

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(next);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load review</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar size={14} />
            <span className="text-xs uppercase tracking-widest">
              Weekly Review
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Reflect & Plan
          </h1>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-sm text-white hover:bg-white/[0.08] transition-all"
          >
            {formatWeekRange(review.weekStart, review.weekEnd)}
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 size={18} className="text-emerald-400" />}
          label="Completed"
          value={review.summary.itemsCompleted}
          subtext={`${review.summary.completionRate}% rate`}
        />
        <StatCard
          icon={<Clock size={18} className="text-purple-400" />}
          label="Focus Time"
          value={`${Math.round(review.summary.focusMinutes / 60)}h`}
          subtext={`${review.focusPatterns.sessionsCompleted} sessions`}
        />
        <StatCard
          icon={<Flame size={18} className="text-amber-400" />}
          label="Habits"
          value={`${review.summary.habitsCompletionRate}%`}
          subtext="completion"
        />
        <StatCard
          icon={<Calendar size={18} className="text-blue-400" />}
          label="Meetings"
          value={review.summary.meetingsAttended}
          subtext="attended"
        />
      </div>

      {/* Auto-generated Wins */}
      {review.wins.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <Trophy size={18} />
            <h3 className="font-medium">Wins This Week</h3>
          </div>
          <ul className="space-y-2">
            {review.wins.map((win, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-emerald-200">
                <CheckCircle2 size={14} />
                {win}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {review.insights.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-3">
            <Sparkles size={18} />
            <h3 className="font-medium text-white">Insights</h3>
          </div>
          <ul className="space-y-2">
            {review.insights.map((insight, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp size={14} className="text-purple-400" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overdue Items */}
      {review.overdueItems.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 text-rose-400 mb-3">
            <AlertCircle size={18} />
            <h3 className="font-medium">Overdue Items</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-500/20">
              {review.overdueItems.length}
            </span>
          </div>
          <ul className="space-y-2">
            {review.overdueItems.slice(0, 5).map((item) => (
              <li key={item.id} className="text-sm text-rose-200/80">
                {item.title}
              </li>
            ))}
            {review.overdueItems.length > 5 && (
              <li className="text-xs text-rose-400">
                + {review.overdueItems.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
        <div className="flex items-center gap-2 text-blue-400 mb-3">
          <Target size={18} />
          <h3 className="font-medium text-white">Suggestions for Next Week</h3>
        </div>
        <ul className="space-y-2">
          {review.suggestions.map((suggestion, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-blue-400 mt-0.5">→</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      {/* Personal Notes Section */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4 space-y-4">
        <h3 className="font-medium text-white">Your Reflection</h3>

        {/* Custom wins */}
        <div>
          <label className="text-sm text-muted-foreground">
            What else went well?
          </label>
          {customWins.map((win, i) => (
            <input
              key={i}
              type="text"
              value={win}
              onChange={(e) => {
                const updated = [...customWins];
                updated[i] = e.target.value;
                setCustomWins(updated);
              }}
              placeholder="Add a personal win..."
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          ))}
          <button
            onClick={() => setCustomWins([...customWins, ""])}
            className="mt-2 text-xs text-primary hover:underline"
          >
            + Add another
          </button>
        </div>

        {/* Goals for next week */}
        <div>
          <label className="text-sm text-muted-foreground">
            Goals for next week
          </label>
          {goalsNextWeek.map((goal, i) => (
            <input
              key={i}
              type="text"
              value={goal}
              onChange={(e) => {
                const updated = [...goalsNextWeek];
                updated[i] = e.target.value;
                setGoalsNextWeek(updated);
              }}
              placeholder="What do you want to achieve?"
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          ))}
          <button
            onClick={() => setGoalsNextWeek([...goalsNextWeek, ""])}
            className="mt-2 text-xs text-primary hover:underline"
          >
            + Add another
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-muted-foreground">
            Additional notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other thoughts about this week..."
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={saveReview}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Review"}
        </button>
      </div>

      {/* Habit Performance */}
      {review.habitPerformance.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
          <h3 className="font-medium text-white mb-3">Habit Performance</h3>
          <div className="space-y-3">
            {review.habitPerformance.map((habit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate">
                      {habit.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {habit.completionRate}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        habit.completionRate >= 80
                          ? "bg-emerald-500"
                          : habit.completionRate >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      )}
                      style={{ width: `${habit.completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame size={12} className="text-amber-400" />
                  {habit.streak}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  );
}
