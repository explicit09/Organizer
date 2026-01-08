"use client";

import { useEffect, useState } from "react";
import type { Item } from "../lib/items";
import { AlertCircle, X, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type DuplicateGroup = {
  items: Item[];
  similarity: number;
  reason: string;
  groupKey?: string;
};

export function DuplicateWarnings() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/duplicates?threshold=0.5")
      .then((res) => res.json())
      .then((data) => {
        setDuplicates(data.duplicates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const dismiss = (groupKey: string) => {
    setDismissed((prev) => new Set([...prev, groupKey]));
  };

  if (loading) return null;

  const visible = duplicates
    .map(g => ({ ...g, groupKey: g.items.map(i => i.id).join("-") }))
    .filter(g => !dismissed.has(g.groupKey!));

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-4">
        <AlertCircle size={16} />
        <span>Possible duplicates detected</span>
      </div>

      <div className="space-y-3">
        {visible.slice(0, 3).map((group) => (
          <div
            key={group.groupKey}
            className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 text-sm relative group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/20 rounded-l-lg" />
            <div className="flex-1 min-w-0 pl-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-1 flex items-center gap-1">
                <Copy size={10} />
                {group.reason}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.id} className="text-amber-100 truncate flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50" />
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => dismiss(group.groupKey!)}
              className="text-amber-500/50 hover:text-amber-400 transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {visible.length > 3 && (
        <div className="mt-2 text-xs text-amber-500/50 text-center uppercase tracking-wider">
          +{visible.length - 3} more duplicate groups
        </div>
      )}
    </div>
  );
}
