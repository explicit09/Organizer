import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { listAllNotifications, markAllNotificationsDelivered } from "../../../lib/notifications";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notifications = listAllNotifications({ userId });
  return NextResponse.json({ notifications }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Mark all as read
    if (body.action === "markAllRead") {
      markAllNotificationsDelivered({ userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
