import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { listDueNotifications } from "../../../lib/notifications";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const until = url.searchParams.get("until") ?? undefined;
  const notifications = listDueNotifications({ userId, until });
  return NextResponse.json({ notifications }, { status: 200 });
}
