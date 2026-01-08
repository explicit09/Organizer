"use client";

import { X } from "lucide-react";
import { clsx } from "clsx";
import type { FilterChip } from "./FilterPopover";

type FilterChipsProps = {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
  onClearAll: () => void;
};

const categoryColors: Record<string, string> = {
  status: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  priority: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  type: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  assignee: "bg-teal-500/10 text-teal-400 border-teal-500/30",
};

export function FilterChips({ chips, onRemove, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, index) => (
        <span
          key={`${chip.category}-${chip.value}-${index}`}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
            categoryColors[chip.category] || "bg-muted text-muted-foreground border-border"
          )}
        >
          <span className="capitalize">{chip.category}:</span>
          <span>{chip.label}</span>
          <button
            onClick={() => onRemove(chip)}
            className="ml-0.5 rounded-sm p-0.5 hover:bg-white/10 transition-colors"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
