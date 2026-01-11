"use client";

import { clsx } from "clsx";
import { MessageSquare, Bell, ThumbsUp, ThumbsDown } from "lucide-react";

type PreferencesData = {
  communicationStyle: string;
  notificationPreferences: {
    peakEngagementHour: number;
    groupingPreference: string;
    quietHours: { start: number; end: number };
  };
  topSuggestionTypes: string[];
  leastValuableSuggestionTypes: string[];
};

interface PreferencesOverviewProps {
  data: PreferencesData | null;
  loading?: boolean;
}

export function PreferencesOverview({ data, loading }: PreferencesOverviewProps) {
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
          Interact more with the app to learn your preferences.
        </p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-6">
        Learned Preferences
      </h3>

      <div className="space-y-4">
        {/* Communication Style */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-border/50">
          <MessageSquare size={18} className="text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Communication Style</p>
            <p className="text-xs text-muted-foreground capitalize">
              {data.communicationStyle || "Not determined"}
            </p>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-border/50">
          <Bell size={18} className="text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-2">
              Notification Preferences
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Best time:</span>{" "}
                <span className="text-foreground">
                  {formatHour(data.notificationPreferences.peakEngagementHour)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Grouping:</span>{" "}
                <span className="text-foreground capitalize">
                  {data.notificationPreferences.groupingPreference}
                </span>
              </div>
              {data.notificationPreferences.quietHours && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Quiet hours:</span>{" "}
                  <span className="text-foreground">
                    {formatHour(data.notificationPreferences.quietHours.start)} -{" "}
                    {formatHour(data.notificationPreferences.quietHours.end)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestion Preferences */}
        <div className="grid grid-cols-2 gap-3">
          {/* Most Valuable */}
          {data.topSuggestionTypes.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp size={14} className="text-emerald-400" />
                <p className="text-xs font-medium text-emerald-400">Most Helpful</p>
              </div>
              <ul className="space-y-1">
                {data.topSuggestionTypes.slice(0, 3).map((type, i) => (
                  <li key={i} className="text-xs text-muted-foreground capitalize">
                    {type.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Least Valuable */}
          {data.leastValuableSuggestionTypes.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown size={14} className="text-rose-400" />
                <p className="text-xs font-medium text-rose-400">Less Useful</p>
              </div>
              <ul className="space-y-1">
                {data.leastValuableSuggestionTypes.slice(0, 3).map((type, i) => (
                  <li key={i} className="text-xs text-muted-foreground capitalize">
                    {type.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Learning Progress */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            AI continuously learns from your interactions to provide better suggestions
          </p>
        </div>
      </div>
    </div>
  );
}
