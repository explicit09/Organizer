"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sun, 
  Inbox, 
  CheckSquare, 
  Calendar, 
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Bottom Tab Bar - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors min-w-[56px]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <Icon 
                  size={20} 
                  className={clsx(
                    "transition-transform",
                    active && "scale-110"
                  )} 
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button - Mobile only */}
      <Link
        href="/inbox?new=task"
        className="md:hidden fixed bottom-20 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}

// Mobile drawer menu for additional navigation
export function MobileMenu({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const menuItems = [
    { href: "/today", label: "Today", icon: Sun },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 md:hidden animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            O
          </div>
          <span className="text-sm font-semibold text-foreground">
            Organizer
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-2">
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
