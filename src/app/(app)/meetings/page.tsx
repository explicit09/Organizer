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
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Meeting Studio</h2>
            <p className="mt-2 text-sm text-stone-500">
              Craft agendas, prep notes, and keep your calendar clean.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold text-stone-900">{upcoming.length}</div>
            <div className="text-xs uppercase tracking-wider text-stone-400">upcoming</div>
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
            <div className="rounded-3xl border border-amber-200/70 bg-amber-50 p-6 text-sm text-amber-900 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.4)]">
              <h3 className="text-base font-semibold">⚠️ Conflicts detected</h3>
              <div className="mt-3 grid gap-2">
                {conflicts.map((conflict, index) => (
                  <div
                    key={`${conflict.itemA.id}-${conflict.itemB.id}-${index}`}
                    className="rounded-2xl border border-amber-200/70 bg-white px-4 py-3 text-xs"
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
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <AvailableSlotsView />
          </div>

          {/* Recurring Meetings */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
            <h3 className="font-medium text-stone-900 mb-4">Recurring Meetings</h3>
            <RecurringItemsManager />
          </div>
        </div>
      </section>
    </div>
  );
}
