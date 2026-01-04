import { cookies } from "next/headers";
import { ItemTable } from "../../../components/ItemTable";
import { KanbanBoard } from "../../../components/KanbanBoard";
import { GradesTable } from "../../../components/GradesTable";
import { StudyPlanView } from "../../../components/StudyPlanView";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";

export default async function SchoolPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems({ type: "school" }, { userId });

  const upcoming = items
    .filter((item) => item.dueAt && item.status !== "completed")
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  const completed = items.filter((item) => item.status === "completed").length;
  const total = items.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Stats */}
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">School Command</h2>
            <p className="mt-2 text-sm text-stone-500">
              Track assignments, exams, and study sessions by course.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold text-stone-900">{completionRate}%</div>
            <div className="text-xs uppercase tracking-wider text-stone-400">
              {completed}/{total} completed
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Kanban Board */}
          <KanbanBoard items={items} />

          {/* Upcoming Assignments */}
          <ItemTable
            title="Upcoming Assignments"
            items={upcoming.slice(0, 10)}
            emptyLabel="No upcoming assignments."
          />
        </div>

        <div className="space-y-6">
          {/* Grades by Course */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Grades by Course</h3>
            <GradesTable />
          </div>

          {/* Study Plan */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <StudyPlanView />
          </div>
        </div>
      </section>
    </div>
  );
}
