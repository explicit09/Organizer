"use client";

import { useState, useEffect } from "react";
import { Brain, RefreshCw, TrendingUp, Loader2 } from "lucide-react";
import { ProductivityPatterns } from "@/components/insights/ProductivityPatterns";
import { EstimationAccuracy } from "@/components/insights/EstimationAccuracy";
import { WorkStyleCard } from "@/components/insights/WorkStyleCard";
import { PreferencesOverview } from "@/components/insights/PreferencesOverview";

type LearningModel = {
  userId: string;
  lastUpdated: string;
  samplesUsed: number;
  overallConfidence: number;
  productivity: {
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
  estimation: {
    globalAccuracy: number;
    byTaskType: Record<string, { accuracy: number; bias: number; sampleSize: number }>;
    bySize: Record<string, { accuracy: number; bias: number }>;
    suggestions: string[];
  };
  preferences: {
    communicationStyle: string;
    notificationPreferences: {
      peakEngagementHour: number;
      groupingPreference: string;
      quietHours: { start: number; end: number };
    };
    workStyle: string;
    topSuggestionTypes: string[];
    leastValuableSuggestionTypes: string[];
  };
};

export default function InsightsPage() {
  const [model, setModel] = useState<LearningModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchModel = async () => {
    try {
      const res = await fetch("/api/learning/model");
      if (res.ok) {
        const data = await res.json();
        setModel(data);
      }
    } catch (error) {
      console.error("Failed to fetch learning model:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateModel = async () => {
    setUpdating(true);
    try {
      await fetch("/api/learning/model", { method: "POST" });
      await fetchModel();
    } catch (error) {
      console.error("Failed to update model:", error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchModel();
  }, []);

  // Transform work style data
  const workStyleData = model?.preferences?.workStyle
    ? {
        style: model.preferences.workStyle as "sprinter" | "marathoner" | "balanced",
        characteristics: [],
        strengths: [],
        suggestions: [],
      }
    : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="text-primary" size={24} />
            Learning Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            See what AI has learned about your work patterns and preferences
          </p>
        </div>
        <button
          onClick={updateModel}
          disabled={updating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {updating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </div>

      {/* Model Stats */}
      {model && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4 glass-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Learning Confidence
            </p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">
                {Math.round(model.overallConfidence * 100)}%
              </span>
              <TrendingUp
                size={16}
                className={
                  model.overallConfidence >= 0.7
                    ? "text-emerald-400"
                    : "text-muted-foreground"
                }
              />
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 glass-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Data Points
            </p>
            <span className="text-2xl font-bold text-foreground">
              {model.samplesUsed.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-border p-4 glass-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Last Updated
            </p>
            <span className="text-sm font-medium text-foreground">
              {new Date(model.lastUpdated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Productivity Patterns */}
        <ProductivityPatterns data={model?.productivity || null} loading={loading} />

        {/* Estimation Accuracy */}
        <EstimationAccuracy data={model?.estimation || null} loading={loading} />

        {/* Work Style */}
        <WorkStyleCard data={workStyleData} loading={loading} />

        {/* Preferences */}
        <PreferencesOverview data={model?.preferences || null} loading={loading} />
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Brain size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              How Learning Works
            </h3>
            <p className="text-sm text-muted-foreground">
              The AI learns from your task completions, focus sessions, and interactions.
              The more you use the app, the better it understands your patterns.
              All learning happens locally and is used only to personalize your experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
