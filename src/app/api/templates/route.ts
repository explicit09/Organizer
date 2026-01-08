import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { createTemplate, listTemplates } from "../../../lib/templates";
import type { ItemType } from "../../../lib/items";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ItemType | null;

  const templates = listTemplates({ userId, type: type || undefined });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.type) {
    return NextResponse.json({ error: "Type is required" }, { status: 400 });
  }

  const template = createTemplate(
    {
      name: body.name,
      type: body.type,
      data: body.data || {},
    },
    { userId }
  );

  return NextResponse.json({ template }, { status: 201 });
}
