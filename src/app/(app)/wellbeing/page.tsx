"use client";

import { useState, useEffect } from "react";
import { Heart, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { FocusStats } from "@/components/wellbeing/FocusStats";
import { BurnoutIndicator } from "@/components/wellbeing/BurnoutIndicator";
import { BreakSuggestions } from "@/components/wellbeing/BreakSuggestions";
import { WorkHourProtection } from "@/components/wellbeing/WorkHourProtection";

type WellbeingData = {
  focus: {
    todayMinutes: number;
    weekMinutes: number;
    avgSessionLength: number;
    longestStreak: number;
    sessionsThisWeek: number;
    completionRate: number;
  };
  burnout: {
    riskLevel: "low" | "moderate" | "high" | "critical";
    score: number;
    factors: Array<{
      name: string;
      impact: "positive" | "negative" | "neutral";
      description: string;
    }>;
    trend: "improving" | "stable" | "declining";
  };
  workHours: {
    isWorkHours: boolean;
    currentHour: number;
    workStartHour: number;
    workEndHour: number;
    overtimeToday: number;
    overtimeThisWeek: number;
    protectionEnabled: boolean;
  };
  timeSinceLastBreak: number;
};

export default function WellbeingPage() {
  const [data, setData] = useState<WellbeingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWellbeing = async () => {
    try {
      const res = await fetch("/api/proactive/wellbeing");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch wellbeing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWellbeing();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWellbeing();
  }, []);

  // Calculate overall wellbeing score
  const calculateOverallScore = () => {
    if (!data) return 0;

    const burnoutScore = data.burnout?.riskLevel === "low" ? 100 :
      data.burnout?.riskLevel === "moderate" ? 70 :
      data.burnout?.riskLevel === "high" ? 40 : 20;

    const focusScore = data.focus?.completionRate || 50;
    const overtimeScore = Math.max(0, 100 - (data.workHours?.overtimeThisWeek || 0) * 10);

    return Math.round((burnoutScore + focusScore + overtimeScore) / 3);
  };

  const overallScore = calculateOverallScore();
  const scoreColor = overallScore >= 70 ? "text-emerald-400" :
    overallScore >= 40 ? "text-amber-400" : "text-rose-400";
  const scoreBg = overallScore >= 70 ? "bg-emerald-500" :
    overallScore >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Heart className="text-rose-400" size={24} />
            Wellbeing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your work-life balance and prevent burnout
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </div>

      {/* Overall Score Banner */}
      <div className="rounded-xl border border-border p-6 glass-card bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
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
                className={scoreBg}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(overallScore / 100) * 100.5} 100.5`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>
                {loading ? "--" : overallScore}
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Overall Wellbeing Score
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {overallScore >= 70
                ? "You're maintaining a healthy work-life balance"
                : overallScore >= 40
                  ? "There's room for improvement in your wellbeing"
                  : "Your wellbeing needs attention - consider taking action"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles size={12} className="text-primary" />
              Based on focus time, burnout risk, and work hours
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Focus Stats */}
        <FocusStats data={data?.focus || null} loading={loading} />

        {/* Burnout Indicator */}
        <BurnoutIndicator data={data?.burnout || null} loading={loading} />

        {/* Break Suggestions */}
        <BreakSuggestions
          timeSinceLastBreak={data?.timeSinceLastBreak || 0}
          loading={loading}
        />

        {/* Work Hour Protection */}
        <WorkHourProtection data={data?.workHours || null} loading={loading} />
      </div>

      {/* Tips Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Heart size={20} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Wellbeing Tips
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Take regular breaks every 60-90 minutes of focused work</li>
              <li>• Stay hydrated and move around during breaks</li>
              <li>• Set clear boundaries between work and personal time</li>
              <li>• Listen to your body - rest when you feel tired</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
