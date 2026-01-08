import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { createCycle, listCycles, getActiveCycle } from "../../../lib/cycles";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  if (activeOnly) {
    const cycle = getActiveCycle({ userId });
    return NextResponse.json({ cycle });
  }

  const cycles = listCycles({ userId });
  return NextResponse.json({ cycles });
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

  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 });
  }

  const cycle = createCycle(
    {
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
    },
    { userId }
  );

  return NextResponse.json({ cycle }, { status: 201 });
}
