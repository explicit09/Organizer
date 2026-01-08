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
  Sun,
  Repeat,
  Timer,
  Inbox,
  Keyboard,
  Sparkles,
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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Event dispatcher for focus mode
  const openFocusMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-focus-mode"));
  }, []);

  // Event dispatcher for AI agent
  const openAIAgent = useCallback(() => {
    const event = new KeyboardEvent("keydown", {
      key: "j",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation - Priority pages first
    { id: "nav-today", label: "Today", description: "Daily planning & focus", icon: Sun, action: () => router.push("/today"), category: "navigation", shortcut: "G Y" },
    { id: "nav-inbox", label: "Inbox", description: "Unprocessed items", icon: Inbox, action: () => router.push("/inbox"), category: "navigation", shortcut: "G I" },
    { id: "nav-dashboard", label: "Dashboard", icon: Home, action: () => router.push("/dashboard"), category: "navigation", shortcut: "G D" },
    { id: "nav-tasks", label: "Tasks", icon: CheckSquare, action: () => router.push("/tasks"), category: "navigation", shortcut: "G T" },
    { id: "nav-habits", label: "Habits", description: "Track daily habits", icon: Repeat, action: () => router.push("/habits"), category: "navigation", shortcut: "G H" },
    { id: "nav-meetings", label: "Meetings", icon: Calendar, action: () => router.push("/meetings"), category: "navigation", shortcut: "G M" },
    { id: "nav-school", label: "School", icon: GraduationCap, action: () => router.push("/school"), category: "navigation", shortcut: "G S" },
    { id: "nav-projects", label: "Projects", icon: FolderKanban, action: () => router.push("/projects"), category: "navigation", shortcut: "G P" },
    { id: "nav-notes", label: "Notes", icon: FileText, action: () => router.push("/notes"), category: "navigation", shortcut: "G N" },
    { id: "nav-goals", label: "Goals", icon: Target, action: () => router.push("/progress"), category: "navigation", shortcut: "G G" },
    // Actions
    { id: "action-focus", label: "Start Focus Session", description: "Pomodoro timer", icon: Timer, action: openFocusMode, category: "actions", shortcut: "⌘⇧F" },
    { id: "action-ai", label: "Ask AI", description: "Natural language commands", icon: Sparkles, action: openAIAgent, category: "actions", shortcut: "⌘J" },
    { id: "action-new-task", label: "New Task", description: "Create a new task", icon: Plus, action: () => { router.push("/inbox?new=task"); }, category: "actions", shortcut: "N" },
    { id: "action-new-meeting", label: "New Meeting", description: "Schedule a meeting", icon: Plus, action: () => { router.push("/meetings?new=true"); }, category: "actions" },
    { id: "action-new-note", label: "New Note", description: "Create a new note", icon: Plus, action: () => { router.push("/notes?new=true"); }, category: "actions" },
    { id: "action-shortcuts", label: "Keyboard Shortcuts", description: "View all shortcuts", icon: Keyboard, action: () => setShowKeyboardHelp(true), category: "actions", shortcut: "?" },
  ], [router, openFocusMode, openAIAgent]);

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

  // Global keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Focus mode: Cmd+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-focus-mode"));
        return;
      }

      // Show keyboard help: ?
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Quick navigation with G + key (vim style)
      if (!isInput && !open) {
        if (e.key === "g" && !gPressed) {
          gPressed = true;
          gTimeout = setTimeout(() => { gPressed = false; }, 500);
          return;
        }

        if (gPressed) {
          gPressed = false;
          clearTimeout(gTimeout);
          switch (e.key) {
            case "y": router.push("/today"); return;
            case "i": router.push("/inbox"); return;
            case "d": router.push("/dashboard"); return;
            case "t": router.push("/tasks"); return;
            case "h": router.push("/habits"); return;
            case "m": router.push("/meetings"); return;
            case "s": router.push("/school"); return;
            case "p": router.push("/projects"); return;
            case "n": router.push("/notes"); return;
            case "g": router.push("/progress"); return;
          }
        }

        // Quick add: n
        if (e.key === "n" && !gPressed) {
          e.preventDefault();
          router.push("/inbox?new=task");
          return;
        }
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [open, selectedIndex, flatCommands, executeCommand, router]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const categoryLabels: Record<string, string> = {
    navigation: "Go to",
    actions: "Actions",
    recent: "Recent",
  };

  // Keyboard shortcuts data
  const shortcutGroups = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["G", "Y"], description: "Go to Today" },
        { keys: ["G", "I"], description: "Go to Inbox" },
        { keys: ["G", "D"], description: "Go to Dashboard" },
        { keys: ["G", "T"], description: "Go to Tasks" },
        { keys: ["G", "H"], description: "Go to Habits" },
        { keys: ["G", "M"], description: "Go to Meetings" },
        { keys: ["G", "S"], description: "Go to School" },
        { keys: ["G", "P"], description: "Go to Projects" },
        { keys: ["G", "N"], description: "Go to Notes" },
      ],
    },
    {
      title: "Actions",
      shortcuts: [
        { keys: ["⌘", "K"], description: "Open command palette" },
        { keys: ["⌘", "J"], description: "Open AI assistant" },
        { keys: ["⌘", "⇧", "F"], description: "Start focus session" },
        { keys: ["N"], description: "Quick add task" },
        { keys: ["?"], description: "Show keyboard shortcuts" },
      ],
    },
    {
      title: "General",
      shortcuts: [
        { keys: ["⌘", "B"], description: "Toggle sidebar" },
        { keys: ["Esc"], description: "Close dialog / Cancel" },
        { keys: ["↑", "↓"], description: "Navigate list" },
        { keys: ["Enter"], description: "Select / Confirm" },
      ],
    },
  ];

  return (
    <>
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
            <kbd className="rounded border border-border bg-muted px-1">?</kbd>
            shortcuts
          </span>
        </div>
      </DialogContent>
    </Dialog>

    {/* Keyboard Shortcuts Help Dialog */}
    <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard size={18} />
          Keyboard Shortcuts
        </DialogTitle>
        <div className="space-y-6 mt-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
