import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { WeeklyReviewClient } from "../../../components/WeeklyReviewClient";

export default async function ReviewPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  return <WeeklyReviewClient />;
}
