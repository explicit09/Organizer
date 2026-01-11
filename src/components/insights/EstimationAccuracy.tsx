"use client";

import { clsx } from "clsx";

type EstimationData = {
  globalAccuracy: number;
  byTaskType: Record<string, { accuracy: number; bias: number; sampleSize: number }>;
  bySize: Record<string, { accuracy: number; bias: number }>;
  suggestions: string[];
};

interface EstimationAccuracyProps {
  data: EstimationData | null;
  loading?: boolean;
}

export function EstimationAccuracy({ data, loading }: EstimationAccuracyProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-40 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="h-32 bg-accent/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card text-center">
        <p className="text-sm text-muted-foreground">
          Complete more tasks to see estimation accuracy insights.
        </p>
      </div>
    );
  }

  const accuracyColor =
    data.globalAccuracy >= 80
      ? "text-emerald-400"
      : data.globalAccuracy >= 60
        ? "text-amber-400"
        : "text-rose-400";

  const accuracyBg =
    data.globalAccuracy >= 80
      ? "bg-emerald-500"
      : data.globalAccuracy >= 60
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6">
        Time Estimation Accuracy
      </h3>

      {/* Overall Accuracy */}
      <div className="flex items-center gap-6 mb-6 p-4 rounded-lg bg-accent/10">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="hsl(228 10% 14%)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className={accuracyBg}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(data.globalAccuracy / 100) * 100.5} 100.5`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={clsx("text-xl font-bold", accuracyColor)}>
              {Math.round(data.globalAccuracy)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-1">
            Overall Accuracy
          </p>
          <p className="text-xs text-muted-foreground">
            {data.globalAccuracy >= 80
              ? "Great job! Your estimates are reliable"
              : data.globalAccuracy >= 60
                ? "Good accuracy, room for improvement"
                : "Time estimates need attention"}
          </p>
        </div>
      </div>

      {/* By Task Type */}
      {Object.keys(data.byTaskType).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3">By Task Type</p>
          <div className="space-y-2">
            {Object.entries(data.byTaskType).map(([type, stats]) => (
              <div
                key={type}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground capitalize">{type}</span>
                  {stats.bias !== 0 && (
                    <span
                      className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        stats.bias > 0
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {stats.bias > 0 ? "Underestimate" : "Overestimate"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-accent/30 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        stats.accuracy >= 80
                          ? "bg-emerald-500"
                          : stats.accuracy >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      )}
                      style={{ width: `${stats.accuracy}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(stats.accuracy)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Size */}
      {Object.keys(data.bySize).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3">By Task Size</p>
          <div className="grid grid-cols-3 gap-2">
            {["small", "medium", "large"].map((size) => {
              const stats = data.bySize[size];
              if (!stats) return null;

              return (
                <div
                  key={size}
                  className={clsx(
                    "p-3 rounded-lg border text-center",
                    stats.accuracy >= 80
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : stats.accuracy >= 60
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-rose-500/30 bg-rose-500/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground capitalize mb-1">{size}</p>
                  <p className="text-lg font-bold text-foreground">
                    {Math.round(stats.accuracy)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-primary font-medium mb-2">Tips to Improve</p>
          <ul className="space-y-1">
            {data.suggestions.slice(0, 3).map((suggestion, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
