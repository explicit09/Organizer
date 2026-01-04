import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  getCompletionSeries,
  getTimeAllocation,
  getTrends,
} from "../../../lib/analytics";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "7", 10);

    const [completionSeries, timeAllocation, trends] = await Promise.all([
      Promise.resolve(getCompletionSeries(days, new Date(), { userId })),
      Promise.resolve(getTimeAllocation({ userId, days })),
      Promise.resolve(getTrends({ userId, periodDays: days })),
    ]);

    return NextResponse.json(
      {
        completionSeries,
        timeAllocation,
        trends,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
