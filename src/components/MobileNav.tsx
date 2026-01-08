"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/school", label: "School", icon: GraduationCap },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/integrations", label: "Connect", icon: Plug },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 flex w-full items-center gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-[#09090b]/95 px-3 py-2.5 backdrop-blur-xl md:hidden no-scrollbar">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap transition-all duration-200 text-xs font-medium",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
            )}
          >
            <Icon size={14} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
