import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  createHabit,
  listHabitsWithStats,
  logHabit,
  unlogHabit,
  updateHabit,
  deleteHabit,
  getHabitWithStats,
  getHabitGridData,
} from "../../../lib/habits";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const habitId = url.searchParams.get("id");
  const includeArchived = url.searchParams.get("archived") === "true";

  if (habitId) {
    const habit = getHabitWithStats(habitId, { userId });
    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const gridDays = parseInt(url.searchParams.get("days") ?? "30");
    const grid = getHabitGridData(habitId, gridDays, { userId });

    return NextResponse.json({ habit, grid });
  }

  const habits = listHabitsWithStats({ userId, includeArchived });
  return NextResponse.json({ habits });
}

export async function POST(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Log habit completion
  if (body.action === "log") {
    const log = logHabit(body.habitId, body.date ?? new Date(), body, { userId });
    const habit = getHabitWithStats(body.habitId, { userId });
    return NextResponse.json({ log, habit });
  }

  // Unlog habit
  if (body.action === "unlog") {
    unlogHabit(body.habitId, body.date ?? new Date(), { userId });
    const habit = getHabitWithStats(body.habitId, { userId });
    return NextResponse.json({ habit });
  }

  // Create new habit
  const habit = createHabit(body, { userId });
  const habitWithStats = getHabitWithStats(habit.id, { userId });
  return NextResponse.json({ habit: habitWithStats }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const habit = updateHabit(id, updates, { userId });
  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const habitWithStats = getHabitWithStats(id, { userId });
  return NextResponse.json({ habit: habitWithStats });
}

export async function DELETE(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = deleteHabit(id, { userId });
  if (!deleted) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
