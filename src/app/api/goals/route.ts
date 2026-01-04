import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createGoal, listGoals } from "../../../lib/goals";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = listGoals({ userId });
  return NextResponse.json({ goals }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const goal = createGoal(body, { userId });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create goal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
