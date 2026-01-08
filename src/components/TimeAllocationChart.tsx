"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Clock, PieChart } from "lucide-react";

type TimeAllocation = {
  type: string;
  count: number;
  estimatedMinutes: number;
  completedCount: number;
  percentage: number;
};

type DayAllocation = {
  date: string;
  tasks: number;
  meetings: number;
  school: number;
  totalMinutes: number;
};

type AllocationData = {
  totalItems: number;
  totalEstimatedMinutes: number;
  allocations: TimeAllocation[];
  byDay: DayAllocation[];
};

const typeStyles: Record<string, { bar: string; text: string; bg: string }> = {
  task: { bar: "bg-purple-500", text: "text-purple-400", bg: "bg-purple-500/10" },
  meeting: { bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  school: { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TimeAllocationChart() {
  const [data, setData] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics?days=7")
      .then((res) => res.json())
      .then((result) => {
        setData(result.timeAllocation);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse rounded-2xl bg-white/5 h-64" />;
  }

  if (!data || data.totalItems === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-muted-foreground">
        No time data available. Add items to see allocation.
      </div>
    );
  }

  const maxDayMinutes = Math.max(...data.byDay.map((d) => d.totalMinutes), 1);

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <PieChart size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total Load</div>
            <div className="text-2xl font-bold font-display text-white tracking-tight">
              {formatMinutes(data.totalEstimatedMinutes)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Items</div>
          <div className="text-2xl font-bold font-display text-white tracking-tight">
            {data.totalItems}
          </div>
        </div>
      </div>

      {/* Type breakdown */}
      <div className="space-y-4 mb-6">
        {data.allocations.map((alloc) => {
          const style = typeStyles[alloc.type] ?? { bar: "bg-gray-500", text: "text-gray-400", bg: "bg-gray-500/10" };
          return (
            <div key={alloc.type} className="group cursor-default">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-medium mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                <span className={style.text}>{alloc.type}</span>
                <span className="text-white">{formatMinutes(alloc.estimatedMinutes)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={clsx("h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]", style.bar)}
                  style={{ width: `${alloc.percentage}%`, color: "inherit" }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Daily chart */}
      <div className="flex items-end justify-between gap-2 h-24 pt-4 border-t border-white/5">
        {data.byDay.map((day) => {
          const height = (day.totalMinutes / maxDayMinutes) * 100;
          const dayName = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
          const isToday = new Date(day.date).toDateString() === new Date().toDateString();

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              <div
                className={clsx(
                  "w-full rounded-t-sm transition-all duration-300 relative min-h-[4px]",
                  isToday ? "bg-primary shadow-[0_0_15px_var(--primary)]" : "bg-white/10 group-hover:bg-white/20"
                )}
                style={{ height: `${Math.max(height, 5)}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur border border-white/10 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                  {formatMinutes(day.totalMinutes)}
                </div>
              </div>
              <span className={clsx("text-[9px] mt-2 uppercase tracking-wide", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                {dayName.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
