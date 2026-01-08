"use client";

import { useState, useEffect, useCallback } from "react";
import { List, LayoutGrid, GanttChart, ChevronDown, ArrowUpDown, Layers, Save, Bookmark } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { clsx } from "clsx";

export type ViewType = "list" | "board" | "timeline";
export type SortOption = "manual" | "alphabetical" | "date" | "priority";
export type GroupOption = "none" | "status" | "priority" | "type";

type ViewOptions = {
  view: ViewType;
  sort: SortOption;
  group: GroupOption;
};

type SavedView = {
  id: string;
  name: string;
  viewType: ViewType;
  sortBy: SortOption | null;
  groupBy: GroupOption | null;
  isDefault: boolean;
};

type ViewSwitcherProps = {
  options: ViewOptions;
  onChange: (options: ViewOptions) => void;
  persistKey?: string; // Optional key to identify this view for persistence
};

const viewConfig: Array<{ id: ViewType; label: string; icon: typeof List }> = [
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: GanttChart },
];

const sortOptions: Array<{ id: SortOption; label: string }> = [
  { id: "manual", label: "Manual" },
  { id: "date", label: "Due Date" },
  { id: "priority", label: "Priority" },
  { id: "alphabetical", label: "Alphabetical" },
];

const groupOptions: Array<{ id: GroupOption; label: string }> = [
  { id: "none", label: "None" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "type", label: "Type" },
];

export function ViewSwitcher({ options, onChange, persistKey }: ViewSwitcherProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savingView, setSavingView] = useState(false);

  // Load saved views on mount
  useEffect(() => {
    async function loadViews() {
      try {
        const res = await fetch("/api/views");
        if (res.ok) {
          const data = await res.json();
          setSavedViews(data.views || []);

          // Apply default view if exists and persistKey matches
          const defaultView = (data.views || []).find((v: SavedView) => v.isDefault);
          if (defaultView && persistKey) {
            onChange({
              view: defaultView.viewType || "list",
              sort: (defaultView.sortBy as SortOption) || "manual",
              group: (defaultView.groupBy as GroupOption) || "none",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load saved views:", error);
      }
    }
    loadViews();
  }, [persistKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCurrentView = useCallback(async () => {
    if (!persistKey) return;

    setSavingView(true);
    try {
      const name = `${persistKey} View`;
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          viewType: options.view,
          sortBy: options.sort,
          groupBy: options.group,
          isDefault: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedViews((prev) => [...prev.filter((v) => !v.isDefault), data.view]);
      }
    } catch (error) {
      console.error("Failed to save view:", error);
    } finally {
      setSavingView(false);
    }
  }, [options, persistKey]);

  const applyView = useCallback((view: SavedView) => {
    onChange({
      view: view.viewType || "list",
      sort: (view.sortBy as SortOption) || "manual",
      group: (view.groupBy as GroupOption) || "none",
    });
    setOptionsOpen(false);
  }, [onChange]);

  return (
    <div className="flex items-center gap-1">
      {/* View Type Toggle */}
      <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
        {viewConfig.map((v) => {
          const Icon = v.icon;
          const isActive = options.view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onChange({ ...options, view: v.id })}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* View Options Popover */}
      <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="space-y-3">
            {/* Sort */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <ArrowUpDown size={12} />
                Sort by
              </div>
              <div className="space-y-0.5">
                {sortOptions.map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => onChange({ ...options, sort: sort.id })}
                    className={clsx(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      options.sort === sort.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Group */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Layers size={12} />
                Group by
              </div>
              <div className="space-y-0.5">
                {groupOptions.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => onChange({ ...options, group: group.id })}
                    className={clsx(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      options.group === group.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Views */}
            {savedViews.length > 0 && (
              <>
                <div className="border-t border-border" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Bookmark size={12} />
                    Saved Views
                  </div>
                  <div className="space-y-0.5">
                    {savedViews.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => applyView(view)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Save Current View */}
            {persistKey && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={saveCurrentView}
                  disabled={savingView}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <Save size={12} />
                  {savingView ? "Saving..." : "Save as Default"}
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
