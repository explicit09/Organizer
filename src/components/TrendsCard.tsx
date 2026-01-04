"use client";

import { useEffect, useState } from "react";

type TrendData = {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
};

type TrendSummary = {
  completionRate: TrendData;
  productivity: TrendData;
  taskVolume: TrendData;
  streakDays: number;
  bestDay: string;
};

export function TrendsCard() {
  const [trends, setTrends] = useState<TrendSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics?days=7")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data.trends);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl bg-stone-100 h-32" />
    );
  }

  if (!trends) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
        No trends available yet.
      </div>
    );
  }

  const trendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };

  const trendColor = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return "text-emerald-600";
    if (trend === "down") return "text-rose-600";
    return "text-stone-500";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone-50 p-3">
          <div className="text-xs uppercase tracking-wider text-stone-400">
            Completion Rate
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">
              {Math.round(trends.completionRate.current)}%
            </span>
            <span className={`text-sm ${trendColor(trends.completionRate.trend)}`}>
              {trendIcon(trends.completionRate.trend)} {trends.completionRate.changePercent}%
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 p-3">
          <div className="text-xs uppercase tracking-wider text-stone-400">
            Streak
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">
              {trends.streakDays}
            </span>
            <span className="text-sm text-stone-500">days</span>
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 p-3">
          <div className="text-xs uppercase tracking-wider text-stone-400">
            Completed
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">
              {trends.productivity.current}
            </span>
            <span className={`text-sm ${trendColor(trends.productivity.trend)}`}>
              {trendIcon(trends.productivity.trend)} {Math.abs(trends.productivity.change)}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 p-3">
          <div className="text-xs uppercase tracking-wider text-stone-400">
            Volume
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">
              {trends.taskVolume.current}
            </span>
            <span className={`text-sm ${trendColor(trends.taskVolume.trend)}`}>
              {trendIcon(trends.taskVolume.trend)} {Math.abs(trends.taskVolume.change)}
            </span>
          </div>
        </div>
      </div>

      {trends.bestDay && (
        <div className="text-xs text-stone-500">
          Best day: <span className="font-medium text-stone-700">{trends.bestDay}</span>
        </div>
      )}
    </div>
  );
}
