import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  startFocusSession,
  endFocusSession,
  getActiveSession,
  listFocusSessions,
  getFocusStats,
  getPomodoroSettings,
} from "../../../lib/focusSessions";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "active") {
    const session = getActiveSession({ userId });
    return NextResponse.json({ session });
  }

  if (action === "stats") {
    const stats = getFocusStats({ userId });
    return NextResponse.json({ stats });
  }

  if (action === "settings") {
    const settings = getPomodoroSettings();
    return NextResponse.json({ settings });
  }

  // List sessions
  const limit = parseInt(url.searchParams.get("limit") ?? "20");
  const type = url.searchParams.get("type") as "focus" | "break" | undefined;

  const sessions = listFocusSessions({
    userId,
    limit,
    type: type || undefined,
  });
  const stats = getFocusStats({ userId });

  return NextResponse.json({ sessions, stats });
}

export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "start") {
    // Check for existing active session
    const existing = getActiveSession({ userId });
    if (existing) {
      return NextResponse.json(
        { error: "Already have an active session", session: existing },
        { status: 400 }
      );
    }

    const session = startFocusSession(
      {
        itemId: body.itemId,
        durationMinutes: body.durationMinutes,
        type: body.type,
      },
      { userId }
    );

    return NextResponse.json({ session }, { status: 201 });
  }

  if (action === "end") {
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = endFocusSession(
      body.sessionId,
      {
        completed: body.completed,
        notes: body.notes,
      },
      { userId }
    );

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const stats = getFocusStats({ userId });
    return NextResponse.json({ session, stats });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
