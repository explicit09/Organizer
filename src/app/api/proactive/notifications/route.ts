import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { proactiveEngine } from "@/lib/ai/proactive/engine";
import { notificationManager } from "@/lib/ai/proactive/notifications";

// GET: Fetch pending notifications for the current user
export async function GET(request: Request) {
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

  try {
    // Get pending in-app notifications
    const notifications = await notificationManager.getPendingInApp(session.user_id);

    // Also get unread proactive messages
    const proactiveMessages = await proactiveEngine.getPendingNotifications(session.user_id);

    return NextResponse.json({
      notifications,
      proactiveMessages,
      count: notifications.length + proactiveMessages.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST: Trigger a check for new proactive messages
export async function POST(request: Request) {
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

  try {
    // Trigger a proactive check
    const messages = await proactiveEngine.checkNow(session.user_id);

    return NextResponse.json({
      triggered: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Error triggering proactive check:", error);
    return NextResponse.json({ error: "Failed to trigger check" }, { status: 500 });
  }
}
