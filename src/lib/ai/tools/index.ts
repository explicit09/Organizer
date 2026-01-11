import type { ToolDefinition } from "../types";
import { taskManagementTools } from "./taskManagement";
import { researchTools } from "./research";
import { planningTools } from "./planning";
import { analysisTools } from "./analysis";
import { memoryTools } from "./memory";
import { focusTools } from "./focus";
import { intelligenceTools } from "./intelligence";

// Re-export individual tool arrays for selective use
export {
  taskManagementTools,
  researchTools,
  planningTools,
  analysisTools,
  memoryTools,
  focusTools,
  intelligenceTools,
};

// Combined registry of all tools
export const ALL_TOOLS: ToolDefinition[] = [
  ...taskManagementTools,
  ...researchTools,
  ...planningTools,
  ...analysisTools,
  ...memoryTools,
  ...focusTools,
  ...intelligenceTools,
];

// Tool names for type safety
export const TOOL_NAMES = {
  // Task Management
  CREATE_ITEM: "create_item",
  LIST_ITEMS: "list_items",
  UPDATE_ITEM: "update_item",
  DELETE_ITEM: "delete_item",
  MARK_COMPLETE: "mark_complete",
  BATCH_UPDATE: "batch_update",
  BULK_CREATE: "bulk_create",
  SEARCH_ITEMS: "search_items",

  // Research
  SEARCH_WEB: "search_web",
  FETCH_WEBPAGE: "fetch_webpage",
  RESEARCH_TOPIC: "research_topic",

  // Planning
  BREAK_DOWN_TASK: "break_down_task",
  CREATE_PLAN: "create_plan",
  SUGGEST_SCHEDULE: "suggest_schedule",

  // Analysis
  GET_ANALYTICS: "get_analytics",
  ANALYZE_PATTERNS: "analyze_patterns",
  GET_DEPENDENCY_GRAPH: "get_dependency_graph",
  GET_SUMMARY: "get_summary",

  // Memory
  REMEMBER_PREFERENCE: "remember_preference",
  RECALL_CONTEXT: "recall_context",
  LOG_OBSERVATION: "log_observation",

  // Focus
  START_FOCUS_SESSION: "start_focus_session",
  GET_CALENDAR_CONTEXT: "get_calendar_context",
  NAVIGATE: "navigate",

  // Intelligence (Phase 2)
  GET_MORNING_BRIEFING: "get_morning_briefing",
  SUGGEST_RESCHEDULE: "suggest_reschedule",
  ANALYZE_DEPENDENCIES: "analyze_dependencies",
  ANALYZE_GOAL_ALIGNMENT: "analyze_goal_alignment",
  GET_USER_CONTEXT: "get_user_context",
  GET_FOCUS_RECOMMENDATION: "get_focus_recommendation",
  ANALYZE_WORKLOAD: "analyze_workload",
  GET_PATTERN_INSIGHTS: "get_pattern_insights",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Get tool by name
export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}

// Format tools for Anthropic API
export function getToolsForAPI() {
  return ALL_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  }));
}
