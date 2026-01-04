"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
        alert(`Generated ${data.count} recurring instances!`);
        router.refresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to generate instances");
    } finally {
      setGenerating(null);
    }
  };

  const typeIcon = (type: string) => {
    if (type === "task") return "✓";
    if (type === "meeting") return "📅";
    if (type === "school") return "📚";
    return "•";
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-stone-100" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
        No recurring items. Create an item with a recurrence rule to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div
          key={template.id}
          className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">{typeIcon(template.type)}</span>
            <div>
              <div className="font-medium text-stone-900">{template.title}</div>
              <div className="text-xs text-stone-500 mt-0.5">
                {ruleLabels[template.recurrenceRule] ?? template.recurrenceRule}
                {template.recurrenceEnd && (
                  <span className="ml-2">
                    until {new Date(template.recurrenceEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => generateInstances(template.id)}
            disabled={generating === template.id}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {generating === template.id ? "Generating..." : "Generate"}
          </button>
        </div>
      ))}
    </div>
  );
}
