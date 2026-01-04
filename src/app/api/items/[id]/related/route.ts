import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../../lib/auth";
import { findRelatedItems } from "../../../../../lib/search";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "5", 10);

    const related = findRelatedItems(id, { userId, limit });

    return NextResponse.json({ related }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find related items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
