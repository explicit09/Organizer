import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { executeAction } from "@/lib/ai/proactive/auto-actions";

// POST: Execute an action from a notification suggestion
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as {
    user_id: string;
  } | undefined;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, params = {} } = body;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    const result = await executeAction(action, params, session.user_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error executing action:", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
