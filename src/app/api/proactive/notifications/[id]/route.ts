import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { proactiveEngine } from "@/lib/ai/proactive/engine";
import { notificationManager } from "@/lib/ai/proactive/notifications";

// PATCH: Update notification status (mark as read, actioned, dismissed)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as {
    user_id: string;
  } | undefined;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "read":
        await proactiveEngine.markNotificationRead(id);
        break;
      case "dismiss":
        await proactiveEngine.dismissNotification(id);
        await notificationManager.dismiss(id);
        break;
      case "action":
        const { actionTaken } = body;
        await proactiveEngine.markNotificationActioned(id, actionTaken);
        break;
      case "shown":
        await notificationManager.markShown(id);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
