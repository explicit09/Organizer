import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  generateMorningBriefing,
  generateEveningWrapup,
  generateWeeklyReview,
  getCheckinConfigs,
  updateCheckinConfig,
} from "@/lib/ai/proactive/checkins";
import type { CheckinConfig, CheckinType } from "@/lib/ai/proactive/types";

// GET: Get check-in content or configurations
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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as CheckinType | null;
  const configOnly = searchParams.get("configOnly") === "true";

  try {
    // If just getting configs
    if (configOnly) {
      const configs = await getCheckinConfigs(session.user_id);
      return NextResponse.json({ configs });
    }

    // Generate check-in content
    if (!type) {
      return NextResponse.json({ error: "Type parameter required" }, { status: 400 });
    }

    let content;
    switch (type) {
      case "morning_briefing":
        content = await generateMorningBriefing(session.user_id);
        break;
      case "evening_wrapup":
        content = await generateEveningWrapup(session.user_id);
        break;
      case "weekly_review":
        content = await generateWeeklyReview(session.user_id);
        break;
      default:
        return NextResponse.json({ error: "Invalid check-in type" }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error generating check-in:", error);
    return NextResponse.json({ error: "Failed to generate check-in" }, { status: 500 });
  }
}

// PATCH: Update check-in configuration
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
    const config = (await request.json()) as CheckinConfig;
    await updateCheckinConfig(session.user_id, config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating check-in config:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
