import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../../../lib/auth";
import { updateItem, deleteItem, getItem } from "../../../../../../lib/items";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtaskId } = await params;
  const body = await request.json();

  // Check if subtask exists
  const existing = getItem(subtaskId, { userId });
  if (!existing) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updates.title = body.title;
  }

  if (body.status !== undefined) {
    updates.status = body.status;
  }

  if (body.completed !== undefined) {
    updates.status = body.completed ? "completed" : "not_started";
  }

  const subtask = updateItem(subtaskId, updates, { userId });

  return NextResponse.json({ subtask });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtaskId } = await params;
  const deleted = deleteItem(subtaskId, { userId });

  if (!deleted) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
