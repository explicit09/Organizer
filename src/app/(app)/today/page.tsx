import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { TodayPageClient } from "../../../components/TodayPageClient";

export default async function TodayPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  return <TodayPageClient />;
}
