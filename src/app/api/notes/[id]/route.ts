import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { deleteNote, getNote, updateNote } from "../../../../lib/notes";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const note = getNote(id, { userId });
    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Note not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await req.json();
    const note = updateNote(id, body, { userId });
    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const removed = deleteNote(id, { userId });
  if (!removed) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
