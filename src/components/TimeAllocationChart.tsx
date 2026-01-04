"use client";

import { useEffect, useState } from "react";

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

const typeColors: Record<string, { bar: string; text: string }> = {
  task: { bar: "bg-stone-900", text: "text-stone-900" },
  meeting: { bar: "bg-amber-500", text: "text-amber-600" },
  school: { bar: "bg-teal-500", text: "text-teal-600" },
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
    return <div className="animate-pulse rounded-2xl bg-stone-100 h-40" />;
  }

  if (!data || data.totalItems === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
        No time data available. Add items to see allocation.
      </div>
    );
  }

  const maxDayMinutes = Math.max(...data.byDay.map((d) => d.totalMinutes), 1);

  return (
    <div className="space-y-6">
      {/* Total time */}
      <div className="text-center">
        <div className="text-3xl font-semibold text-stone-900">
          {formatMinutes(data.totalEstimatedMinutes)}
        </div>
        <div className="text-xs uppercase tracking-wider text-stone-400">
          Total estimated time
        </div>
      </div>

      {/* Type breakdown */}
      <div className="space-y-3">
        {data.allocations.map((alloc) => (
          <div key={alloc.type}>
            <div className="flex justify-between text-xs mb-1">
              <span className={`uppercase tracking-wider ${typeColors[alloc.type]?.text ?? "text-stone-500"}`}>
                {alloc.type}
              </span>
              <span className="text-stone-500">
                {alloc.count} items · {formatMinutes(alloc.estimatedMinutes)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-100">
              <div
                className={`h-2 rounded-full ${typeColors[alloc.type]?.bar ?? "bg-stone-400"}`}
                style={{ width: `${alloc.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div>
        <div className="text-xs uppercase tracking-wider text-stone-400 mb-2">
          Last 7 days
        </div>
        <div className="flex items-end gap-1 h-16">
          {data.byDay.map((day) => {
            const height = (day.totalMinutes / maxDayMinutes) * 100;
            const dayName = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t bg-stone-900 transition-all"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${dayName}: ${formatMinutes(day.totalMinutes)}`}
                />
                <span className="text-[10px] text-stone-400 mt-1">{dayName.charAt(0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
