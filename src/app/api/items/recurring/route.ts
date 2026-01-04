import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { getRecurringTemplates, generateRecurringInstances } from "../../../../lib/items";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = getRecurringTemplates({ userId });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get recurring templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, until } = body as { itemId: string; until?: string };

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const instances = generateRecurringInstances(itemId, {
      userId,
      untilDate: until ? new Date(until) : undefined,
    });

    return NextResponse.json({ instances, count: instances.length }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate instances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
