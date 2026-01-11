"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "./ui/Dialog";
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
  Plus,
  ArrowRight,
  Sun,
  Repeat,
  Timer,
  Inbox,
  Keyboard,
  Sparkles,
  Command,
  TrendingUp,
  BookOpen,
  CalendarDays,
  Plug,
} from "lucide-react";
import { clsx } from "clsx";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: typeof Home;
  action: () => void;
  category: "navigation" | "actions" | "create";
  shortcut?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const openFocusMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-focus-mode"));
  }, []);

  const openAIAgent = useCallback(() => {
    const event = new KeyboardEvent("keydown", {
      key: "j",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "nav-today", label: "Today", description: "Daily planning", icon: Sun, action: () => router.push("/today"), category: "navigation", shortcut: "G Y" },
    { id: "nav-inbox", label: "Inbox", description: "Unprocessed items", icon: Inbox, action: () => router.push("/inbox"), category: "navigation", shortcut: "G I" },
    { id: "nav-tasks", label: "Tasks", description: "All tasks", icon: CheckSquare, action: () => router.push("/tasks"), category: "navigation", shortcut: "G T" },
    { id: "nav-dashboard", label: "Dashboard", description: "Overview", icon: Home, action: () => router.push("/dashboard"), category: "navigation", shortcut: "G D" },
    { id: "nav-projects", label: "Projects", icon: FolderKanban, action: () => router.push("/projects"), category: "navigation", shortcut: "G P" },
    { id: "nav-meetings", label: "Meetings", icon: Calendar, action: () => router.push("/meetings"), category: "navigation", shortcut: "G M" },
    { id: "nav-schedule", label: "Schedule", icon: CalendarDays, action: () => router.push("/schedule"), category: "navigation" },
    { id: "nav-habits", label: "Habits", icon: Repeat, action: () => router.push("/habits"), category: "navigation", shortcut: "G H" },
    { id: "nav-school", label: "School", icon: GraduationCap, action: () => router.push("/school"), category: "navigation", shortcut: "G S" },
    { id: "nav-courses", label: "Courses", icon: BookOpen, action: () => router.push("/courses"), category: "navigation" },
    { id: "nav-notes", label: "Notes", icon: FileText, action: () => router.push("/notes"), category: "navigation", shortcut: "G N" },
    { id: "nav-progress", label: "Progress", icon: TrendingUp, action: () => router.push("/progress"), category: "navigation" },
    { id: "nav-review", label: "Weekly Review", icon: Target, action: () => router.push("/review"), category: "navigation" },
    { id: "nav-integrations", label: "Integrations", icon: Plug, action: () => router.push("/integrations"), category: "navigation" },
    // Create
    { id: "create-task", label: "New Task", icon: Plus, action: () => router.push("/inbox?new=task"), category: "create", shortcut: "N" },
    { id: "create-meeting", label: "New Meeting", icon: Plus, action: () => router.push("/meetings?new=true"), category: "create" },
    { id: "create-note", label: "New Note", icon: Plus, action: () => router.push("/notes?new=true"), category: "create" },
    { id: "create-project", label: "New Project", icon: Plus, action: () => router.push("/projects?new=true"), category: "create" },
    // Actions
    { id: "action-focus", label: "Start Focus Session", description: "Pomodoro timer", icon: Timer, action: openFocusMode, category: "actions", shortcut: "⌘⇧F" },
    { id: "action-ai", label: "Ask AI", description: "Natural language", icon: Sparkles, action: openAIAgent, category: "actions", shortcut: "⌘J" },
    { id: "action-shortcuts", label: "Keyboard Shortcuts", icon: Keyboard, action: () => setShowKeyboardHelp(true), category: "actions", shortcut: "?" },
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
    const order = ["create", "navigation", "actions"];
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    // Sort by order
    const sorted: Record<string, CommandItem[]> = {};
    order.forEach((key) => {
      if (groups[key]) sorted[key] = groups[key];
    });
    return sorted;
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

      // Open with Cmd+K
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

      // Quick navigation with G + key
      if (!isInput && !open) {
        if (e.key === "g" && !gPressed) {
          gPressed = true;
          gTimeout = setTimeout(() => { gPressed = false; }, 500);
          return;
        }

        if (gPressed) {
          gPressed = false;
          clearTimeout(gTimeout);
          const routes: Record<string, string> = {
            y: "/today", i: "/inbox", d: "/dashboard", t: "/tasks",
            h: "/habits", m: "/meetings", s: "/school", p: "/projects", n: "/notes",
          };
          if (routes[e.key]) {
            router.push(routes[e.key]);
            return;
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const categoryLabels: Record<string, string> = {
    create: "Create",
    navigation: "Go to",
    actions: "Actions",
  };

  const shortcutGroups = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["G", "Y"], description: "Go to Today" },
        { keys: ["G", "I"], description: "Go to Inbox" },
        { keys: ["G", "D"], description: "Go to Dashboard" },
        { keys: ["G", "T"], description: "Go to Tasks" },
        { keys: ["G", "P"], description: "Go to Projects" },
        { keys: ["G", "M"], description: "Go to Meetings" },
        { keys: ["G", "N"], description: "Go to Notes" },
      ],
    },
    {
      title: "Actions",
      shortcuts: [
        { keys: ["⌘", "K"], description: "Command palette" },
        { keys: ["⌘", "J"], description: "AI assistant" },
        { keys: ["⌘", "⇧", "F"], description: "Focus session" },
        { keys: ["N"], description: "Quick add task" },
        { keys: ["?"], description: "Keyboard shortcuts" },
      ],
    },
    {
      title: "General",
      shortcuts: [
        { keys: ["⌘", "B"], description: "Toggle sidebar" },
        { keys: ["Esc"], description: "Close / Cancel" },
        { keys: ["↑", "↓"], description: "Navigate" },
        { keys: ["Enter"], description: "Select" },
      ],
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="overflow-hidden p-0 sm:max-w-[480px] gap-0 top-[15%] translate-y-0 border-border" 
          hideCloseButton 
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogTitle>Command Palette</DialogTitle>
          </VisuallyHidden>
          
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="kbd">
              <Command size={10} />K
            </kbd>
          </div>

          {/* Commands List */}
          <div className="max-h-[360px] overflow-y-auto p-1.5">
            {Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-1">
                <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </div>
                <div className="space-y-px">
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
                          "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors",
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={15} className={clsx(
                            "shrink-0",
                            category === "create" ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                            )}
                          </div>
                        </div>
                        {cmd.shortcut ? (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {cmd.shortcut.split(" ").map((key, i) => (
                              <kbd key={i} className="kbd">
                                {key}
                              </kbd>
                            ))}
                          </div>
                        ) : isSelected ? (
                          <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                        ) : null}
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
          <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">esc</kbd>
                close
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="sm:max-w-[420px]" aria-describedby={undefined}>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard size={16} />
            Keyboard Shortcuts
          </DialogTitle>
          <div className="space-y-5 mt-4">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <div className="flex items-center gap-0.5">
                        {shortcut.keys.map((key, j) => (
                          <kbd key={j} className="kbd">
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
