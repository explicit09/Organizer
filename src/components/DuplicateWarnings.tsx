"use client";

import { useEffect, useState } from "react";
import type { Item } from "../lib/items";

type DuplicateGroup = {
  items: Item[];
  similarity: number;
  reason: string;
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

  if (loading) {
    return null;
  }

  const visible = duplicates.filter(
    (group) => !dismissed.has(group.items.map((i) => i.id).join("-"))
  );

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <span>⚠️</span>
        <span>Possible duplicates detected</span>
      </div>
      <div className="mt-3 space-y-3">
        {visible.slice(0, 3).map((group) => {
          const groupKey = group.items.map((i) => i.id).join("-");
          return (
            <div
              key={groupKey}
              className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-amber-600 mb-1">{group.reason}</div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id} className="text-stone-700 truncate">
                      • {item.title}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => dismiss(groupKey)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Dismiss
              </button>
            </div>
          );
        })}
      </div>
      {visible.length > 3 && (
        <div className="mt-2 text-xs text-amber-600 text-center">
          +{visible.length - 3} more duplicate groups
        </div>
      )}
    </div>
  );
}
