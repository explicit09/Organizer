import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import {
  getCycle,
  getCycleWithProgress,
  updateCycle,
  deleteCycle,
  addItemToCycle,
  removeItemFromCycle,
} from "../../../../lib/cycles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const withProgress = searchParams.get("withProgress") === "true";

  const cycle = withProgress
    ? getCycleWithProgress(id, { userId })
    : getCycle(id, { userId });

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  return NextResponse.json({ cycle });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const cycle = updateCycle(
    id,
    {
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
    },
    { userId }
  );

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  return NextResponse.json({ cycle });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteCycle(id, { userId });

  if (!deleted) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cycleId } = await params;
  const body = await request.json();
  const { action, itemId } = body;

  if (action === "add" && itemId) {
    addItemToCycle(itemId, cycleId);
    return NextResponse.json({ success: true, message: "Item added to cycle" });
  }

  if (action === "remove" && itemId) {
    removeItemFromCycle(itemId);
    return NextResponse.json({ success: true, message: "Item removed from cycle" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
