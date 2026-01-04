import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { createCheckin, listCheckins, getCheckinStreak } from "../../../lib/checkins";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const checkins = listCheckins({ userId });
  const streak = getCheckinStreak({ userId });
  return NextResponse.json({ checkins, streak }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const checkin = createCheckin(body, { userId });
    const streak = getCheckinStreak({ userId });
    return NextResponse.json({ checkin, streak }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create check-in";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
