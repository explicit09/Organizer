"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Trophy, Calendar, Zap, Target } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";

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
      <div className="grid grid-cols-2 gap-4 h-[240px] animate-pulse">
        <div className="col-span-1 bg-white/5 rounded-3xl" />
        <div className="col-span-1 grid grid-rows-2 gap-4">
          <div className="bg-white/5 rounded-3xl" />
          <div className="bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!trends) return null;

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Primary Metric - Completion Rate */}
      <Card className="col-span-1 p-6 relative flex flex-col justify-between bg-gradient-to-br from-[#0a0a0c] to-[#121217]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-primary" size={16} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Success</span>
          </div>
          <div className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter text-glow">
            {Math.round(trends.completionRate.current)}%
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(trends.completionRate.current, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={clsx(
              "flex items-center gap-1 font-medium",
              trends.completionRate.trend === 'up' ? "text-emerald-400" : "text-rose-400"
            )}>
              {trends.completionRate.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trends.completionRate.changePercent)}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        </div>
      </Card>

      {/* Secondary Metrics Column */}
      <div className="col-span-1 grid grid-rows-2 gap-4">
        {/* Productivity / Volume */}
        <Card className="p-5 flex flex-col justify-center relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tasks Done</span>
            <Zap size={14} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight relative z-10">
            {trends.productivity.current}
          </div>
          <div className="text-xs text-muted-foreground mt-1 relative z-10">
            {trends.productivity.change > 0 ? '+' : ''}{trends.productivity.change} new
          </div>
        </Card>

        {/* Streak */}
        <Card className="p-5 flex flex-col justify-center relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500">
            <Trophy size={60} />
          </div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Streak</span>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse" />
          </div>
          <div className="text-3xl font-display font-bold text-white tracking-tight relative z-10">
            {trends.streakDays} <span className="text-sm font-normal text-muted-foreground">days</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 relative z-10">
            Keep it up!
          </div>
        </Card>
      </div>
    </div>
  );
}
