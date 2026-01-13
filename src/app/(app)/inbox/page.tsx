import { cookies } from "next/headers";
import { CreateItemForm } from "../../../components/CreateItemForm";
import { InboxProcessor } from "../../../components/InboxProcessor";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { ensureSampleData } from "../../../lib/seed";
import { Inbox as InboxIcon } from "lucide-react";

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
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <InboxIcon size={14} />
          <span className="text-xs uppercase tracking-widest">Inbox</span>
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
          Process Your Inbox
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Capture new items and process them with keyboard shortcuts
        </p>
      </div>

      {/* Quick Capture */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">Quick Capture</h2>
        <p className="mt-1 sm:mt-1.5 text-xs text-muted-foreground">
          Drop a thought or task here and let the organizer route it.
        </p>
        <div className="mt-3 sm:mt-4">
          <CreateItemForm />
        </div>
      </section>

      {/* GTD Processor */}
      <InboxProcessor initialItems={items} />
    </div>
  );
}
