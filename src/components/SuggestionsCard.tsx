"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  type: "reschedule" | "break_down" | "prioritize" | "delegate" | "review";
  message: string;
  itemIds: string[];
  priority: "low" | "medium" | "high";
};

type WorkloadWarning = {
  type: "overload" | "conflict" | "deadline_cluster";
  message: string;
  date?: string;
  itemIds: string[];
};

export function SuggestionsCard() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [warnings, setWarnings] = useState<WorkloadWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.suggestions ?? []);
        setWarnings(data.workloadWarnings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse rounded-2xl bg-stone-100 h-24" />;
  }

  const allItems = [
    ...warnings.map((w) => ({
      icon: w.type === "overload" ? "⚠️" : w.type === "conflict" ? "🔴" : "📅",
      message: w.message,
      priority: "high" as const,
      type: "warning",
    })),
    ...suggestions.map((s) => ({
      icon: s.type === "prioritize" ? "🔥" : s.type === "break_down" ? "✂️" : s.type === "reschedule" ? "📆" : "📋",
      message: s.message,
      priority: s.priority,
      type: "suggestion",
    })),
  ];

  if (allItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-4 text-xs text-emerald-700">
        All good! No suggestions or warnings at the moment.
      </div>
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = allItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="space-y-2">
      {sorted.slice(0, 5).map((item, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
            item.priority === "high"
              ? "bg-rose-50 text-rose-800"
              : item.priority === "medium"
              ? "bg-amber-50 text-amber-800"
              : "bg-stone-50 text-stone-700"
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.message}</span>
        </div>
      ))}
      {sorted.length > 5 && (
        <div className="text-xs text-stone-500 text-center pt-1">
          +{sorted.length - 5} more suggestions
        </div>
      )}
    </div>
  );
}
