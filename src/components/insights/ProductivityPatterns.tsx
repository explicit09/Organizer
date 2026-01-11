"use client";

import { clsx } from "clsx";

type ProductivityData = {
  peakHours: number[];
  peakDays: string[];
  peakWindows: Array<{
    day: string;
    startHour: number;
    endHour: number;
    score: number;
  }>;
  optimalFocusDuration: number;
};

interface ProductivityPatternsProps {
  data: ProductivityData | null;
  loading?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProductivityPatterns({ data, loading }: ProductivityPatternsProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-40 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="h-40 bg-accent/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card text-center">
        <p className="text-sm text-muted-foreground">
          Not enough data to show productivity patterns yet.
          <br />
          Keep using the app to build your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6">
        Productivity Patterns
      </h3>

      {/* Heat Map */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-3">
          When you&apos;re most productive (based on task completion)
        </p>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {hours.filter((_, i) => i % 3 === 0).map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] text-muted-foreground"
                  style={{ width: `${100 / 8}%` }}
                >
                  {hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {days.map((day) => {
              const isPeakDay = data.peakDays.includes(day) ||
                data.peakDays.some(d => d.toLowerCase().startsWith(day.toLowerCase()));

              return (
                <div key={day} className="flex items-center gap-2 mb-1">
                  <span
                    className={clsx(
                      "w-10 text-[10px] text-right",
                      isPeakDay ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex-1 flex gap-0.5">
                    {hours.map((hour) => {
                      const isPeakHour = data.peakHours.includes(hour);
                      const peakWindow = data.peakWindows.find(
                        (w) =>
                          w.day.toLowerCase().startsWith(day.toLowerCase()) &&
                          hour >= w.startHour &&
                          hour < w.endHour
                      );
                      const intensity = peakWindow
                        ? peakWindow.score
                        : isPeakHour && isPeakDay
                          ? 0.7
                          : isPeakHour
                            ? 0.4
                            : 0.1;

                      return (
                        <div
                          key={hour}
                          className="flex-1 h-5 rounded-sm transition-colors"
                          style={{
                            backgroundColor: `hsl(238 65% 62% / ${intensity})`,
                          }}
                          title={`${day} ${hour}:00 - Productivity: ${Math.round(intensity * 100)}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Less</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                  <div
                    key={intensity}
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: `hsl(238 65% 62% / ${intensity})` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Peak Hours
          </p>
          <p className="text-sm font-medium text-foreground">
            {data.peakHours.length > 0
              ? data.peakHours
                  .slice(0, 3)
                  .map((h) => (h < 12 ? `${h || 12}AM` : `${h === 12 ? 12 : h - 12}PM`))
                  .join(", ")
              : "Not determined"}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-accent/10 border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Best Days
          </p>
          <p className="text-sm font-medium text-foreground">
            {data.peakDays.length > 0 ? data.peakDays.slice(0, 3).join(", ") : "Not determined"}
          </p>
        </div>
        <div className="col-span-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-[10px] text-primary uppercase tracking-wider mb-1">
            Optimal Focus Duration
          </p>
          <p className="text-sm font-medium text-foreground">
            {data.optimalFocusDuration} minutes
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on your successful focus sessions
          </p>
        </div>
      </div>
    </div>
  );
}
