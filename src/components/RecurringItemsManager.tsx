"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckSquare, Calendar, GraduationCap, Repeat, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { clsx } from "clsx";

type RecurringTemplate = {
  id: string;
  title: string;
  type: string;
  recurrenceRule: string;
  recurrenceEnd?: string;
};

const ruleLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function RecurringItemsManager() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items/recurring")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generateInstances = async (itemId: string) => {
    setGenerating(itemId);

    // Generate instances for the next 30 days
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch("/api/items/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, until }),
      });

      const data = await res.json();

      if (res.ok) {
        router.refresh();
      } else {
        console.error(data.error);
      }
    } catch {
      console.error("Failed to generate instances");
    } finally {
      setGenerating(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckSquare size={18} />;
      case "meeting": return <Calendar size={18} />;
      case "school": return <GraduationCap size={18} />;
      default: return <Repeat size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "task": return "text-purple-400 bg-purple-500/10";
      case "meeting": return "text-amber-400 bg-amber-500/10";
      case "school": return "text-emerald-400 bg-emerald-500/10";
      default: return "text-blue-400 bg-blue-500/10";
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] py-10 text-center flex flex-col items-center gap-3">
        <Repeat size={24} className="text-muted-foreground/50" />
        <div>
          <h3 className="text-sm font-medium text-white">No Recurring Items</h3>
          <p className="text-xs text-muted-foreground mt-1">Set up recurring tasks to automate your workflow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="text-primary" size={12} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active Templates</span>
      </div>
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.06] bg-[#0c0c0e] hover:border-white/[0.1] transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={clsx("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", getTypeColor(template.type))}>
                {getTypeIcon(template.type)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{template.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-white/[0.04]">
                    {ruleLabels[template.recurrenceRule] ?? template.recurrenceRule}
                  </span>
                  {template.recurrenceEnd && (
                    <span className="text-[10px] text-muted-foreground">
                      Until {new Date(template.recurrenceEnd).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => generateInstances(template.id)}
              disabled={generating === template.id}
              className="h-8 px-3 text-xs shrink-0"
            >
              {generating === template.id ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight size={12} className="ml-1" />
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
