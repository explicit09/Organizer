import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  generateWeeklyReview,
  saveReviewNotes,
  getSavedReviewNotes,
} from "../../../lib/weeklyReview";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const weekOf = url.searchParams.get("weekOf");

  const review = generateWeeklyReview({
    userId,
    weekOf: weekOf ? new Date(weekOf) : undefined,
  });

  const savedNotes = getSavedReviewNotes(review.weekStart, { userId });

  return NextResponse.json({ review, savedNotes });
}

export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.weekStart) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  saveReviewNotes(
    body.weekStart,
    {
      notes: body.notes,
      wins: body.wins,
      goalsNextWeek: body.goalsNextWeek,
    },
    { userId }
  );

  return NextResponse.json({ success: true });
}
