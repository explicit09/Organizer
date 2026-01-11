"use client";

import { clsx } from "clsx";
import { Clock, Target, Flame, TrendingUp } from "lucide-react";

type FocusStatsData = {
  todayMinutes: number;
  weekMinutes: number;
  avgSessionLength: number;
  longestStreak: number;
  sessionsThisWeek: number;
  completionRate: number;
};

interface FocusStatsProps {
  data: FocusStatsData | null;
  loading?: boolean;
}

export function FocusStats({ data, loading }: FocusStatsProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-32 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-accent/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const defaultData: FocusStatsData = data || {
    todayMinutes: 0,
    weekMinutes: 0,
    avgSessionLength: 0,
    longestStreak: 0,
    sessionsThisWeek: 0,
    completionRate: 0,
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
        <Target size={16} className="text-primary" />
        Focus Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Today */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Today
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatDuration(defaultData.todayMinutes)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            focused time
          </p>
        </div>

        {/* This Week */}
        <div className="p-4 rounded-lg bg-accent/10 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              This Week
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatDuration(defaultData.weekMinutes)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {defaultData.sessionsThisWeek} sessions
          </p>
        </div>

        {/* Avg Session */}
        <div className="p-4 rounded-lg bg-accent/10 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Avg Session
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {defaultData.avgSessionLength}m
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            per session
          </p>
        </div>

        {/* Streak */}
        <div className="p-4 rounded-lg bg-accent/10 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} className="text-orange-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Best Streak
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {defaultData.longestStreak}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            consecutive days
          </p>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Session Completion Rate</span>
          <span className="text-sm font-medium text-foreground">
            {defaultData.completionRate}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              defaultData.completionRate >= 80
                ? "bg-emerald-500"
                : defaultData.completionRate >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
            )}
            style={{ width: `${defaultData.completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
