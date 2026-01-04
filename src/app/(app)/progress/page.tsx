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
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Progress Pulse</h2>
        <p className="mt-2 text-sm text-stone-500">
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
        <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
          <h3 className="text-base font-semibold text-stone-900">
            Streak & recent check-ins
          </h3>
          <p className="mt-2 text-sm text-stone-500">
            Current streak: {streak} day{streak === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid gap-3">
            {checkins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
                No check-ins yet.
              </div>
            ) : (
              checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-xs text-stone-600"
                >
                  <span>{checkin.date}</span>
                  <span>
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
        <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
          <h3 className="text-base font-semibold text-stone-900">Goals</h3>
          <div className="mt-4 grid gap-3">
            {goals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
                No goals yet.
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3"
                >
                  <div className="text-sm font-semibold text-stone-800">
                    {goal.title}
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
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

      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h3 className="text-base font-semibold text-stone-900">
          Weekly Summary
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Completions logged over the last 7 days.
        </p>
        <div className="mt-4 grid gap-3 text-xs text-stone-600 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3">
            Created: {report.createdCount}
          </div>
          <div className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3">
            Updated: {report.updatedCount}
          </div>
          <div className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3">
            Completed: {report.completedCount}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-7 items-end gap-3">
          {series.map((point) => (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end rounded-full bg-stone-100">
                <div
                  className="w-full rounded-full bg-stone-900"
                  style={{ height: `${(point.count / maxCount) * 100}%` }}
                />
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
                {point.date.slice(5)}
              </div>
              <div className="text-xs text-stone-500">{point.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
