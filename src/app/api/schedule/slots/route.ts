import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../../lib/auth";
import { listItems } from "../../../../lib/items";
import { findAvailableSlots, findBestSlotForDuration } from "../../../../lib/schedule";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate") ?? new Date().toISOString();
    const endDate = url.searchParams.get("endDate");
    const minDuration = parseInt(url.searchParams.get("minDuration") ?? "30", 10);
    const duration = url.searchParams.get("duration");

    // Calculate end date if not provided (default to 7 days ahead)
    const end = endDate
      ? new Date(endDate)
      : new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get user's events to find available slots around them
    const items = listItems(undefined, { userId });
    const events = items.filter((item) => item.startAt && item.endAt);

    const slots = findAvailableSlots(events, {
      startDate: new Date(startDate),
      endDate: end,
      minDurationMinutes: minDuration,
    });

    // If a specific duration is requested, find the best slot
    let bestSlot = null;
    if (duration) {
      bestSlot = findBestSlotForDuration(events, parseInt(duration, 10), {
        startDate: new Date(startDate),
        endDate: end,
      });
    }

    return NextResponse.json({ slots, bestSlot }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
