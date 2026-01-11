"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Heart,
  Sparkles,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { clsx } from "clsx";
import { DailyBriefing } from "./DailyBriefing";
import { SkeletonInsightCard, SkeletonStats } from "./ui/Skeleton";

type Suggestion = {
  id: string;
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
};

type WellbeingData = {
  overallScore: number;
  factors: {
    workload: { score: number; label: string };
    focus: { score: number; label: string };
    balance: { score: number; label: string };
  };
  recommendations: string[];
};

export function DashboardClient() {
  const [showBriefing, setShowBriefing] = useState(true);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [wellbeing, setWellbeing] = useState<WellbeingData | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingWellbeing, setLoadingWellbeing] = useState(true);

  // Check if briefing was dismissed today
  useEffect(() => {
    const dismissed = localStorage.getItem("briefing_dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const today = new Date();
      if (
        dismissedDate.getDate() === today.getDate() &&
        dismissedDate.getMonth() === today.getMonth() &&
        dismissedDate.getFullYear() === today.getFullYear()
      ) {
        setBriefingDismissed(true);
        setShowBriefing(false);
      }
    }
  }, []);

  // Fetch proactive suggestions
  useEffect(() => {
    fetch("/api/learning/suggestions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.suggestions) {
          setSuggestions(data.suggestions.slice(0, 3));
        }
        setLoadingSuggestions(false);
      })
      .catch(() => setLoadingSuggestions(false));
  }, []);

  // Fetch wellbeing data
  useEffect(() => {
    fetch("/api/proactive/wellbeing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setWellbeing(data);
        }
        setLoadingWellbeing(false);
      })
      .catch(() => setLoadingWellbeing(false));
  }, []);

  const handleStartDay = () => {
    setBriefingDismissed(true);
    setShowBriefing(false);
    localStorage.setItem("briefing_dismissed", new Date().toISOString());
  };

  const handleToggleBriefing = () => {
    if (briefingDismissed) {
      setBriefingDismissed(false);
      localStorage.removeItem("briefing_dismissed");
    }
    setShowBriefing(!showBriefing);
  };

  return (
    <div className="space-y-6">
      {/* Daily Briefing Section */}
      <section className="rounded-xl border border-border overflow-hidden glass-card">
        {/* Briefing Header */}
        <button
          onClick={handleToggleBriefing}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3",
            "bg-gradient-to-r from-primary/10 to-transparent",
            "hover:from-primary/15 transition-colors"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Daily Briefing
            </span>
            {briefingDismissed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                Started
              </span>
            )}
          </div>
          {showBriefing ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </button>

        {/* Briefing Content */}
        {showBriefing && (
          <div className="p-4 border-t border-border/50">
            <DailyBriefing
              onStartDay={handleStartDay}
              onSetPriorities={(priorities) => {
                console.log("Setting priorities:", priorities);
              }}
            />
          </div>
        )}
      </section>

      {/* Proactive Insights Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Suggestions */}
        <section className="rounded-xl border border-border p-4 glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Brain size={14} className="text-primary" />
              AI Insights
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Personalized
            </span>
          </div>

          {loadingSuggestions ? (
            <SkeletonInsightCard />
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "border border-border/50 bg-accent/10",
                    "hover:bg-accent/20 transition-colors cursor-pointer"
                  )}
                >
                  <div
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      suggestion.priority === "high" && "bg-destructive",
                      suggestion.priority === "medium" && "bg-amber-400",
                      suggestion.priority === "low" && "bg-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{suggestion.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {suggestion.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  {suggestion.actionable && (
                    <Lightbulb
                      size={14}
                      className="text-amber-400 shrink-0 mt-0.5"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Brain size={24} className="text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Keep using the app to get personalized insights
              </p>
            </div>
          )}
        </section>

        {/* Wellbeing Indicator */}
        <section className="rounded-xl border border-border p-4 glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              Wellbeing
            </h3>
          </div>

          {loadingWellbeing ? (
            <SkeletonStats />
          ) : wellbeing ? (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 36 36"
                  >
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
                      stroke={
                        wellbeing.overallScore >= 70
                          ? "hsl(142 65% 48%)"
                          : wellbeing.overallScore >= 40
                            ? "hsl(45 95% 55%)"
                            : "hsl(0 85% 60%)"
                      }
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${(wellbeing.overallScore / 100) * 100.5} 100.5`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {wellbeing.overallScore}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {wellbeing.overallScore >= 70
                      ? "Doing Great"
                      : wellbeing.overallScore >= 40
                        ? "Could Be Better"
                        : "Take a Break"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on your recent activity
                  </p>
                </div>
              </div>

              {/* Factor Bars */}
              <div className="space-y-2">
                {wellbeing.factors && Object.entries(wellbeing.factors).map(([key, factor]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-16 capitalize">
                      {key}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-accent/30 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all",
                          factor.score >= 70 && "bg-green-500",
                          factor.score >= 40 && factor.score < 70 && "bg-amber-400",
                          factor.score < 40 && "bg-destructive"
                        )}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8">
                      {factor.score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              {wellbeing.recommendations?.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/10 border border-border/50">
                  <AlertCircle
                    size={14}
                    className="text-amber-400 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {wellbeing.recommendations[0]}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Heart size={24} className="text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Track your focus sessions to see wellbeing insights
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
