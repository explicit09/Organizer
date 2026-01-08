import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  getDailyPlan,
  createOrUpdateDailyPlan,
  generateDailyBriefing,
  getDailyPlanStreak,
} from "../../../lib/dailyPlanning";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const includeBriefing = url.searchParams.get("briefing") === "true";

  const plan = getDailyPlan(date, { userId });
  const streak = getDailyPlanStreak({ userId });

  const response: Record<string, unknown> = {
    plan,
    streak,
    date,
  };

  if (includeBriefing) {
    response.briefing = generateDailyBriefing({ userId });
  }

  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const date = body.date ?? new Date().toISOString().slice(0, 10);

  const plan = createOrUpdateDailyPlan(
    date,
    {
      topPriorities: body.topPriorities,
      timeBlocks: body.timeBlocks,
      reflection: body.reflection,
      energyLevel: body.energyLevel,
    },
    { userId }
  );

  return NextResponse.json({ plan }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const date = body.date ?? new Date().toISOString().slice(0, 10);

  const plan = createOrUpdateDailyPlan(
    date,
    {
      topPriorities: body.topPriorities,
      timeBlocks: body.timeBlocks,
      reflection: body.reflection,
      energyLevel: body.energyLevel,
    },
    { userId }
  );

  return NextResponse.json({ plan });
}
