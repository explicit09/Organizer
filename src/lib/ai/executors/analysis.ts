import type { ToolResult, ToolExecutionContext } from "../types";
import { listItems, type Item } from "../../items";

export async function executeGetAnalytics(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const period = (input.period as string) || "this_week";
    const focus = input.focus as string[] | undefined;

    const now = new Date();
    let startDate = new Date();
    let periodLabel = "";

    // Calculate date range
    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        periodLabel = "today";
        break;
      case "yesterday":
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        periodLabel = "yesterday";
        break;
      case "this_week":
        startDate.setDate(startDate.getDate() - startDate.getDay());
        periodLabel = "this week";
        break;
      case "last_week":
        startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
        periodLabel = "last week";
        break;
      case "this_month":
        startDate.setDate(1);
        periodLabel = "this month";
        break;
      case "last_month":
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        periodLabel = "last month";
        break;
    }

    const items = listItems(undefined, { userId: ctx.userId });

    // Filter items within period
    const periodItems = items.filter((item) => {
      const created = new Date(item.createdAt);
      return created >= startDate && created <= now;
    });

    const completedInPeriod = items.filter((item) => {
      if (item.status !== "completed" || !item.updatedAt) return false;
      const completed = new Date(item.updatedAt);
      return completed >= startDate && completed <= now;
    });

    const overdue = items.filter((item) => {
      if (!item.dueAt || item.status === "completed") return false;
      return new Date(item.dueAt) < now;
    });

    // Build analytics
    const analytics: Record<string, unknown> = {
      period: periodLabel,
      overview: {
        totalCreated: periodItems.length,
        totalCompleted: completedInPeriod.length,
        completionRate: periodItems.length > 0
          ? Math.round((completedInPeriod.length / periodItems.length) * 100)
          : 0,
        currentOverdue: overdue.length,
      },
    };

    // Add focused metrics
    const shouldInclude = (metric: string) =>
      !focus || focus.length === 0 || focus.includes(metric);

    if (shouldInclude("time_allocation")) {
      analytics.byType = {
        tasks: periodItems.filter((i) => i.type === "task").length,
        meetings: periodItems.filter((i) => i.type === "meeting").length,
        school: periodItems.filter((i) => i.type === "school").length,
      };
    }

    if (shouldInclude("priorities")) {
      const active = items.filter((i) => i.status !== "completed");
      analytics.byPriority = {
        urgent: active.filter((i) => i.priority === "urgent").length,
        high: active.filter((i) => i.priority === "high").length,
        medium: active.filter((i) => i.priority === "medium").length,
        low: active.filter((i) => i.priority === "low").length,
      };
    }

    if (shouldInclude("overdue")) {
      analytics.overdueDetails = overdue.slice(0, 5).map((i) => ({
        id: i.id,
        title: i.title,
        dueAt: i.dueAt,
        daysOverdue: Math.floor(
          (now.getTime() - new Date(i.dueAt!).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
    }

    return {
      success: true,
      data: analytics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get analytics",
    };
  }
}

export async function executeAnalyzePatterns(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const analysisType = input.analysisType as string;
    const lookbackDays = (input.lookbackDays as number) || 30;

    const items = listItems(undefined, { userId: ctx.userId });
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - lookbackDays);

    // Filter to lookback period
    const periodItems = items.filter((item) => {
      const created = new Date(item.createdAt);
      return created >= startDate;
    });

    const patterns: Record<string, unknown> = {
      analysisType,
      lookbackDays,
      sampleSize: periodItems.length,
    };

    switch (analysisType) {
      case "productivity": {
        // Analyze completion rates by day of week
        const byDayOfWeek: Record<string, { created: number; completed: number }> = {};
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        for (const item of periodItems) {
          const day = days[new Date(item.createdAt).getDay()];
          if (!byDayOfWeek[day]) byDayOfWeek[day] = { created: 0, completed: 0 };
          byDayOfWeek[day].created++;
          if (item.status === "completed") byDayOfWeek[day].completed++;
        }

        const mostProductiveDay = Object.entries(byDayOfWeek)
          .sort((a, b) => b[1].completed - a[1].completed)[0];

        patterns.byDayOfWeek = byDayOfWeek;
        patterns.insight = mostProductiveDay
          ? `You're most productive on ${mostProductiveDay[0]}s (${mostProductiveDay[1].completed} tasks completed).`
          : "Not enough data to determine most productive day.";
        break;
      }

      case "completion_patterns": {
        // How long items stay open before completion
        const completedItems = periodItems.filter((i) => i.status === "completed" && i.updatedAt);
        const durations = completedItems.map((i) => {
          const created = new Date(i.createdAt).getTime();
          const completed = new Date(i.updatedAt!).getTime();
          return (completed - created) / (1000 * 60 * 60); // hours
        });

        if (durations.length > 0) {
          const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length;
          patterns.averageCompletionTime = `${avgHours.toFixed(1)} hours`;
          patterns.quickest = `${Math.min(...durations).toFixed(1)} hours`;
          patterns.longest = `${Math.max(...durations).toFixed(1)} hours`;
        }
        break;
      }

      case "blocking_patterns": {
        const blockedItems = items.filter((i) => i.status === "blocked");
        patterns.currentlyBlocked = blockedItems.length;
        patterns.blockedItems = blockedItems.slice(0, 5).map((i) => ({
          id: i.id,
          title: i.title,
          blockedSince: i.updatedAt,
        }));
        patterns.insight = blockedItems.length > 0
          ? `You have ${blockedItems.length} blocked items. Consider reviewing what's blocking them.`
          : "No blocked items - great job keeping things moving!";
        break;
      }

      default:
        patterns.insight = "Unknown analysis type. Try: productivity, completion_patterns, blocking_patterns";
    }

    return { success: true, data: patterns };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze patterns",
    };
  }
}

