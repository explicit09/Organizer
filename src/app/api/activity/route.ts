import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { listActivity } from "../../../lib/activity";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

  const activities = listActivity({ userId, itemId, limit });

  return NextResponse.json({ activities });
}
