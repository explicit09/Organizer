"use client";

import { useEffect, useState } from "react";
import type { Item } from "../lib/items";

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
        <div key={i} className="h-12 rounded-lg bg-stone-100" />
      ))}
    </div>;
  }

  if (related.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-stone-500">
        No related items found.
      </div>
    );
  }

  const typeIcon = (type: string) => {
    if (type === "task") return "✓";
    if (type === "meeting") return "📅";
    if (type === "school") return "📚";
    return "•";
  };

  return (
    <div className="space-y-2">
      {related.map(({ item, reasons }) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50 transition-colors cursor-pointer"
        >
          <span className="text-base">{typeIcon(item.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-stone-900 truncate">{item.title}</div>
            <div className="text-xs text-stone-500 mt-0.5">
              {reasons.slice(0, 2).join(" · ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
