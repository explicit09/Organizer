import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { proactiveEngine } from "@/lib/ai/proactive/engine";
import type { TriggerType, NotificationPreferences } from "@/lib/ai/proactive/types";

// GET: Get user's trigger preferences
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
    // Get available triggers
    const availableTriggers = proactiveEngine.getAvailableTriggers();

    // Get user's preferences
    const row = db
      .prepare(
        `SELECT disabled_triggers_json, custom_cooldowns_json, notification_prefs_json
         FROM user_trigger_preferences
         WHERE user_id = ?`
      )
      .get(session.user_id) as {
      disabled_triggers_json: string | null;
      custom_cooldowns_json: string | null;
      notification_prefs_json: string | null;
    } | undefined;

    const disabledTriggers = row?.disabled_triggers_json
      ? JSON.parse(row.disabled_triggers_json)
      : [];
    const customCooldowns = row?.custom_cooldowns_json
      ? JSON.parse(row.custom_cooldowns_json)
      : {};
    const notificationPrefs = row?.notification_prefs_json
      ? JSON.parse(row.notification_prefs_json)
      : null;

    return NextResponse.json({
      availableTriggers,
      disabledTriggers,
      customCooldowns,
      notificationPrefs,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PATCH: Update trigger preferences
export async function PATCH(request: Request) {
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
    const body = await request.json();
    const { triggerType, enabled, notificationPrefs } = body;

    // Enable/disable specific trigger
    if (triggerType !== undefined && enabled !== undefined) {
      await proactiveEngine.setTriggerEnabled(
        session.user_id,
        triggerType as TriggerType,
        enabled
      );
    }

    // Update notification preferences
    if (notificationPrefs) {
      await proactiveEngine.updateNotificationPreferences(
        session.user_id,
        notificationPrefs as Partial<NotificationPreferences>
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
