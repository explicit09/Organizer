import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { getProactiveSuggestions } from "../../../lib/analytics";
import { listItems } from "../../../lib/items";
import { analyzeWorkload } from "../../../lib/schedule";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = listItems(undefined, { userId });

    const [suggestions, workloadWarnings] = await Promise.all([
      Promise.resolve(getProactiveSuggestions({ userId })),
      Promise.resolve(analyzeWorkload(items)),
    ]);

    return NextResponse.json(
      {
        suggestions,
        workloadWarnings,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
