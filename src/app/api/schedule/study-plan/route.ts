import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { listItems } from "../../../../lib/items";
import { generateStudyPlan } from "../../../../lib/schedule";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const hoursPerDay = parseFloat(url.searchParams.get("hoursPerDay") ?? "2");
    const daysAhead = parseInt(url.searchParams.get("daysAhead") ?? "7", 10);

    // Get school items and events
    const items = listItems(undefined, { userId });
    const schoolItems = items.filter((item) => item.type === "school" && item.status !== "completed");
    const events = items.filter((item) => item.startAt && item.endAt);

    const studyPlan = generateStudyPlan(schoolItems, events, {
      totalHours: hoursPerDay * daysAhead,
      sessionsPerDay: Math.ceil(hoursPerDay),
      sessionDuration: 60,
    });

    return NextResponse.json({ studyPlan }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate study plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
