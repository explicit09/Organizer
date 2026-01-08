import { cookies } from "next/headers";
import { TasksPageClient } from "../../../components/TasksPageClient";
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

  return <TasksPageClient items={items} suggestions={suggestions} />;
}