export async function executeGetDependencyGraph(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const items = listItems(undefined, { userId: ctx.userId });

    // Find parent-child relationships
    const itemsWithChildren = items.filter((item) =>
      items.some((i) => i.parentId === item.id)
    );

    const graph = itemsWithChildren.map((parent) => {
      const children = items.filter((i) => i.parentId === parent.id);
      return {
        id: parent.id,
        title: parent.title,
        status: parent.status,
        childCount: children.length,
        children: children.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
        })),
      };
    });

    return {
      success: true,
      data: {
        parentCount: graph.length,
        graph,
        insight: graph.length > 0
          ? `Found ${graph.length} items with subtasks.`
          : "No hierarchical task structure found. Consider breaking down complex tasks.",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get dependency graph",
    };
  }
}

export async function executeGetSummary(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const period = (input.period as string) || "today";

    const now = new Date();
    const items = listItems(undefined, { userId: ctx.userId });

    // Calculate stats
    const notCompleted = items.filter((i) => i.status !== "completed");
    const overdue = notCompleted.filter(
      (i) => i.dueAt && new Date(i.dueAt) < now
    );

    // Today's items
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dueToday = notCompleted.filter(
      (i) => i.dueAt && new Date(i.dueAt) >= todayStart && new Date(i.dueAt) <= todayEnd
    );

    // Upcoming (next 7 days)
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const upcoming = notCompleted
      .filter((i) => i.dueAt && new Date(i.dueAt) > todayEnd && new Date(i.dueAt) <= weekEnd)
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

    // High priority items
    const highPriority = notCompleted.filter(
      (i) => i.priority === "urgent" || i.priority === "high"
    );

    return {
      success: true,
      data: {
        period,
        counts: {
          total: items.length,
          notCompleted: notCompleted.length,
          overdue: overdue.length,
          dueToday: dueToday.length,
          highPriority: highPriority.length,
        },
        overdue: overdue.slice(0, 5).map((i) => ({
          id: i.id,
          title: i.title,
          priority: i.priority,
          dueAt: i.dueAt,
        })),
        dueToday: dueToday.map((i) => ({
          id: i.id,
          title: i.title,
          priority: i.priority,
        })),
        upcoming: upcoming.slice(0, 5).map((i) => ({
          id: i.id,
          title: i.title,
          priority: i.priority,
          dueAt: i.dueAt,
        })),
        highPriority: highPriority.slice(0, 5).map((i) => ({
          id: i.id,
          title: i.title,
          dueAt: i.dueAt,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get summary",
    };
  }
}
