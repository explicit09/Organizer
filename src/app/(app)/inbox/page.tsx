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
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Quick Capture</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
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
