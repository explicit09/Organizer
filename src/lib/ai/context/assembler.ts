import type { UserContext } from "./types";
import { getTemporalContext } from "./temporal";
import { getWorkloadContext } from "./workload";
import { getCalendarContext } from "./calendar";
import { getPriorityContext } from "./priority";
import { getGoalContext } from "./goals";
import { getPatternContext } from "./patterns";
import { getRecentActivityContext } from "./activity";
import { getHabitContext } from "./habits";
import { getMemoryContext, getUserPreferences } from "./memory";

export interface AssembleContextOptions {
  userId: string;
  timezone?: string;
}

export function assembleFullContext(options: AssembleContextOptions): UserContext {
  const { userId, timezone = "America/Chicago" } = options;

  // Assemble all context components
  const temporal = getTemporalContext(timezone);
  const workload = getWorkloadContext(userId);
  const calendar = getCalendarContext(userId);
  const priorities = getPriorityContext(userId);
  const goals = getGoalContext(userId);
  const patterns = getPatternContext(userId);
  const recentActivity = getRecentActivityContext(userId);
  const habits = getHabitContext(userId);
  const preferences = getUserPreferences(userId);
  const memory = getMemoryContext(userId);

  return {
    temporal,
    workload,
    calendar,
    priorities,
    goals,
    patterns,
    recentActivity,
    habits,
    preferences,
    memory,
  };
}

// Lighter version for quick queries
export function assembleQuickContext(options: AssembleContextOptions): Partial<UserContext> {
  const { userId, timezone = "America/Chicago" } = options;

  return {
    temporal: getTemporalContext(timezone),
    workload: getWorkloadContext(userId),
    priorities: getPriorityContext(userId),
  };
}

// Context with specific focus areas
export function assembleContextWithFocus(
  options: AssembleContextOptions,
  focus: Array<keyof UserContext>
): Partial<UserContext> {
  const { userId, timezone = "America/Chicago" } = options;

  const context: Partial<UserContext> = {};

  for (const area of focus) {
    switch (area) {
      case "temporal":
        context.temporal = getTemporalContext(timezone);
        break;
      case "workload":
        context.workload = getWorkloadContext(userId);
        break;
      case "calendar":
        context.calendar = getCalendarContext(userId);
        break;
      case "priorities":
        context.priorities = getPriorityContext(userId);
        break;
      case "goals":
        context.goals = getGoalContext(userId);
        break;
      case "patterns":
        context.patterns = getPatternContext(userId);
        break;
      case "recentActivity":
        context.recentActivity = getRecentActivityContext(userId);
        break;
      case "habits":
        context.habits = getHabitContext(userId);
        break;
      case "preferences":
        context.preferences = getUserPreferences(userId);
        break;
      case "memory":
        context.memory = getMemoryContext(userId);
        break;
    }
  }

  return context;
}
