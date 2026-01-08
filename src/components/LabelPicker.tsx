"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { Badge } from "./ui/Badge";
import { Tag, Plus, Check, X } from "lucide-react";
import { clsx } from "clsx";

type Label = {
  id: string;
  name: string;
  color: string;
};

// Predefined colors for labels
const LABEL_COLORS = [
  { name: "Red", value: "bg-rose-500", text: "text-rose-400" },
  { name: "Orange", value: "bg-orange-500", text: "text-orange-400" },
  { name: "Amber", value: "bg-amber-500", text: "text-amber-400" },
  { name: "Yellow", value: "bg-yellow-500", text: "text-yellow-400" },
  { name: "Lime", value: "bg-lime-500", text: "text-lime-400" },
  { name: "Green", value: "bg-emerald-500", text: "text-emerald-400" },
  { name: "Teal", value: "bg-teal-500", text: "text-teal-400" },
  { name: "Cyan", value: "bg-cyan-500", text: "text-cyan-400" },
  { name: "Blue", value: "bg-blue-500", text: "text-blue-400" },
  { name: "Indigo", value: "bg-indigo-500", text: "text-indigo-400" },
  { name: "Purple", value: "bg-purple-500", text: "text-purple-400" },
  { name: "Pink", value: "bg-pink-500", text: "text-pink-400" },
];

interface LabelPickerProps {
  selectedLabels: string[];
  availableLabels?: Label[];
  onChange: (labels: string[]) => void;
  onCreateLabel?: (name: string, color: string) => void;
}

export function LabelPicker({
  selectedLabels,
  availableLabels = [],
  onChange,
  onCreateLabel,
}: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);

  const filteredLabels = useMemo(() => {
    if (!search) return availableLabels;
    return availableLabels.filter((label) =>
      label.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableLabels, search]);

  function toggleLabel(labelId: string) {
    if (selectedLabels.includes(labelId)) {
      onChange(selectedLabels.filter((id) => id !== labelId));
    } else {
      onChange([...selectedLabels, labelId]);
    }
  }

  function handleCreate() {
    if (newLabelName.trim() && onCreateLabel) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName("");
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Selected Labels */}
      {selectedLabels.map((labelId) => {
        const label = availableLabels.find((l) => l.id === labelId);
        if (!label) return null;
        return (
          <Badge
            key={label.id}
            variant="outline"
            removable
            onRemove={() => toggleLabel(label.id)}
            className={clsx("border-transparent", label.color.replace("bg-", "bg-") + "/20")}
          >
            <span className={clsx("h-2 w-2 rounded-full", label.color)} />
            {label.name}
          </Badge>
        );
      })}

      {/* Add Label Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-border transition-colors">
            <Tag size={10} />
            Add label
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          {isCreating ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Label</span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1 rounded hover:bg-accent"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewLabelColor(color.value)}
                    className={clsx(
                      "h-5 w-5 rounded-full transition-all",
                      color.value,
                      newLabelColor === color.value && "ring-2 ring-white ring-offset-2 ring-offset-background"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={handleCreate}
                disabled={!newLabelName.trim()}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create Label
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search labels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {filteredLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={clsx(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <span className={clsx("h-3 w-3 rounded-full", label.color)} />
                      <span className="flex-1 text-left">{label.name}</span>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
                {filteredLabels.length === 0 && (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No labels found
                  </p>
                )}
              </div>
              {onCreateLabel && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Plus size={14} />
                  Create new label
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
