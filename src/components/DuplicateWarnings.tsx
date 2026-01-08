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
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.02] backdrop-blur-sm p-4 animate-in fade-in slide-in-from-top-2 shadow-[0_0_20px_-10px_rgba(245,158,11,0.15)]">
      <div className="flex items-center gap-2.5 text-sm font-medium text-amber-500 mb-4 px-1">
        <AlertCircle size={16} className="text-amber-500" />
        <span className="tracking-tight">Possible duplicates detected</span>
      </div>

      <div className="space-y-2">
        {visible.slice(0, 3).map((group) => (
          <div
            key={group.groupKey}
            className="group relative flex items-start justify-between gap-3 rounded-lg border border-amber-500/10 bg-black/20 p-3 text-sm transition-all hover:bg-amber-500/[0.05] hover:border-amber-500/20"
          >
            <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-amber-500/40 rounded-r-full" />
            <div className="flex-1 min-w-0 pl-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-500/60 mb-1.5 flex items-center gap-1.5 font-medium">
                <Copy size={10} />
                {group.reason}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.id} className="text-stone-300 truncate flex items-center gap-2.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500/40" />
                    <span className="opacity-80 group-hover:opacity-100 transition-opacity">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => dismiss(group.groupKey!)}
              className="text-white/20 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {visible.length > 3 && (
        <div className="mt-3 text-[10px] text-amber-500/50 text-center uppercase tracking-widest font-medium">
          +{visible.length - 3} more
        </div>
      )}
    </div>
  );
}
