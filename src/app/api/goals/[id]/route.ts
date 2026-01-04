import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { getGoal, updateGoal } from "../../../../lib/goals";

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
    const goal = getGoal(id, { userId });
    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Goal not found";
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
    const goal = updateGoal(id, body, { userId });
    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
