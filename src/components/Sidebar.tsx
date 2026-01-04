"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-stone-200/80 bg-white/70 px-6 py-8 backdrop-blur md:flex">
      <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-[0_10px_30px_-24px_rgba(10,10,10,0.4)]">
        <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
          Life Organizer
        </div>
        <div className="mt-2 text-2xl font-semibold text-stone-900">
          Organizer
        </div>
        <p className="mt-3 text-sm text-stone-500">
          Command center for tasks, meetings, and school work.
        </p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-stone-900 text-white shadow-[0_12px_30px_-24px_rgba(20,20,20,0.6)]"
                  : "text-stone-600 hover:bg-white hover:text-stone-900"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-xs uppercase tracking-[0.35em] ${
                  active ? "text-stone-200" : "text-stone-400"
                }`}
              >
                {item.label.slice(0, 2)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-stone-200/80 bg-gradient-to-br from-amber-100/80 to-white p-4 text-xs text-stone-600">
        Weekly focus: build clarity.
      </div>

      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        }}
        className="mt-4 rounded-2xl border border-stone-200/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-500"
      >
        Sign out
      </button>
    </aside>
  );
}
