import type { ToolResult, ToolExecutionContext } from "../types";
import { createItem, listItems, getItem, type Item } from "../../items";

export async function executeBreakDownTask(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const taskDescription = input.taskDescription as string;
    const parentItemId = input.parentItemId as string | undefined;
    const granularity = (input.granularity as string) || "detailed";
    const includeEstimates = input.includeEstimates !== false;

    // Get or create parent item
    let parentItem: Item | null = null;
    if (parentItemId) {
      try {
        parentItem = getItem(parentItemId, { userId: ctx.userId });
      } catch {
        // Parent not found, will create new
      }
    }

    // If no parent, create one
    if (!parentItem) {
      parentItem = createItem(
        {
          type: "task",
          title: taskDescription,
          priority: "medium",
          status: "not_started",
        },
        { userId: ctx.userId }
      );
    }

    // This is a placeholder - the actual breakdown logic would be handled
    // by Claude in the agentic loop, which will call bulk_create
    // This tool returns guidance for what subtasks should be created
    return {
      success: true,
      data: {
        message: `Ready to break down: "${taskDescription}"`,
        parentItem: {
          id: parentItem.id,
          title: parentItem.title,
        },
        guidance: {
          granularity,
          includeEstimates,
          suggestion: `Break this task into ${granularity === "high-level" ? "3-5" : granularity === "detailed" ? "5-10" : "10+"} subtasks.`,
          template: {
            type: "task",
            parentId: parentItem.id,
            status: "not_started",
          },
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to break down task",
    };
  }
}

export async function executeCreatePlan(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const goal = input.goal as string;
    const deadline = input.deadline as string | undefined;
    const constraints = input.constraints as string[] | undefined;
    const resources = input.resources as string[] | undefined;

    // Create a parent item for the goal
    const goalItem = createItem(
      {
        type: "task",
        title: `Goal: ${goal}`,
        priority: "high",
        status: "not_started",
        dueAt: deadline,
        details: [
          constraints?.length ? `Constraints: ${constraints.join(", ")}` : "",
          resources?.length ? `Resources: ${resources.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      { userId: ctx.userId }
    );

    return {
      success: true,
      data: {
        message: `Created goal: "${goal}"`,
        goalItem: {
          id: goalItem.id,
          title: goalItem.title,
          dueAt: goalItem.dueAt,
        },
        planningGuidance: {
          phases: [
            "Phase 1: Planning & Research",
            "Phase 2: Preparation",
            "Phase 3: Execution",
            "Phase 4: Review & Completion",
          ],
          nextSteps: [
            "Use break_down_task to create subtasks for each phase",
            "Set due dates working backwards from deadline",
            "Consider dependencies between tasks",
          ],
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create plan",
    };
  }
}

export async function executeSuggestSchedule(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const itemIds = input.itemIds as string[] | undefined;
    const timeframe = (input.timeframe as string) || "this_week";
    const preferences = input.preferences as Record<string, unknown> | undefined;

    // Get items to schedule
    let items = listItems(undefined, { userId: ctx.userId }).filter(
      (i) => i.status !== "completed"
    );

    if (itemIds && itemIds.length > 0) {
      items = items.filter((i) => itemIds.includes(i.id));
    }

    // Calculate date range
    const now = new Date();
    let endDate = new Date();

    switch (timeframe) {
      case "today":
        endDate.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
        break;
      case "next_week":
        endDate.setDate(endDate.getDate() + 14);
        break;
      case "this_month":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
    }

    // Sort by priority and due date
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sortedItems = items.sort((a, b) => {
      // Overdue items first
      const aOverdue = a.dueAt && new Date(a.dueAt) < now;
      const bOverdue = b.dueAt && new Date(b.dueAt) < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      return 0;
    });

    // Generate schedule suggestions
    const suggestions = sortedItems.slice(0, 10).map((item, index) => {
      const suggestedDate = new Date(now);
      suggestedDate.setDate(suggestedDate.getDate() + Math.floor(index / 3));

      // Suggest time based on preferences
      const focusPref = preferences?.focusTimePreference as string;
      let suggestedTime = "09:00";
      if (focusPref === "afternoon") suggestedTime = "14:00";
      if (focusPref === "evening") suggestedTime = "18:00";

      return {
        id: item.id,
        title: item.title,
        priority: item.priority,
        currentDueAt: item.dueAt,
        suggestedDate: suggestedDate.toISOString().split("T")[0],
        suggestedTime,
        estimatedMinutes: item.estimatedMinutes || 30,
        isOverdue: item.dueAt ? new Date(item.dueAt) < now : false,
      };
    });

    return {
      success: true,
      data: {
        timeframe,
        totalItems: items.length,
        scheduledCount: suggestions.length,
        suggestions,
        tips: [
          "Consider blocking focus time in your calendar",
          "Group similar tasks together for efficiency",
          "Schedule difficult tasks during your peak productivity hours",
        ],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to suggest schedule",
    };
  }
}
