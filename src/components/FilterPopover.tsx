"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { Checkbox } from "./ui/Checkbox";
import { Filter, Search, X, Circle, Flag, Tag, User } from "lucide-react";
import { clsx } from "clsx";

export type FilterCategory = "status" | "priority" | "type" | "assignee";

export type FilterChip = {
  category: FilterCategory;
  value: string;
  label: string;
};

type FilterPopoverProps = {
  initialChips?: FilterChip[];
  onApply: (chips: FilterChip[]) => void;
  onClear: () => void;
  counts?: Record<string, number>;
};

const categories: Array<{ id: FilterCategory; label: string; icon: typeof Filter }> = [
  { id: "status", label: "Status", icon: Circle },
  { id: "priority", label: "Priority", icon: Flag },
  { id: "type", label: "Type", icon: Tag },
  { id: "assignee", label: "Assignee", icon: User },
];

const filterOptions: Record<FilterCategory, Array<{ value: string; label: string; color?: string }>> = {
  status: [
    { value: "not_started", label: "Not Started", color: "bg-zinc-400" },
    { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { value: "blocked", label: "Blocked", color: "bg-orange-500" },
    { value: "completed", label: "Completed", color: "bg-emerald-500" },
  ],
  priority: [
    { value: "urgent", label: "Urgent", color: "bg-rose-500" },
    { value: "high", label: "High", color: "bg-amber-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "low", label: "Low", color: "bg-zinc-400" },
  ],
  type: [
    { value: "task", label: "Task", color: "bg-chart-1" },
    { value: "meeting", label: "Meeting", color: "bg-chart-4" },
    { value: "school", label: "School", color: "bg-chart-2" },
  ],
  assignee: [
    { value: "me", label: "Assigned to me" },
    { value: "unassigned", label: "Unassigned" },
  ],
};

export function FilterPopover({ initialChips = [], onApply, onClear, counts }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("status");
  const [search, setSearch] = useState("");
  const [tempSelections, setTempSelections] = useState<Record<FilterCategory, Set<string>>>(() => {
    const initial: Record<FilterCategory, Set<string>> = {
      status: new Set(),
      priority: new Set(),
      type: new Set(),
      assignee: new Set(),
    };
    initialChips.forEach((chip) => {
      initial[chip.category].add(chip.value);
    });
    return initial;
  });

  const filteredOptions = useMemo(() => {
    const options = filterOptions[activeCategory] || [];
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeCategory, search]);

  const totalSelected = useMemo(() => {
    return Object.values(tempSelections).reduce((sum, set) => sum + set.size, 0);
  }, [tempSelections]);

  function toggleOption(value: string) {
    setTempSelections((prev) => {
      const newSet = new Set(prev[activeCategory]);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return { ...prev, [activeCategory]: newSet };
    });
  }

  function handleApply() {
    const chips: FilterChip[] = [];
    Object.entries(tempSelections).forEach(([category, values]) => {
      values.forEach((value) => {
        const option = filterOptions[category as FilterCategory]?.find((o) => o.value === value);
        if (option) {
          chips.push({
            category: category as FilterCategory,
            value,
            label: option.label,
          });
        }
      });
    });
    onApply(chips);
    setOpen(false);
  }

  function handleClear() {
    setTempSelections({
      status: new Set(),
      priority: new Set(),
      type: new Set(),
      assignee: new Set(),
    });
    onClear();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={clsx(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            initialChips.length > 0
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Filter size={14} />
          <span>Filter</span>
          {initialChips.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {initialChips.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="flex h-[320px]">
          {/* Left: Categories */}
          <div className="w-[140px] border-r border-border bg-muted/30 p-2">
            <div className="space-y-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const count = tempSelections[cat.id].size;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearch("");
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      activeCategory === cat.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} />
                      <span>{cat.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Options */}
          <div className="flex flex-1 flex-col">
            {/* Search */}
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {filteredOptions.map((option) => {
                  const isSelected = tempSelections[activeCategory].has(option.value);
                  const count = counts?.[`${activeCategory}:${option.value}`];
                  return (
                    <label
                      key={option.value}
                      className={clsx(
                        "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOption(option.value)}
                        />
                        {option.color && (
                          <span className={clsx("h-2 w-2 rounded-full", option.color)} />
                        )}
                        <span className="text-sm">{option.label}</span>
                      </div>
                      {count !== undefined && (
                        <span className="text-xs text-muted-foreground">{count}</span>
                      )}
                    </label>
                  );
                })}
                {filteredOptions.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No results found</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border p-2">
              <button
                onClick={handleClear}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={handleApply}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply{totalSelected > 0 && ` (${totalSelected})`}
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
