import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { getDb } from "../../../lib/db";
import { createDependency, getBlockers, getBlocking, isBlocked } from "../../../lib/dependencies";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (itemId) {
    // Get dependencies for a specific item
    const blockers = getBlockers(itemId, { userId });
    const blocking = getBlocking(itemId, { userId });
    const blocked = isBlocked(itemId, { userId });

    return NextResponse.json({ blockers, blocking, isBlocked: blocked });
  }

  // Get all dependencies
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT d.*,
        b1.title as blocker_title, b1.status as blocker_status,
        b2.title as blocked_title, b2.status as blocked_status
       FROM dependencies d
       LEFT JOIN items b1 ON d.blocker_id = b1.id
       LEFT JOIN items b2 ON d.blocked_id = b2.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`
    )
    .all(userId) as Array<{
      id: string;
      user_id: string;
      blocker_id: string;
      blocked_id: string;
      created_at: string;
      blocker_title: string;
      blocker_status: string;
      blocked_title: string;
      blocked_status: string;
    }>;

  const dependencies = rows.map((row) => ({
    id: row.id,
    blockerId: row.blocker_id,
    blockedId: row.blocked_id,
    createdAt: row.created_at,
    blocker: {
      id: row.blocker_id,
      title: row.blocker_title,
      status: row.blocker_status,
    },
    blocked: {
      id: row.blocked_id,
      title: row.blocked_title,
      status: row.blocked_status,
    },
  }));

  return NextResponse.json({ dependencies });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.blockerId || !body.blockedId) {
    return NextResponse.json(
      { error: "blockerId and blockedId are required" },
      { status: 400 }
    );
  }

  try {
    const dependency = createDependency(
      { blockerId: body.blockerId, blockedId: body.blockedId },
      { userId }
    );
    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create dependency";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
