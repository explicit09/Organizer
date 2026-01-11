import type { GoalContext, GoalItem } from "./types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function getGoalContext(userId: string): GoalContext {
  const db = getDb();
  const items = listItems(undefined, { userId });

  // Get active goals
  const goalsRows = db
    .prepare(
      `
      SELECT id, title, target, current, start_date, end_date, status
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
    status: string;
  }>;

  const activeGoals: GoalItem[] = goalsRows.map((g) => ({
    id: g.id,
    title: g.title,
    targetValue: g.target || 100,
    currentValue: g.current || 0,
    deadline: g.end_date,
  }));

  // Calculate goal progress
  const goalProgress: Record<string, number> = {};
  for (const goal of activeGoals) {
    goalProgress[goal.id] = goal.targetValue > 0
      ? goal.currentValue / goal.targetValue
      : 0;
  }

  // Find neglected areas
  const areas = ["work", "personal", "health", "learning", "finance", "relationships", "side_projects"];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const neglectedAreas = areas.filter((area) => {
    const areaItems = items.filter(
      (i) => i.area === area && new Date(i.updatedAt) >= weekAgo
    );
    return areaItems.length === 0;
  });

  // Calculate aligned work this week
  const openItems = items.filter((i) => i.status !== "completed");
  const totalHours = openItems.reduce(
    (sum, i) => sum + (i.estimatedMinutes || 30) / 60,
    0
  );

  // Get goal areas and project ids for alignment matching
  const goalAreasRows = db
    .prepare(`SELECT area, project_id FROM goals WHERE user_id = ? AND status = 'active'`)
    .all(userId) as Array<{ area: string | null; project_id: string | null }>;

  const goalAreas = new Set(goalAreasRows.map((g) => g.area).filter(Boolean) as string[]);
  const goalProjectIds = new Set(goalAreasRows.map((g) => g.project_id).filter(Boolean) as string[]);

  // Consider items aligned if they match goal area or project
  const alignedItems = openItems.filter((i) => {
    if (i.area && goalAreas.has(i.area)) return true;
    if (i.projectId && goalProjectIds.has(i.projectId)) return true;
    return false;
  });

  const alignedHours = alignedItems.reduce(
    (sum, i) => sum + (i.estimatedMinutes || 30) / 60,
    0
  );

  const alignedWorkThisWeek = totalHours > 0 ? alignedHours / totalHours : 0;

  return {
    activeGoals,
    goalProgress,
    neglectedAreas,
    alignedWorkThisWeek,
  };
}
