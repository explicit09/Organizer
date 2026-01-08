"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Loader2,
} from "lucide-react";
import { ProgressCircle } from "./ui/ProgressCircle";

type AnalyticsData = {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionTime: number; // in days
  };
  trends: {
    thisWeek: number;
    lastWeek: number;
    change: number;
  };
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
};

const statusColors: Record<string, string> = {
  not_started: "bg-zinc-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  blocked: "bg-orange-500",
};

const priorityColors: Record<string, string> = {
  urgent: "bg-rose-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-zinc-400",
};

const typeColors: Record<string, string> = {
  task: "bg-chart-1",
  meeting: "bg-chart-4",
  school: "bg-chart-2",
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const trendIsPositive = data.trends.change >= 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Tasks
            </span>
            <Target size={14} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{data.overview.totalTasks}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Completed
            </span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{data.overview.completedTasks}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.overview.completionRate}% completion rate
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Progress
            </span>
            <Clock size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{data.overview.inProgressTasks}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Overdue
            </span>
            <Calendar size={14} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-500">{data.overview.overdueTasks}</p>
        </div>
      </div>

      {/* Trend Card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Weekly Trend</h3>
          <div className={clsx(
            "flex items-center gap-1 text-sm font-medium",
            trendIsPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {trendIsPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(data.trends.change)}%
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-xl font-bold">{data.trends.thisWeek} completed</p>
          </div>
          <div className="text-muted-foreground">vs</div>
          <div>
            <p className="text-xs text-muted-foreground">Last week</p>
            <p className="text-xl font-bold text-muted-foreground">{data.trends.lastWeek}</p>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* By Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">By Status</h3>
          <div className="space-y-3">
            {data.byStatus.map((item) => (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">
                    {item.status.replace("_", " ")}
                  </span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full", statusColors[item.status] || "bg-primary")}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">By Priority</h3>
          <div className="space-y-3">
            {data.byPriority.map((item) => (
              <div key={item.priority} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{item.priority}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full", priorityColors[item.priority] || "bg-primary")}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">By Type</h3>
          <div className="space-y-3">
            {data.byType.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{item.type}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full", typeColors[item.type] || "bg-primary")}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-1">Overall Completion Rate</h3>
            <p className="text-xs text-muted-foreground">
              {data.overview.completedTasks} of {data.overview.totalTasks} tasks completed
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProgressCircle
              progress={data.overview.completionRate}
              size={64}
              strokeWidth={6}
            />
            <span className="text-3xl font-bold">{data.overview.completionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
