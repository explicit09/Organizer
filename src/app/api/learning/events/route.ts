import { NextRequest, NextResponse } from "next/server";
import { emitLearningEvent } from "@/lib/ai/learning/engine";
import { getDb } from "@/lib/db";

// POST /api/learning/events - Log a learning event
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, data } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400 }
      );
    }

    // Emit the learning event
    await emitLearningEvent(userId, eventType, data || {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging learning event:", error);
    return NextResponse.json(
      { error: "Failed to log learning event" },
      { status: 500 }
    );
  }
}

// GET /api/learning/events - Get recent learning events
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("type");
    const days = parseInt(searchParams.get("days") || "7", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const db = getDb();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = `
      SELECT id, event_type, event_data, created_at
      FROM learning_events
      WHERE user_id = ? AND created_at >= ?
    `;
    const params: unknown[] = [userId, cutoff];

    if (eventType) {
      query += " AND event_type = ?";
      params.push(eventType);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const events = db.prepare(query).all(...params) as Array<{
      id: string;
      event_type: string;
      event_data: string;
      created_at: string;
    }>;

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        type: e.event_type,
        data: JSON.parse(e.event_data),
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching learning events:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning events" },
      { status: 500 }
    );
  }
}
