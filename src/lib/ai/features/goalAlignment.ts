import type {
  AlignmentAnalysis,
  GoalAlignment,
  AreaAlignment,
  DriftAnalysis,
  AlignmentRecommendation,
  ContextItem,
  GoalItem,
} from "../context/types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function analyzeGoalAlignment(userId: string): AlignmentAnalysis {
  const db = getDb();
  const items = listItems(undefined, { userId });

  // Get goals with area and project_id
  const goalsRows = db
    .prepare(
      `
      SELECT id, title, target, current, start_date, end_date, area, project_id
      FROM goals
      WHERE user_id = ? AND status = 'active'
    `
    )
    .all(userId) as Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    start_date: string;
    end_date: string;
    area: string | null;
    project_id: string | null;
  }>;

  const goals: GoalItem[] = goalsRows.map((g) => ({
    id: g.id,
    title: g.title,
    targetValue: g.target || 100,
    currentValue: g.current || 0,
    deadline: g.end_date,
    area: g.area || undefined,
    projectId: g.project_id || undefined,
  }));

  const openItems = items.filter((i) => i.status !== "completed");
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Analyze by goal
  const byGoal: GoalAlignment[] = goals.map((goal) => {
    const alignedItems = openItems.filter((i) => isAlignedWithGoal(i, goal));
    const alignedHours = alignedItems.reduce(
      (sum, i) => sum + (i.estimatedMinutes || 30) / 60,
      0
    );

    // Calculate trend
    const recentAligned = items.filter(
      (i) =>
        new Date(i.updatedAt) >= weekAgo && isAlignedWithGoal(i, goal)
    ).length;
    const previousAligned = items.filter(
      (i) =>
        new Date(i.updatedAt) >= twoWeeksAgo &&
        new Date(i.updatedAt) < weekAgo &&
        isAlignedWithGoal(i, goal)
    ).length;

    const trend: "improving" | "stable" | "declining" =
      recentAligned > previousAligned
        ? "improving"
        : recentAligned < previousAligned
        ? "declining"
        : "stable";

    const contextItems: ContextItem[] = alignedItems.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      status: i.status,
      priority: i.priority,
      dueAt: i.dueAt,
      estimatedMinutes: i.estimatedMinutes,
    }));

    return {
      goal,
      alignedItems: contextItems,
      alignedHours,
      progress: goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0,
      trend,
      projectedCompletion: projectCompletionDate(goal, items),
    };
  });

  // Analyze by area
  const areas = [
    "work",
    "personal",
    "health",
    "learning",
    "finance",
    "relationships",
    "side_projects",
  ];
  const totalHours = openItems.reduce(
    (sum, i) => sum + (i.estimatedMinutes || 30) / 60,
    0
  );

  const byArea: AreaAlignment[] = areas.map((area) => {
    const areaItems = openItems.filter((i) => i.area === area);
    const hoursAllocated = areaItems.reduce(
      (sum, i) => sum + (i.estimatedMinutes || 30) / 60,
      0
    );

    const lastActivityItem = items
      .filter((i) => i.area === area)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

    // Calculate trend
    const recentCount = items.filter(
      (i) => i.area === area && new Date(i.updatedAt) >= weekAgo
    ).length;
    const previousCount = items.filter(
      (i) =>
        i.area === area &&
        new Date(i.updatedAt) >= twoWeeksAgo &&
        new Date(i.updatedAt) < weekAgo
    ).length;

    const trend: "increasing" | "stable" | "decreasing" =
      recentCount > previousCount
        ? "increasing"
        : recentCount < previousCount
        ? "decreasing"
        : "stable";

    return {
      area,
      itemCount: areaItems.length,
      hoursAllocated,
      percentageOfTotal: totalHours > 0 ? hoursAllocated / totalHours : 0,
      trend,
      lastActivity: lastActivityItem ? new Date(lastActivityItem.updatedAt) : null,
    };
  });

  // Detect drift
  const drift = detectDrift(byGoal, byArea);

  // Calculate overall alignment
  const alignedWork = byGoal.reduce((sum, g) => sum + g.alignedHours, 0);
  const overallAlignment = totalHours > 0 ? alignedWork / totalHours : 0;

  // Generate recommendations
  const recommendations = generateAlignmentRecommendations(byGoal, byArea, drift);

  return {
    overallAlignment,
    byGoal,
    byArea,
    drift,
    recommendations,
  };
}

