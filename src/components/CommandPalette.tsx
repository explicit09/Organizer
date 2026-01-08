"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/Dialog";
import { VisuallyHidden } from "./ui/VisuallyHidden";
import {
  Search,
  Home,
  CheckSquare,
  Calendar,
  GraduationCap,
  FolderKanban,
  FileText,
  Target,
  Settings,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: typeof Home;
  action: () => void;
  category: "navigation" | "actions" | "recent";
  shortcut?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "nav-dashboard", label: "Dashboard", icon: Home, action: () => router.push("/dashboard"), category: "navigation", shortcut: "G D" },
    { id: "nav-tasks", label: "Tasks", icon: CheckSquare, action: () => router.push("/tasks"), category: "navigation", shortcut: "G T" },
    { id: "nav-meetings", label: "Meetings", icon: Calendar, action: () => router.push("/meetings"), category: "navigation", shortcut: "G M" },
    { id: "nav-school", label: "School", icon: GraduationCap, action: () => router.push("/school"), category: "navigation", shortcut: "G S" },
    { id: "nav-projects", label: "Projects", icon: FolderKanban, action: () => router.push("/projects"), category: "navigation", shortcut: "G P" },
    { id: "nav-notes", label: "Notes", icon: FileText, action: () => router.push("/notes"), category: "navigation", shortcut: "G N" },
    { id: "nav-goals", label: "Goals", icon: Target, action: () => router.push("/progress"), category: "navigation", shortcut: "G G" },
    // Actions
    { id: "action-new-task", label: "New Task", description: "Create a new task", icon: Plus, action: () => { router.push("/tasks"); }, category: "actions" },
    { id: "action-new-meeting", label: "New Meeting", description: "Schedule a meeting", icon: Plus, action: () => { router.push("/meetings"); }, category: "actions" },
    { id: "action-new-note", label: "New Note", description: "Create a new note", icon: Plus, action: () => { router.push("/notes"); }, category: "actions" },
  ], [router]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.description?.toLowerCase().includes(lower)
    );
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const flatCommands = useMemo(() => filteredCommands, [filteredCommands]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    setOpen(false);
    setSearch("");
    cmd.action();
  }, []);

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          setSearch("");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, flatCommands, executeCommand]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const categoryLabels: Record<string, string> = {
    navigation: "Go to",
    actions: "Actions",
    recent: "Recent",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[520px] gap-0 top-[20%] translate-y-0" hideCloseButton aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent py-4 px-3 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {categoryLabels[category] || category}
              </div>
              <div className="space-y-0.5">
                {items.map((cmd) => {
                  const Icon = cmd.icon;
                  const globalIndex = flatCommands.findIndex((c) => c.id === cmd.id);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                      </div>
                      {cmd.shortcut && (
                        <div className="flex items-center gap-1">
                          {cmd.shortcut.split(" ").map((key, i) => (
                            <kbd
                              key={i}
                              className="flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                      {isSelected && !cmd.shortcut && (
                        <ArrowRight size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1">↑</kbd>
              <kbd className="rounded border border-border bg-muted px-1">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1">↵</kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1">esc</kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
