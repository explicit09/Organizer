"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Coffee,
  Sun,
  Wind,
  Music,
  Eye,
  Footprints,
  Brain,
  Clock,
  Check,
} from "lucide-react";

type BreakSuggestion = {
  id: string;
  type: "stretch" | "walk" | "breathe" | "hydrate" | "eyes" | "music" | "meditate";
  title: string;
  duration: number;
  description: string;
};

interface BreakSuggestionsProps {
  suggestions?: BreakSuggestion[];
  timeSinceLastBreak?: number;
  loading?: boolean;
}

const breakIcons = {
  stretch: Sun,
  walk: Footprints,
  breathe: Wind,
  hydrate: Coffee,
  eyes: Eye,
  music: Music,
  meditate: Brain,
};

const defaultSuggestions: BreakSuggestion[] = [
  {
    id: "1",
    type: "eyes",
    title: "Eye Rest",
    duration: 2,
    description: "Look at something 20 feet away for 20 seconds",
  },
  {
    id: "2",
    type: "stretch",
    title: "Quick Stretch",
    duration: 3,
    description: "Stretch your neck, shoulders, and back",
  },
  {
    id: "3",
    type: "breathe",
    title: "Deep Breathing",
    duration: 2,
    description: "4-7-8 breathing technique for relaxation",
  },
  {
    id: "4",
    type: "walk",
    title: "Short Walk",
    duration: 5,
    description: "Take a brief walk to refresh your mind",
  },
];

export function BreakSuggestions({
  suggestions = defaultSuggestions,
  timeSinceLastBreak = 0,
  loading,
}: BreakSuggestionsProps) {
  const [completedBreaks, setCompletedBreaks] = useState<Set<string>>(new Set());
  const [activeBreak, setActiveBreak] = useState<string | null>(null);

  const handleStartBreak = (id: string) => {
    setActiveBreak(id);
  };

  const handleCompleteBreak = (id: string) => {
    setCompletedBreaks((prev) => new Set([...prev, id]));
    setActiveBreak(null);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border p-6 glass-card">
        <div className="h-6 w-40 bg-accent/30 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-accent/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const needsBreak = timeSinceLastBreak >= 60;

  return (
    <div className="rounded-xl border border-border p-6 glass-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Coffee size={16} className="text-amber-400" />
          Break Suggestions
        </h3>
        {timeSinceLastBreak > 0 && (
          <span
            className={clsx(
              "text-xs px-2 py-1 rounded-full",
              needsBreak
                ? "bg-amber-500/20 text-amber-400"
                : "bg-accent/30 text-muted-foreground"
            )}
          >
            <Clock size={12} className="inline mr-1" />
            {timeSinceLastBreak}m since last break
          </span>
        )}
      </div>

      {/* Break needed alert */}
      {needsBreak && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-400 font-medium">
            Time for a break! You&apos;ve been working for a while.
          </p>
        </div>
      )}

      {/* Break suggestions */}
      <div className="space-y-2">
        {suggestions.map((suggestion) => {
          const Icon = breakIcons[suggestion.type];
          const isCompleted = completedBreaks.has(suggestion.id);
          const isActive = activeBreak === suggestion.id;

          return (
            <div
              key={suggestion.id}
              className={clsx(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : isActive
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/50 bg-accent/5 hover:bg-accent/10"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isCompleted
                    ? "bg-emerald-500/20"
                    : isActive
                      ? "bg-primary/20"
                      : "bg-accent/30"
                )}
              >
                {isCompleted ? (
                  <Check size={18} className="text-emerald-400" />
                ) : (
                  <Icon
                    size={18}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={clsx(
                    "text-sm font-medium",
                    isCompleted ? "text-emerald-400" : "text-foreground"
                  )}
                >
                  {suggestion.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.duration} min · {suggestion.description}
                </p>
              </div>
              {!isCompleted && (
                <button
                  onClick={() =>
                    isActive
                      ? handleCompleteBreak(suggestion.id)
                      : handleStartBreak(suggestion.id)
                  }
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {isActive ? "Done" : "Start"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Breaks taken today
          </span>
          <span className="text-sm font-medium text-foreground">
            {completedBreaks.size}/{suggestions.length}
          </span>
        </div>
      </div>
    </div>
  );
}
