"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Bot,
  Sparkles,
  MessageSquare,
  Zap,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";

type AIPreferencesData = {
  personality: "professional" | "friendly" | "concise";
  verbosity: "minimal" | "balanced" | "detailed";
  autoSuggestions: boolean;
  confirmActions: boolean;
  showReasoning: boolean;
  preferredModels: {
    chat: "fast" | "smart" | "balanced";
    planning: "fast" | "smart" | "balanced";
    analysis: "fast" | "smart" | "balanced";
  };
};

const defaultPreferences: AIPreferencesData = {
  personality: "friendly",
  verbosity: "balanced",
  autoSuggestions: true,
  confirmActions: true,
  showReasoning: false,
  preferredModels: {
    chat: "balanced",
    planning: "smart",
    analysis: "smart",
  },
};

export function AIPreferences() {
  const [preferences, setPreferences] = useState<AIPreferencesData>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPreferences(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
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
      {/* Personality */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
          <MessageSquare size={14} />
          Communication Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["professional", "friendly", "concise"] as const).map((style) => (
            <button
              key={style}
              onClick={() => setPreferences((prev) => ({ ...prev, personality: style }))}
              className={clsx(
                "py-3 px-4 rounded-lg border text-sm transition-colors",
                preferences.personality === style
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/10"
              )}
            >
              <div className="font-medium capitalize mb-1">{style}</div>
              <div className="text-[10px] opacity-70">
                {style === "professional" && "Formal & structured"}
                {style === "friendly" && "Warm & helpful"}
                {style === "concise" && "Brief & to-the-point"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Verbosity */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          Response Detail Level
        </label>
        <div className="space-y-2">
          {(["minimal", "balanced", "detailed"] as const).map((level) => (
            <label
              key={level}
              className={clsx(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                preferences.verbosity === level
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/10"
              )}
            >
              <input
                type="radio"
                name="verbosity"
                checked={preferences.verbosity === level}
                onChange={() => setPreferences((prev) => ({ ...prev, verbosity: level }))}
                className="sr-only"
              />
              <div
                className={clsx(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  preferences.verbosity === level ? "border-primary" : "border-muted-foreground"
                )}
              >
                {preferences.verbosity === level && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground capitalize">{level}</div>
                <div className="text-xs text-muted-foreground">
                  {level === "minimal" && "Short, direct answers"}
                  {level === "balanced" && "Clear explanations when needed"}
                  {level === "detailed" && "Thorough explanations and context"}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Behavior Toggles */}
      <div className="space-y-3">
        <ToggleRow
          icon={<Sparkles size={16} />}
          label="Auto-suggestions"
          description="AI proactively suggests improvements"
          enabled={preferences.autoSuggestions}
          onToggle={() =>
            setPreferences((prev) => ({ ...prev, autoSuggestions: !prev.autoSuggestions }))
          }
        />
        <ToggleRow
          icon={<Zap size={16} />}
          label="Confirm destructive actions"
          description="Ask before deleting or major changes"
          enabled={preferences.confirmActions}
          onToggle={() =>
            setPreferences((prev) => ({ ...prev, confirmActions: !prev.confirmActions }))
          }
        />
        <ToggleRow
          icon={<Eye size={16} />}
          label="Show reasoning"
          description="Explain why AI makes suggestions"
          enabled={preferences.showReasoning}
          onToggle={() =>
            setPreferences((prev) => ({ ...prev, showReasoning: !prev.showReasoning }))
          }
        />
      </div>

      {/* Model Preferences */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
          <Bot size={14} />
          AI Model Preferences
        </label>
        <div className="space-y-3">
          {(["chat", "planning", "analysis"] as const).map((task) => (
            <div key={task} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span className="text-sm text-foreground capitalize">{task}</span>
              <select
                value={preferences.preferredModels[task]}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    preferredModels: {
                      ...prev.preferredModels,
                      [task]: e.target.value as "fast" | "smart" | "balanced",
                    },
                  }))
                }
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="fast">Fast (Lower quality)</option>
                <option value="balanced">Balanced</option>
                <option value="smart">Smart (Higher quality)</option>
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Faster models respond quicker but may be less accurate for complex tasks.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent/10 flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={clsx(
          "relative w-11 h-6 rounded-full transition-colors",
          enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
