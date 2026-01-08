import { cookies } from "next/headers";
import { CheckinForm } from "../../../components/CheckinForm";
import { GoalForm } from "../../../components/GoalForm";
import { StatCard } from "../../../components/StatCard";
import { getCompletionSeries } from "../../../lib/analytics";
import { getSessionUserId } from "../../../lib/auth";
import { listCheckins, getCheckinStreak } from "../../../lib/checkins";
import { listGoals } from "../../../lib/goals";
import { listItems } from "../../../lib/items";
import { getWeeklyReport } from "../../../lib/reports";
import { ensureSampleData } from "../../../lib/seed";

export default async function ProgressPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems(undefined, { userId });
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const active = items.filter((item) => item.status === "in_progress").length;
  const blocked = items.filter((item) => item.status === "blocked").length;

  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const series = getCompletionSeries(7, undefined, { userId });
  const maxCount = Math.max(1, ...series.map((point) => point.count));
  const checkins = listCheckins({ userId, limit: 7 });
  const streak = getCheckinStreak({ userId });
  const goals = listGoals({ userId });
  const report = getWeeklyReport({ userId });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Progress Pulse</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Track how much you are finishing and where you are stuck.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed" value={String(completed)} />
        <StatCard label="Active" value={String(active)} />
        <StatCard label="Blocked" value={String(blocked)} />
        <StatCard label="Completion" value={`${completionRate}%`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <CheckinForm />
        <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
          <h3 className="text-sm font-semibold text-white">
            Streak & recent check-ins
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Current streak: {streak} day{streak === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid gap-2">
            {checkins.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-muted-foreground">
                No check-ins yet.
              </div>
            ) : (
              checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5 text-xs"
                >
                  <span className="text-white">{checkin.date}</span>
                  <span className="text-muted-foreground">
                    Mood {checkin.mood ?? "-"} · Focus {checkin.focus ?? "-"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GoalForm />
        <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
          <h3 className="text-sm font-semibold text-white">Goals</h3>
          <div className="mt-4 grid gap-2">
            {goals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-muted-foreground">
                No goals yet.
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5"
                >
                  <div className="text-sm font-medium text-white">
                    {goal.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {goal.current}
                    {goal.unit ? ` ${goal.unit}` : ""} /{" "}
                    {goal.target ?? "?"} {goal.unit ?? ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h3 className="text-sm font-semibold text-white">Weekly Summary</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Completions logged over the last 7 days.
        </p>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5 text-muted-foreground">
            Created: <span className="text-white font-medium">{report.createdCount}</span>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5 text-muted-foreground">
            Updated: <span className="text-white font-medium">{report.updatedCount}</span>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2.5 text-muted-foreground">
            Completed: <span className="text-white font-medium">{report.completedCount}</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-7 items-end gap-3">
          {series.map((point) => (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end rounded-full bg-white/[0.06]">
                <div
                  className="w-full rounded-full bg-primary"
                  style={{ height: `${(point.count / maxCount) * 100}%` }}
                />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {point.date.slice(5)}
              </div>
              <div className="text-xs text-white">{point.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
