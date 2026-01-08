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
  User,
  Sun,
  Target,
  Repeat,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar";
import { clsx } from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: string;
};

const navItems: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/school", label: "School", icon: GraduationCap },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/review", label: "Review", icon: Target },
  { href: "/notes", label: "Notes", icon: FileText },
];

const bottomItems = [
  { href: "/integrations", label: "Integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Fetch user info and badges
  useEffect(() => {
    // Get user info
    fetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUser({ name: data.user.name || "User", email: data.user.email || "" });
        }
      })
      .catch(console.error);

    // Get inbox count (not_started items)
    fetch("/api/items?status=not_started")
      .then((res) => res.ok ? res.json() : null)
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
    // Dispatch Cmd+K to trigger CommandPalette
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  return (
    <aside
      className={clsx(
        "hidden h-screen flex-col bg-sidebar-background md:flex transition-all duration-200 ease-in-out",
        collapsed ? "w-[var(--sidebar-width-icon)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Header */}
      <div className={clsx(
        "flex items-center h-14 px-3 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground leading-none">Organizer</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Workspace</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand sidebar (Cmd+B)" : "Collapse sidebar (Cmd+B)"}
        >
          {collapsed ? <PanelLeft size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button
            onClick={openCommandPalette}
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Search size={16} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-sidebar-border bg-sidebar-background px-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={18}
                  className={clsx(
                    "shrink-0",
                    active && "text-sidebar-primary"
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey && badges[item.badgeKey] > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                        {badges[item.badgeKey] > 99 ? "99+" : badges[item.badgeKey]}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border px-3 py-2 space-y-1">
        {bottomItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

      </div>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={clsx(
            "flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent cursor-pointer transition-colors",
            collapsed && "justify-center p-1"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              <User size={14} />
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "User"}</span>
                <span className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</span>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                  router.refresh();
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
