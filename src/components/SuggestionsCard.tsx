"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, Split, ListChecks, CheckCircle2, Zap } from "lucide-react";
import { clsx } from "clsx";

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
    return <div className="animate-pulse rounded-2xl bg-white/5 h-24" />;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'overload': return <Zap size={16} className="text-amber-400" />;
      case 'conflict': return <AlertCircle size={16} className="text-rose-400" />;
      case 'deadline_cluster': return <Calendar size={16} className="text-rose-400" />;
      case 'prioritize': return <Zap size={16} className="text-amber-400" />;
      case 'break_down': return <Split size={16} className="text-blue-400" />;
      case 'reschedule': return <Calendar size={16} className="text-orange-400" />;
      default: return <ListChecks size={16} className="text-muted-foreground" />;
    }
  }

  const allItems = [
    ...warnings.map((w) => ({
      icon: getIcon(w.type),
      message: w.message,
      priority: "high" as const,
      type: w.type,
      isWarning: true
    })),
    ...suggestions.map((s) => ({
      icon: getIcon(s.type),
      message: s.message,
      priority: s.priority,
      type: s.type,
      isWarning: false
    })),
  ];

  if (allItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 px-4 py-6 text-center text-xs text-emerald-400 flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 size={16} />
        </div>
        All good! No suggestions at the moment.
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
          className={clsx(
            "flex items-start gap-3 rounded-xl p-3 text-sm border transition-colors",
            item.priority === "high"
              ? "bg-rose-500/5 border-rose-500/10 text-rose-200"
              : item.priority === "medium"
                ? "bg-amber-500/5 border-amber-500/10 text-amber-200"
                : "bg-white/5 border-white/5 text-muted-foreground"
          )}
        >
          <div className="mt-0.5 shrink-0">{item.icon}</div>
          <span className="leading-snug text-xs">{item.message}</span>
        </div>
      ))}
      {sorted.length > 5 && (
        <div className="text-[10px] text-muted-foreground text-center pt-2 uppercase tracking-wider">
          +{sorted.length - 5} more suggestions
        </div>
      )}
    </div>
  );
}
