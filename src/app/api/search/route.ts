import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { searchItems } from "../../../lib/items";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = searchItems(query, { userId, limit: 8 });
  return NextResponse.json({ items }, { status: 200 });
}
