"use client";

import { useState, useMemo } from "react";
import { ItemTable } from "./ItemTable";
import { KanbanBoard } from "./KanbanBoard";
import { SlidePanel } from "./SlidePanel";
import { FilterPopover, type FilterChip } from "./FilterPopover";
import { FilterChips } from "./FilterChips";
import { ViewSwitcher, type ViewType, type SortOption, type GroupOption } from "./ViewSwitcher";
import type { Item } from "../lib/items";
import { Clock, Sparkles, LayoutList, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";

type TasksPageClientProps = {
  items: Item[];
  suggestions: Array<{
    itemId: string;
    title: string;
    suggestedStart: string;
  }>;
};

export function TasksPageClient({ items, suggestions }: TasksPageClientProps) {
  const [filterChips, setFilterChips] = useState<FilterChip[]>([]);
  const [viewOptions, setViewOptions] = useState({
    view: "board" as ViewType,
    sort: "manual" as SortOption,
    group: "status" as GroupOption,
  });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Filter items based on active filter chips
  const filteredItems = useMemo(() => {
    if (filterChips.length === 0) return items;

    return items.filter((item) => {
      const statusFilters = filterChips.filter((c) => c.category === "status").map((c) => c.value);
      const priorityFilters = filterChips.filter((c) => c.category === "priority").map((c) => c.value);
      const typeFilters = filterChips.filter((c) => c.category === "type").map((c) => c.value);

      if (statusFilters.length > 0 && !statusFilters.includes(item.status)) return false;
      if (priorityFilters.length > 0 && !priorityFilters.includes(item.priority)) return false;
      if (typeFilters.length > 0 && !typeFilters.includes(item.type)) return false;

      return true;
    });
  }, [items, filterChips]);

  // Sort items based on sort option
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    switch (viewOptions.sort) {
      case "alphabetical":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "date":
        sorted.sort((a, b) => {
          if (!a.dueAt && !b.dueAt) return 0;
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        });
        break;
      case "priority":
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        sorted.sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4));
        break;
    }
    return sorted;
  }, [filteredItems, viewOptions.sort]);

  function handleRemoveChip(chip: FilterChip) {
    setFilterChips((prev) => prev.filter((c) => !(c.category === chip.category && c.value === chip.value)));
  }

  function handleClearAll() {
    setFilterChips([]);
  }

  // Calculate counts for filter popover
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    items.forEach((item) => {
      result[`status:${item.status}`] = (result[`status:${item.status}`] || 0) + 1;
      result[`priority:${item.priority}`] = (result[`priority:${item.priority}`] || 0) + 1;
      result[`type:${item.type}`] = (result[`type:${item.type}`] || 0) + 1;
    });
    return result;
  }, [items]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Filters and View Switcher */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <FilterPopover
              initialChips={filterChips}
              onApply={setFilterChips}
              onClear={handleClearAll}
              counts={counts}
            />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {filteredItems.length} {filteredItems.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <ViewSwitcher options={viewOptions} onChange={setViewOptions} persistKey="tasks" />
        </div>

        {/* Active Filter Chips */}
        <FilterChips chips={filterChips} onRemove={handleRemoveChip} onClearAll={handleClearAll} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-primary" />
            <h3 className="text-xs sm:text-sm font-medium text-foreground">Suggested Schedule</h3>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.itemId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="text-foreground truncate text-xs sm:text-sm">{suggestion.title}</span>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  <Clock size={10} />
                  {suggestion.suggestedStart.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Content - View Switching */}
      {viewOptions.view === "board" && <KanbanBoard items={sortedItems} />}
      {viewOptions.view === "list" && (
        <ItemTable 
          title="Tasks" 
          items={sortedItems} 
          emptyLabel="No tasks match your filters."
          onItemClick={setSelectedItem}
        />
      )}
      {viewOptions.view === "timeline" && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Timeline view coming soon...</p>
        </div>
      )}

      {/* Slide Panel */}
      <SlidePanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
