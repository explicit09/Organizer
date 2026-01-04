import { NextResponse } from "next/server";
import {
  buildOutlookEventPayload,
  getValidOutlookAccessToken,
} from "../../../../lib/outlook";
import { getRequestUserId } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const start = typeof body?.start === "string" ? body.start.trim() : "";
    const end = typeof body?.end === "string" ? body.end.trim() : "";
    const attendees = Array.isArray(body?.attendees)
      ? body.attendees.filter((entry: unknown) => typeof entry === "string")
      : [];
    const timeZone = typeof body?.timeZone === "string" ? body.timeZone : "UTC";

    if (!subject || !start || !end) {
      return NextResponse.json(
        { error: "subject, start, and end are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidOutlookAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Outlook is not connected" },
        { status: 400 }
      );
    }

    const payload = buildOutlookEventPayload({
      subject,
      start,
      end,
      attendees,
      timeZone,
    });

    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Outlook event create failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Outlook event create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
