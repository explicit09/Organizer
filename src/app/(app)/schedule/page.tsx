import { cookies } from "next/headers";
import { CalendarView } from "../../../components/CalendarView";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";

export default async function SchedulePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems(undefined, { userId });

  // Get items with dates for the calendar
  const calendarItems = items
    .filter((item) => item.startAt || item.dueAt)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startAt: item.startAt || item.dueAt,
      endAt: item.endAt,
      type: item.type,
      status: item.status,
    }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Schedule</h1>
          <p className="text-muted-foreground">View and manage your calendar</p>
        </div>
      </div>

      <CalendarView items={calendarItems} defaultView="week" />
    </div>
  );
}
