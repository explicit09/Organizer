import { cookies } from "next/headers";
import { ItemTable } from "../../../components/ItemTable";
import { StatCard } from "../../../components/StatCard";
import { TrendsCard } from "../../../components/TrendsCard";
import { SuggestionsCard } from "../../../components/SuggestionsCard";
import { TimeAllocationChart } from "../../../components/TimeAllocationChart";
import { DuplicateWarnings } from "../../../components/DuplicateWarnings";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { listDueNotifications } from "../../../lib/notifications";
import { ensureSampleData } from "../../../lib/seed";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems(undefined, { userId });
  const notifications = listDueNotifications({ userId });
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const tasks = items.filter((item) => item.type === "task").length;
  const meetings = items.filter((item) => item.type === "meeting").length;
  const school = items.filter((item) => item.type === "school").length;
  const overdue = items.filter(
    (item) => item.dueAt && new Date(item.dueAt) < new Date() && item.status !== "completed"
  ).length;

  const completionRate = total ? (completed / total) * 100 : 0;

  const upcoming = items
    .filter((item) => item.dueAt && item.status !== "completed")
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Row */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Completed"
          value={String(completed)}
          delta={formatPercent(completionRate)}
          helper="Across all categories"
        />
        <StatCard label="Tasks" value={String(tasks)} helper="Active tasks" />
        <StatCard
          label="Meetings"
          value={String(meetings)}
          helper="Upcoming calls"
        />
        <StatCard label="School" value={String(school)} helper="Assignments" />
        <StatCard
          label="Overdue"
          value={String(overdue)}
          helper={overdue > 0 ? "Needs attention" : "All caught up"}
        />
      </section>

      {/* Duplicate Warnings */}
      <DuplicateWarnings />

      {/* Main Content Grid */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ItemTable
            title="Next Up"
            items={upcoming}
            emptyLabel="No scheduled items yet"
          />

          {/* Suggestions */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Suggestions</h2>
            <SuggestionsCard />
          </div>
        </div>

        <div className="space-y-6">
          {/* Time Allocation */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Time Allocation</h2>
            <TimeAllocationChart />
          </div>

          {/* Trends */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Trends</h2>
            <TrendsCard />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Notifications</h2>
        <div className="mt-4 grid gap-2 text-sm text-stone-600">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
              No upcoming reminders.
            </div>
          ) : (
            notifications.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-xs"
              >
                <span>{note.title}</span>
                <span className="uppercase tracking-[0.3em] text-stone-400">
                  {note.dueAt.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