function isAlignedWithGoal(
  item: { area?: string; projectId?: string },
  goal: GoalItem
): boolean {
  // Check area match
  if (item.area && goal.area && item.area === goal.area) return true;

  // Check project match
  if (item.projectId && goal.projectId && item.projectId === goal.projectId)
    return true;

  return false;
}

function projectCompletionDate(
  goal: GoalItem,
  items: Array<{ updatedAt: string; status: string }>
): Date | null {
  if (goal.currentValue >= goal.targetValue) {
    return new Date(); // Already complete
  }

  // Calculate velocity from recent completions
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentCompletions = items.filter(
    (i) =>
      i.status === "completed" && new Date(i.updatedAt) >= weekAgo
  ).length;

  if (recentCompletions === 0) {
    return null; // Can't project without velocity
  }

  const remaining = goal.targetValue - goal.currentValue;
  const weeksNeeded = remaining / recentCompletions;
  const daysNeeded = Math.ceil(weeksNeeded * 7);

  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysNeeded);

  return projectedDate;
}

function detectDrift(
  byGoal: GoalAlignment[],
  byArea: AreaAlignment[]
): DriftAnalysis {
  const now = new Date();
  const decliningGoals = byGoal.filter((g) => g.trend === "declining");
  const neglectedAreas = byArea.filter((a) => {
    if (!a.lastActivity) return a.itemCount > 0;
    const daysSince = Math.floor(
      (now.getTime() - a.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince > 7 && a.itemCount > 0;
  });

  if (decliningGoals.length >= 2 || neglectedAreas.length >= 2) {
    return {
      isDrifting: true,
      driftDirection:
        neglectedAreas.length > 0
          ? `Away from ${neglectedAreas.map((a) => a.area).join(", ")}`
          : "Away from stated goals",
      driftSeverity:
        decliningGoals.length >= 3 || neglectedAreas.length >= 3
          ? "high"
          : "medium",
      explanation: `${decliningGoals.length} goals showing declining activity, ${neglectedAreas.length} life areas neglected`,
    };
  }

  if (decliningGoals.length === 1 || neglectedAreas.length === 1) {
    return {
      isDrifting: true,
      driftDirection:
        neglectedAreas[0]?.area || decliningGoals[0]?.goal.title,
      driftSeverity: "low",
      explanation: "Slight drift detected - one area needs attention",
    };
  }

  return {
    isDrifting: false,
    driftDirection: null,
    driftSeverity: "low",
    explanation: "Work is well-aligned with goals",
  };
}

function generateAlignmentRecommendations(
  byGoal: GoalAlignment[],
  byArea: AreaAlignment[],
  drift: DriftAnalysis
): AlignmentRecommendation[] {
  const recommendations: AlignmentRecommendation[] = [];
  const now = new Date();

  // Recommend focus on declining goals
  for (const goalAlign of byGoal.filter((g) => g.trend === "declining")) {
    recommendations.push({
      type: "focus",
      priority: "high",
      title: `Refocus on "${goalAlign.goal.title}"`,
      description: `This goal has seen declining activity. Consider adding tasks to move it forward.`,
      suggestedAction: {
        type: "create_item",
        params: {
          title: `Work on ${goalAlign.goal.title}`,
          goalId: goalAlign.goal.id,
        },
      },
    });
  }

  // Recommend balance for neglected areas
  for (const area of byArea) {
    if (area.lastActivity) {
      const daysSince = Math.floor(
        (now.getTime() - area.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > 7) {
        recommendations.push({
          type: "balance",
          priority: "medium",
          title: `Don't forget ${area.area}`,
          description: `No activity in ${area.area} for ${daysSince} days.`,
          suggestedAction: {
            type: "list_items",
            params: { area: area.area },
          },
        });
      }
    }
  }

  // Recommend reviewing goals if overall alignment is low
  if (byGoal.every((g) => g.alignedHours < 2)) {
    recommendations.push({
      type: "review",
      priority: "medium",
      title: "Review your goals",
      description:
        "Most of your work doesn't seem connected to your stated goals. Consider updating your goals or linking tasks to them.",
      suggestedAction: {
        type: "navigate",
        params: { to: "/progress" },
      },
    });
  }

  return recommendations;
}
