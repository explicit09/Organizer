import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import {
  listGoogleCalendarEvents,
  createGoogleCalendarEvent,
  type GoogleCalendarEvent,
} from "../../../../lib/googleCalendar";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const timeMin = url.searchParams.get("timeMin") ?? undefined;
    const timeMax = url.searchParams.get("timeMax") ?? undefined;
    const maxResults = url.searchParams.get("maxResults");

    const events = await listGoogleCalendarEvents(userId, {
      timeMin,
      timeMax,
      maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as GoogleCalendarEvent;
    const event = await createGoogleCalendarEvent(body, userId);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
