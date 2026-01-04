"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/tasks", label: "Tasks" },
  { href: "/meetings", label: "Meetings" },
  { href: "/school", label: "School" },
  { href: "/courses", label: "Courses" },
  { href: "/projects", label: "Projects" },
  { href: "/progress", label: "Progress" },
  { href: "/notes", label: "Notes" },
  { href: "/integrations", label: "Integrations" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 flex w-full items-center gap-2 overflow-x-auto border border-stone-200/70 bg-white/90 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-500 shadow-[0_10px_24px_-22px_rgba(20,20,20,0.4)] backdrop-blur md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-2 ${
              active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
