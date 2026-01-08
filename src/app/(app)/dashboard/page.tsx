
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
import { CheckCircle2, ListTodo, Calendar, GraduationCap, AlertCircle, Bell, Sparkles, Clock, ArrowRight } from "lucide-react";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function SectionHeader({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <Icon size={14} className="text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
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

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{greeting}</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {/* Stats Row */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Completed"
          value={String(completed)}
          delta={formatPercent(completionRate)}
          trend="up"
          helper="Completion rate"
          icon={<CheckCircle2 className="text-emerald-400" size={20} />}
          compact
        />
        <StatCard
          label="Tasks"
          value={String(tasks)}
          helper="Active"
          icon={<ListTodo className="text-purple-400" size={20} />}
          compact
        />
        <StatCard
          label="Meetings"
          value={String(meetings)}
          helper="Scheduled"
          icon={<Calendar className="text-blue-400" size={20} />}
          compact
        />
        <StatCard
          label="School"
          value={String(school)}
          helper="Assignments"
          icon={<GraduationCap className="text-amber-400" size={20} />}
          compact
        />
        <StatCard
          label="Overdue"
          value={String(overdue)}
          helper={overdue > 0 ? "Action needed" : "All clear"}
          trend={overdue > 0 ? "down" : "neutral"}
          icon={<AlertCircle className={overdue > 0 ? "text-rose-400" : "text-slate-400"} size={20} />}
          compact
        />
      </section>

      {/* Duplicate Warnings */}
      <DuplicateWarnings />

      {/* Main Content Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Next Up */}
          <div>
            <SectionHeader
              icon={ArrowRight}
              title="Next Up"
              action={
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {upcoming.length} items
                </span>
              }
            />
            <ItemTable
              items={upcoming}
              emptyLabel="No scheduled items yet"
              showHeader={false}
            />
          </div>

          {/* Suggestions */}
          <div>
            <SectionHeader icon={Sparkles} title="AI Suggestions" />
            <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4">
              <SuggestionsCard />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Time Allocation - inline, no extra wrapper */}
          <div>
            <SectionHeader icon={Clock} title="Time Allocation" />
            <TimeAllocationChart />
          </div>

          {/* Trends */}
          <div>
            <SectionHeader icon={Sparkles} title="Weekly Trends" />
            <TrendsCard />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <SectionHeader
          icon={Bell}
          title="Notifications"
          action={
            notifications.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {notifications.length} pending
              </span>
            )
          }
        />
        <div className="rounded-xl border border-white/[0.06] bg-[#09090b] overflow-hidden">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Bell size={14} className="opacity-50" />
              <span>No upcoming reminders</span>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {notifications.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    <span className="text-sm text-white truncate">{note.title}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {new Date(note.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" "}
                    {new Date(note.dueAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
