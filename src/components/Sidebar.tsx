"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Calendar,
  CalendarDays,
  GraduationCap,
  BookOpen,
  Briefcase,
  TrendingUp,
  FileText,
  Plug,
  LogOut,
  Search,
  ChevronLeft,
  PanelLeft,
  Sun,
  Target,
  Repeat,
  Settings,
  Command,
  Sparkles,
  Zap,
  Brain,
  Heart,
} from "lucide-react";
import { clsx } from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// Grouped navigation - Linear-style organization
const navGroups: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
      { href: "/today", label: "Today", icon: Sun },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/ai", label: "AI Assistant", icon: Sparkles },
    ],
  },
  {
    title: "Organize",
    items: [
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/meetings", label: "Meetings", icon: Calendar },
      { href: "/schedule", label: "Schedule", icon: CalendarDays },
      { href: "/habits", label: "Habits", icon: Repeat },
      { href: "/automations", label: "Automations", icon: Zap },
    ],
  },
  {
    title: "Learn",
    items: [
      { href: "/school", label: "School", icon: GraduationCap },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/notes", label: "Notes", icon: FileText },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/progress", label: "Progress", icon: TrendingUp },
      { href: "/wellbeing", label: "Wellbeing", icon: Heart },
      { href: "/insights", label: "Learning", icon: Brain },
      { href: "/review", label: "Review", icon: Target },
    ],
  },
];

const bottomItems: NavItem[] = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Fetch user info and badges
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser({ name: data.user.name || "User", email: data.user.email || "" });
        }
      })
      .catch(console.error);

    fetch("/api/items?status=not_started")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setBadges({ inbox: data.items.length });
        }
      })
      .catch(console.error);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      setCollapsed((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function openCommandPalette() {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={clsx(
        "hidden h-screen flex-col border-r border-sidebar-border md:flex",
        "sticky top-0 shrink-0",
        "transition-[width] duration-200 ease-out",
        "bg-gradient-to-b from-sidebar-background to-[hsl(228_14%_4%)]",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Header */}
      <div
        className={clsx(
          "relative flex items-center h-14 px-3 border-b border-sidebar-border/50",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(280_60%_55%)] text-white text-xs font-bold shadow-lg shadow-primary/20">
              O
            </div>
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Organizer
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-md",
            "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
            "transition-all duration-200",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
        >
          {collapsed ? <PanelLeft size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Command Palette Trigger */}
      <div className={clsx("px-2 py-2", collapsed && "px-1.5")}>
        <button
          onClick={openCommandPalette}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg",
            "glass-subtle border border-sidebar-border/50",
            "text-sm text-sidebar-muted hover:text-sidebar-foreground",
            "hover:border-primary/30 hover:shadow-sm hover:shadow-primary/10",
            "transition-all duration-200",
            collapsed ? "h-9 justify-center" : "h-9 px-3"
          )}
        >
          {collapsed ? (
            <Search size={14} />
          ) : (
            <>
              <Search size={14} />
              <span className="flex-1 text-left text-xs">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-sidebar-muted px-1.5 py-0.5 rounded bg-sidebar-accent/50">
                <Command size={10} />K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {/* Section Header */}
            {!collapsed && (
              <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
                {group.title}
              </div>
            )}
            
            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium",
                      "transition-colors duration-150",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator */}
                    <span
                      className={clsx(
                        "absolute left-0 w-0.5 h-4 rounded-r-full bg-primary transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon
                      size={16}
                      className={clsx(
                        "shrink-0 transition-colors",
                        active ? "text-primary" : ""
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badgeKey && badges[item.badgeKey] > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded text-[10px] font-medium bg-primary/15 text-primary px-1">
                            {badges[item.badgeKey] > 99 ? "99+" : badges[item.badgeKey]}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border px-2 py-2">
        {bottomItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium",
                "transition-colors duration-150",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="border-t border-sidebar-border/50 p-2">
        <div
          className={clsx(
            "group relative flex items-center gap-2.5 rounded-lg p-2",
            "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-transparent",
            "cursor-pointer transition-all duration-200",
            collapsed && "justify-center"
          )}
        >
          {/* Avatar with gradient */}
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(280_60%_55%/0.2)] text-primary text-xs font-bold border border-primary/20">
              {user?.name ? getInitials(user.name) : "U"}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[hsl(142_65%_48%)] border-2 border-sidebar-background" />
          </div>
          
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user?.name || "User"}
                </div>
                <div className="text-[10px] text-sidebar-muted truncate">
                  {user?.email || ""}
                </div>
              </div>
              
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                  router.refresh();
                }}
                className={clsx(
                  "p-1.5 rounded-md text-sidebar-muted",
                  "hover:text-destructive hover:bg-destructive/10",
                  "transition-all duration-200",
                  "opacity-0 group-hover:opacity-100"
                )}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
