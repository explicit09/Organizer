"use client";

import { useEffect, useState } from "react";
import type { Item } from "../lib/items";
import { CheckSquare, Calendar, GraduationCap, FileText, Link2 } from "lucide-react";
import { clsx } from "clsx";

type RelatedItem = {
  item: Item;
  score: number;
  reasons: string[];
};

type RelatedItemsProps = {
  itemId: string;
  limit?: number;
};

export function RelatedItems({ itemId, limit = 5 }: RelatedItemsProps) {
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    fetch(`/api/items/${itemId}/related?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setRelated(data.related ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemId, limit]);

  if (loading) {
    return <div className="animate-pulse space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 rounded-lg bg-white/5" />
      ))}
    </div>;
  }

  if (related.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Link2 size={12} />
        No related items found.
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckSquare size={16} className="text-purple-400" />;
      case "meeting": return <Calendar size={16} className="text-amber-400" />;
      case "school": return <GraduationCap size={16} className="text-emerald-400" />;
      default: return <FileText size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      {related.map(({ item, reasons }) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5 hover:border-white/[0.08] hover:bg-white/[0.02] transition-colors cursor-pointer group"
        >
          <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{item.title}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {reasons.slice(0, 2).map((reason, i) => (
                <span key={i} className="text-[9px] text-muted-foreground bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
