import { NextResponse } from "next/server";
import { generateAiPlan } from "../../../../lib/aiProvider";
import { getRequestUserId } from "../../../../lib/auth";

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
    return NextResponse.json({ items: plan.items, rationale: plan.rationale }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to preview input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
