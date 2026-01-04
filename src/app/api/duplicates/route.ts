import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { detectDuplicates } from "../../../lib/search";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const threshold = parseFloat(url.searchParams.get("threshold") ?? "0.5");

    const duplicates = detectDuplicates({ userId, threshold });

    return NextResponse.json({ duplicates }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to detect duplicates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
