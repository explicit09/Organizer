import { NextResponse } from "next/server";
import { getRequestUserId } from "../../../lib/auth";
import {
  getCompletionSeries,
  getTimeAllocation,
  getTrends,
} from "../../../lib/analytics";
import { listItems } from "../../../lib/items";

export async function GET(req: Request) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "7", 10);

    const items = listItems(undefined, { userId });
    const now = new Date();

    // Calculate overview stats
    const totalTasks = items.length;
    const completedTasks = items.filter((i) => i.status === "completed").length;
    const inProgressTasks = items.filter((i) => i.status === "in_progress").length;
    const overdueTasks = items.filter((i) => {
      if (!i.dueAt || i.status === "completed") return false;
      return new Date(i.dueAt) < now;
    }).length;
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get trends data
    const trendsData = getTrends({ userId, periodDays: 7 });
    const completionSeries = getCompletionSeries(14, now, { userId });

    // This week vs last week
    const thisWeekCompleted = completionSeries.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const lastWeekCompleted = completionSeries.slice(0, 7).reduce((sum, d) => sum + d.count, 0);
    const weekChange = lastWeekCompleted
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : 0;

    // By status breakdown
    const statusCounts: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };
    for (const item of items) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalTasks ? Math.round((count / totalTasks) * 100) : 0,
    }));

    // By priority breakdown
    const priorityCounts: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of items) {
      priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    }
    const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
      percentage: totalTasks ? Math.round((count / totalTasks) * 100) : 0,
    }));

    // By type breakdown
    const typeCounts: Record<string, number> = {
      task: 0,
      meeting: 0,
      school: 0,
    };
    for (const item of items) {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }
    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: totalTasks ? Math.round((count / totalTasks) * 100) : 0,
    }));

    return NextResponse.json({
      overview: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        averageCompletionTime: Math.round(trendsData.avgCompletionTime.current / 24), // Convert hours to days
      },
      // Full trends data for TrendsCard component
      trends: {
        completionRate: trendsData.completionRate,
        productivity: trendsData.productivity,
        taskVolume: trendsData.taskVolume,
        streakDays: trendsData.streakDays,
        bestDay: trendsData.bestDay,
        // Also include simple week comparison for AnalyticsDashboard
        thisWeek: thisWeekCompleted,
        lastWeek: lastWeekCompleted,
        change: weekChange,
      },
      byStatus,
      byPriority,
      byType,
      recentActivity: completionSeries.slice(-7).map((d) => ({
        date: d.date,
        completed: d.count,
        created: 0, // Could be enhanced to track created items per day
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
