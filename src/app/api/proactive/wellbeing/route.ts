import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  assessWellbeing,
  getFocusStats,
  isDoNotDisturbActive,
  setWorkHourProtection,
  getWorkHourProtection,
  type WorkHourConfig,
} from "@/lib/ai/proactive/wellbeing";
import { randomUUID } from "crypto";

// GET: Get wellbeing assessment or focus stats
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
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "assessment": {
        const assessment = await assessWellbeing(session.user_id);

        // Store assessment
        db.prepare(
          `INSERT INTO wellbeing_assessments
           (id, user_id, indicators_json, warnings_json, overall_status, suggestions_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          randomUUID(),
          session.user_id,
          JSON.stringify(assessment.indicators),
          JSON.stringify(assessment.warnings),
          assessment.overallStatus,
          JSON.stringify(assessment.suggestions),
          new Date().toISOString()
        );

        return NextResponse.json({ assessment });
      }

      case "focus": {
        const stats = await getFocusStats(session.user_id);
        const dnd = await isDoNotDisturbActive(session.user_id);
        return NextResponse.json({ stats, doNotDisturb: dnd });
      }

      case "work_hours": {
        const config = await getWorkHourProtection(session.user_id);
        return NextResponse.json({ config });
      }

      default: {
        // Return combined overview
        const assessment = await assessWellbeing(session.user_id);
        const focusStats = await getFocusStats(session.user_id);
        const doNotDisturb = await isDoNotDisturbActive(session.user_id);
        const workHourConfig = await getWorkHourProtection(session.user_id);

        return NextResponse.json({
          assessment,
          focusStats,
          doNotDisturb,
          workHourConfig,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching wellbeing data:", error);
    return NextResponse.json({ error: "Failed to fetch wellbeing data" }, { status: 500 });
  }
}

// POST: Configure wellbeing settings
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
    const body = await request.json();
    const { type, config } = body;

    switch (type) {
      case "work_hours":
        await setWorkHourProtection(session.user_id, config as WorkHourConfig);
        return NextResponse.json({ success: true });

      case "break":
        // Start a break
        const breakId = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO breaks (id, user_id, started_at, planned_duration)
           VALUES (?, ?, ?, ?)`
        ).run(breakId, session.user_id, now, config.duration || 15);
        return NextResponse.json({ success: true, breakId });

      case "end_break":
        db.prepare(
          `UPDATE breaks SET ended_at = ? WHERE id = ? AND user_id = ?`
        ).run(new Date().toISOString(), config.breakId, session.user_id);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error configuring wellbeing:", error);
    return NextResponse.json({ error: "Failed to configure wellbeing" }, { status: 500 });
  }
}
