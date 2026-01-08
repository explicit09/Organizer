import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { listHabitsWithStats, getHabitLogsForHabit } from "../../../lib/habits";
import { listFocusSessions } from "../../../lib/focusSessions";
import { listActivity } from "../../../lib/activity";
import { listDailyPlans } from "../../../lib/dailyPlanning";
import { getDb } from "../../../lib/db";

export async function GET(req: Request) {
  const userId = getRequestUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const type = url.searchParams.get("type") ?? "all";

  try {
    let data: Record<string, unknown> = {};
    const exportDate = new Date().toISOString();

    // Items
    if (type === "all" || type === "items") {
      const items = listItems(undefined, { userId });
      data.items = items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        details: item.details,
        status: item.status,
        priority: item.priority,
        tags: item.tags,
        dueAt: item.dueAt,
        startAt: item.startAt,
        endAt: item.endAt,
        estimatedMinutes: item.estimatedMinutes,
        area: item.area,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    }

    // Habits
    if (type === "all" || type === "habits") {
      const habits = listHabitsWithStats({ userId });
      data.habits = habits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        description: habit.description,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        color: habit.color,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
        completionRate: habit.completionRate,
        createdAt: habit.createdAt,
      }));

      // Include habit logs
      if (type === "habits") {
        data.habitLogs = [];
        for (const habit of habits) {
          const logs = getHabitLogsForHabit(habit.id, { userId });
          (data.habitLogs as Array<unknown>).push(
            ...logs.map((log) => ({
              habitId: log.habitId,
              habitTitle: habit.title,
              date: log.date,
              count: log.count,
              notes: log.notes,
            }))
          );
        }
      }
    }

    // Focus sessions
    if (type === "all" || type === "focus") {
      const sessions = listFocusSessions({ userId, limit: 1000 });
      data.focusSessions = sessions.map((session) => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationMinutes: session.durationMinutes,
        type: session.type,
        completed: session.completed,
        notes: session.notes,
      }));
    }

    // Daily plans
    if (type === "all" || type === "plans") {
      const plans = listDailyPlans({ userId, limit: 365 });
      data.dailyPlans = plans.map((plan) => ({
        date: plan.date,
        topPriorities: plan.topPriorities,
        timeBlocks: plan.timeBlocks,
        reflection: plan.reflection,
        energyLevel: plan.energyLevel,
        createdAt: plan.createdAt,
      }));
    }

    // Goals
    if (type === "all" || type === "goals") {
      const db = getDb();
      const goals = db
        .prepare(`SELECT * FROM goals WHERE user_id = ?`)
        .all(userId) as Array<{
          id: string;
          title: string;
          target: number;
          unit: string;
          current: number;
          start_date: string;
          end_date: string;
          status: string;
          created_at: string;
        }>;

      data.goals = goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        target: goal.target,
        unit: goal.unit,
        current: goal.current,
        startDate: goal.start_date,
        endDate: goal.end_date,
        status: goal.status,
        createdAt: goal.created_at,
      }));
    }

    // Notes
    if (type === "all" || type === "notes") {
      const db = getDb();
      const notes = db
        .prepare(`SELECT * FROM notes WHERE user_id = ?`)
        .all(userId) as Array<{
          id: string;
          title: string;
          content: string;
          tags_json: string;
          created_at: string;
          updated_at: string;
        }>;

      data.notes = notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags_json ? JSON.parse(note.tags_json) : [],
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));
    }

    // Activity log
    if (type === "activity") {
      const activity = listActivity({ userId });
      data.activity = activity.slice(0, 1000);
    }

    // Format response
    if (format === "csv") {
      // Convert to CSV
      const csvData = convertToCSV(type, data);
      
      return new Response(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="organizer-export-${type}-${exportDate.slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: JSON
    const jsonData = {
      exportDate,
      exportType: type,
      ...data,
    };

    return new Response(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="organizer-export-${type}-${exportDate.slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

function convertToCSV(type: string, data: Record<string, unknown>): string {
  const lines: string[] = [];

  // Items CSV
  if (type === "items" || type === "all") {
    const items = data.items as Array<Record<string, unknown>>;
    if (items && items.length > 0) {
      lines.push("# Items");
      lines.push("id,type,title,status,priority,tags,dueAt,area,createdAt");
      for (const item of items) {
        lines.push(
          [
            item.id,
            item.type,
            `"${String(item.title).replace(/"/g, '""')}"`,
            item.status,
            item.priority,
            `"${(item.tags as string[])?.join(";") ?? ""}"`,
            item.dueAt ?? "",
            item.area ?? "",
            item.createdAt,
          ].join(",")
        );
      }
      lines.push("");
    }
  }

  // Habits CSV
  if (type === "habits" || type === "all") {
    const habits = data.habits as Array<Record<string, unknown>>;
    if (habits && habits.length > 0) {
      lines.push("# Habits");
      lines.push("id,title,frequency,currentStreak,longestStreak,completionRate,createdAt");
      for (const habit of habits) {
        lines.push(
          [
            habit.id,
            `"${String(habit.title).replace(/"/g, '""')}"`,
            habit.frequency,
            habit.currentStreak,
            habit.longestStreak,
            habit.completionRate,
            habit.createdAt,
          ].join(",")
        );
      }
      lines.push("");
    }
  }

  // Focus sessions CSV
  if (type === "focus" || type === "all") {
    const sessions = data.focusSessions as Array<Record<string, unknown>>;
    if (sessions && sessions.length > 0) {
      lines.push("# Focus Sessions");
      lines.push("id,startedAt,endedAt,durationMinutes,type,completed");
      for (const session of sessions) {
        lines.push(
          [
            session.id,
            session.startedAt,
            session.endedAt ?? "",
            session.durationMinutes,
            session.type,
            session.completed,
          ].join(",")
        );
      }
      lines.push("");
    }
  }

  // Daily plans CSV
  if (type === "plans" || type === "all") {
    const plans = data.dailyPlans as Array<Record<string, unknown>>;
    if (plans && plans.length > 0) {
      lines.push("# Daily Plans");
      lines.push("date,prioritiesCount,timeBlocksCount,hasReflection,energyLevel,createdAt");
      for (const plan of plans) {
        lines.push(
          [
            plan.date,
            (plan.topPriorities as Array<unknown>)?.length ?? 0,
            (plan.timeBlocks as Array<unknown>)?.length ?? 0,
            plan.reflection ? "yes" : "no",
            plan.energyLevel ?? "",
            plan.createdAt,
          ].join(",")
        );
      }
    }
  }

  return lines.join("\n");
}
