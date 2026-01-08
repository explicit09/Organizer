import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { createLabel, listLabels } from "../../../lib/labels";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labels = listLabels({ userId });
  return NextResponse.json({ labels });
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

  if (!body.color || typeof body.color !== "string") {
    return NextResponse.json({ error: "Color is required" }, { status: 400 });
  }

  const label = createLabel({ name: body.name, color: body.color }, { userId });

  return NextResponse.json({ label }, { status: 201 });
}
