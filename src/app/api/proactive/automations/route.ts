import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  getUserRules,
  createRule,
  updateRule,
  deleteRule,
} from "@/lib/ai/proactive/auto-actions";
import type { AutomationRule } from "@/lib/ai/proactive/types";

// GET: Get user's automation rules
export async function GET(request: Request) {
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
    const rules = await getUserRules(session.user_id);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

// POST: Create a new automation rule
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
    const { name, enabled, trigger, actions } = body;

    if (!name || !trigger || !actions) {
      return NextResponse.json(
        { error: "Name, trigger, and actions are required" },
        { status: 400 }
      );
    }

    const id = await createRule(session.user_id, {
      name,
      enabled: enabled !== false,
      trigger,
      actions,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

// PATCH: Update an automation rule
export async function PATCH(request: Request) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    // Verify ownership
    const rule = db
      .prepare("SELECT user_id FROM automation_rules WHERE id = ?")
      .get(id) as { user_id: string } | undefined;

    if (!rule || rule.user_id !== session.user_id) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await updateRule(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

// DELETE: Delete an automation rule
export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
  }

  try {
    // Verify ownership
    const rule = db
      .prepare("SELECT user_id FROM automation_rules WHERE id = ?")
      .get(id) as { user_id: string } | undefined;

    if (!rule || rule.user_id !== session.user_id) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await deleteRule(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
