import { NextResponse } from "next/server";
import { generateAiPlan } from "../../../lib/aiProvider";
import { createItem, listItems } from "../../../lib/items";
import { getRequestUserId } from "../../../lib/auth";

export async function POST(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const plan = await generateAiPlan(text);
    const items = [];
    const duplicates = [];
    const existing = listItems(undefined, { userId });

    for (const entry of plan.items) {
      const match = existing.find(
        (item) => item.title.toLowerCase() === entry.title.toLowerCase()
      );
      if (match) {
        duplicates.push(match);
        continue;
      }
      const parent = createItem(
        {
          type: entry.type,
          title: entry.title,
          priority: entry.priority,
        },
        { userId }
      );
      items.push(parent);

      if (entry.subtasks && entry.subtasks.length > 0) {
        entry.subtasks.forEach((title) => {
          items.push(
            createItem(
              {
                type: entry.type,
                title,
                parentId: parent.id,
                priority: entry.priority,
              },
              { userId }
            )
          );
        });
      }
    }

    return NextResponse.json(
      { items, duplicates, rationale: plan.rationale },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to organize input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
