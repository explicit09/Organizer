import { cookies } from "next/headers";
import { CreateItemForm } from "../../../components/CreateItemForm";
import { ItemTable } from "../../../components/ItemTable";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";

export default async function InboxPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems(undefined, { userId });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Quick Capture</h2>
        <p className="mt-2 text-sm text-stone-500">
          Drop a thought or task here and let the organizer route it.
        </p>
        <div className="mt-4">
          <CreateItemForm />
        </div>
      </section>

      <ItemTable
        title="Inbox"
        items={items}
        emptyLabel="Nothing in your inbox yet."
      />
    </div>
  );
}
