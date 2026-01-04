import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createAttachment, listAttachments } from "../../../lib/attachments";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const noteId = url.searchParams.get("noteId") ?? undefined;
  const itemId = url.searchParams.get("itemId") ?? undefined;
  const attachments = listAttachments({ userId, noteId, itemId });
  return NextResponse.json({ attachments }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const attachment = createAttachment(body, { userId });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create attachment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
