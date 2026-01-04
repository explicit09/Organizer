import { NextResponse } from "next/server";
import { getRequestUserId, getUserById } from "../../../../lib/auth";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = getUserById(userId);
  return NextResponse.json({ user }, { status: 200 });
}
