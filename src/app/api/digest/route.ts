import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  generateWeeklyDigest,
  generateDigestHtml,
  generateDigestText,
  sendWeeklyDigest,
  sendAllDigests,
} from "../../../lib/emailDigest";

// GET /api/digest - Preview or get digest
export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  try {
    const data = generateWeeklyDigest({ userId });

    if (format === "html") {
      const html = generateDigestHtml(data);
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (format === "text") {
      const text = generateDigestText(data);
      return new Response(text, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json({ digest: data });
  } catch (error) {
    console.error("Digest error:", error);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}

// POST /api/digest - Send digest
export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // Send to specific user
    if (action === "send") {
      const result = await sendWeeklyDigest({ userId });
      return NextResponse.json(result);
    }

    // Send to all users (admin only, for cron job)
    if (action === "send-all") {
      // TODO: Add admin check
      const result = await sendAllDigests();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Digest send error:", error);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}
