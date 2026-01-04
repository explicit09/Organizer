import { cookies } from "next/headers";
import { ItemTable } from "../../../components/ItemTable";
import { KanbanBoard } from "../../../components/KanbanBoard";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";
import { suggestTaskBlocks } from "../../../lib/schedule";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems({ type: "task" }, { userId });
  const meetings = listItems({ type: "meeting" }, { userId });
  const suggestions = suggestTaskBlocks(items, meetings).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Task Control</h2>
        <p className="mt-2 text-sm text-stone-500">
          Break work into steps, set priorities, and track momentum.
        </p>
      </section>
      {suggestions.length > 0 ? (
        <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 text-sm text-stone-700 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
          <h3 className="text-base font-semibold text-stone-900">
            Suggested schedule
          </h3>
          <div className="mt-4 grid gap-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.itemId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-xs"
              >
                <span>{suggestion.title}</span>
                <span className="uppercase tracking-[0.3em] text-stone-400">
                  {suggestion.suggestedStart.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <KanbanBoard items={items} />
      <ItemTable title="Tasks" items={items} emptyLabel="No tasks yet." />
    </div>
  );
}
