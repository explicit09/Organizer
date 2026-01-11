"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Bell,
  Brain,
  Sparkles,
  Lightbulb,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";

type ProactiveSettingsData = {
  enabled: boolean;
  suggestionFrequency: "low" | "medium" | "high";
  enabledTypes: {
    scheduling: boolean;
    prioritization: boolean;
    breakdown: boolean;
    reminders: boolean;
    insights: boolean;
  };
  learningEnabled: boolean;
};

export function ProactiveSettings() {
  const [settings, setSettings] = useState<ProactiveSettingsData>({
    enabled: true,
    suggestionFrequency: "medium",
    enabledTypes: {
      scheduling: true,
      prioritization: true,
      breakdown: true,
      reminders: true,
      insights: true,
    },
    learningEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/proactive")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/proactive", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (type: keyof typeof settings.enabledTypes) => {
    setSettings((prev) => ({
      ...prev,
      enabledTypes: {
        ...prev.enabledTypes,
        [type]: !prev.enabledTypes[type],
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Proactive AI</h3>
            <p className="text-sm text-muted-foreground">
              Let AI suggest improvements and optimizations
            </p>
          </div>
        </div>
        <button
          onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={clsx(
            "relative w-11 h-6 rounded-full transition-colors",
            settings.enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              settings.enabled ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Suggestion Frequency */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Suggestion Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setSettings((prev) => ({ ...prev, suggestionFrequency: freq }))}
                  className={clsx(
                    "py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    settings.suggestionFrequency === freq
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/30 text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {settings.suggestionFrequency === "low" && "Occasional helpful suggestions"}
              {settings.suggestionFrequency === "medium" && "Balanced suggestions throughout the day"}
              {settings.suggestionFrequency === "high" && "Frequent suggestions to maximize productivity"}
            </p>
          </div>

          {/* Suggestion Types */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Suggestion Types
            </label>
            <div className="space-y-2">
              <SuggestionTypeToggle
                label="Scheduling Suggestions"
                description="Optimal time slots for tasks"
                icon={<Calendar size={16} />}
                enabled={settings.enabledTypes.scheduling}
                onToggle={() => toggleType("scheduling")}
              />
              <SuggestionTypeToggle
                label="Priority Recommendations"
                description="Smart task prioritization"
                icon={<AlertCircle size={16} />}
                enabled={settings.enabledTypes.prioritization}
                onToggle={() => toggleType("prioritization")}
              />
              <SuggestionTypeToggle
                label="Task Breakdown"
                description="Break complex tasks into subtasks"
                icon={<Lightbulb size={16} />}
                enabled={settings.enabledTypes.breakdown}
                onToggle={() => toggleType("breakdown")}
              />
              <SuggestionTypeToggle
                label="Smart Reminders"
                description="Context-aware reminders"
                icon={<Bell size={16} />}
                enabled={settings.enabledTypes.reminders}
                onToggle={() => toggleType("reminders")}
              />
              <SuggestionTypeToggle
                label="Productivity Insights"
                description="Patterns and improvement tips"
                icon={<Sparkles size={16} />}
                enabled={settings.enabledTypes.insights}
                onToggle={() => toggleType("insights")}
              />
            </div>
          </div>

          {/* Learning Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <h4 className="text-sm font-medium text-foreground">Adaptive Learning</h4>
              <p className="text-xs text-muted-foreground">
                Allow AI to learn from your behavior for better suggestions
              </p>
            </div>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, learningEnabled: !prev.learningEnabled }))}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors",
                settings.learningEnabled ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  settings.learningEnabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save Changes
      </button>
    </div>
  );
}

function SuggestionTypeToggle({
  label,
  description,
  icon,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
        enabled ? "border-primary/30 bg-primary/5" : "border-border hover:bg-accent/10"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className={enabled ? "text-primary" : "text-muted-foreground"}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div
        className={clsx(
          "w-4 h-4 rounded-full border-2 transition-colors",
          enabled ? "border-primary bg-primary" : "border-muted-foreground"
        )}
      >
        {enabled && (
          <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 11.5L3 8l1-1 2.5 2.5L11 5l1 1-5.5 5.5z" />
          </svg>
        )}
      </div>
    </div>
  );
}
