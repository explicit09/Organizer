import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createNote, listNotes } from "../../../lib/notes";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notes = listNotes({ userId });
  return NextResponse.json({ notes }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const note = createNote(body, { userId });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
