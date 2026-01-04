import { NextResponse } from "next/server";
import { deleteItem, getItem, updateItem } from "../../../../lib/items";
import { getRequestUserId } from "../../../../lib/auth";

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
    const item = getItem(id, { userId });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Item not found";
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
    const item = updateItem(id, body, { userId });
    return NextResponse.json({ item }, { status: 200 });
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
  const removed = deleteItem(id, { userId });

  if (!removed) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
