import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildGoogleAuthUrl } from "../../../../lib/googleCalendar";

export async function GET() {
  try {
    const state = randomUUID();
    const authUrl = buildGoogleAuthUrl(state);

    // In production, store state in session for CSRF protection
    return NextResponse.json({ authUrl, state }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
