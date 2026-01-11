import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import { webSearch, searchByCategory, type SearchOptions } from "../../../../lib/web-search";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, type, location, remote, limit } = body as SearchOptions;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results = await webSearch({
      query,
      type,
      location,
      remote,
      limit: limit || 10,
    });

    return NextResponse.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error("Web search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as "internships" | "companies" | "resources" | null;
    const location = searchParams.get("location") || undefined;
    const remote = searchParams.get("remote") === "true";

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const results = await searchByCategory(category, {
      location,
      remote,
    });

    return NextResponse.json({
      results,
      category,
      count: results.length,
    });
  } catch (error) {
    console.error("Category search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
