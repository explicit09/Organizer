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
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">School Command</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Track assignments, exams, and study sessions by course.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{completionRate}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
          <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Grades by Course</h3>
            <GradesTable />
          </div>

          {/* Study Plan */}
          <StudyPlanView />
        </div>
      </section>
    </div>
  );
}
