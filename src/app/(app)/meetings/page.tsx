import { cookies } from "next/headers";
import { ItemTable } from "../../../components/ItemTable";
import { MeetingList } from "../../../components/MeetingList";
import { OutlookEventForm } from "../../../components/OutlookEventForm";
import { AvailableSlotsView } from "../../../components/AvailableSlotsView";
import { RecurringItemsManager } from "../../../components/RecurringItemsManager";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";
import { detectConflicts } from "../../../lib/schedule";

export default async function MeetingsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems({ type: "meeting" }, { userId });
  const conflicts = detectConflicts(items);

  const upcoming = items
    .filter((item) => item.startAt && new Date(item.startAt) >= new Date())
    .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Meeting Studio</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Craft agendas, prep notes, and keep your calendar clean.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{upcoming.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">upcoming</div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <OutlookEventForm />
          <MeetingList items={items} />

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
              <h3 className="text-sm font-semibold text-amber-200">⚠️ Conflicts detected</h3>
              <div className="mt-3 grid gap-1.5">
                {conflicts.map((conflict, index) => (
                  <div
                    key={`${conflict.itemA.id}-${conflict.itemB.id}-${index}`}
                    className="rounded-lg border border-amber-500/20 bg-[#09090b] px-3 py-2.5 text-xs text-amber-200"
                  >
                    {conflict.itemA.title} overlaps with {conflict.itemB.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ItemTable
            title="All Meetings"
            items={items}
            emptyLabel="No meetings scheduled."
          />
        </div>

        <div className="space-y-6">
          {/* Available Slots */}
          <AvailableSlotsView />

          {/* Recurring Meetings */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Recurring Meetings</h3>
            <RecurringItemsManager />
          </div>
        </div>
      </section>
    </div>
  );
}
