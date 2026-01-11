import type { ToolResult, ToolExecutionContext } from "../types";
import { TOOL_NAMES } from "../tools";

// Import domain executors
import {
  executeCreateItem,
  executeListItems,
  executeUpdateItem,
  executeDeleteItem,
  executeMarkComplete,
  executeBatchUpdate,
  executeBulkCreate,
  executeSearchItems,
} from "./taskManagement";

import {
  executeSearchWeb,
  executeFetchWebPage,
  executeResearchTopic,
} from "./research";

import {
  executeBreakDownTask,
  executeCreatePlan,
  executeSuggestSchedule,
} from "./planning";

import {
  executeGetAnalytics,
  executeAnalyzePatterns,
  executeGetDependencyGraph,
  executeGetSummary,
} from "./analysis";

import {
  executeRememberPreference,
  executeRecallContext,
  executeLogObservation,
} from "./memory";

import {
  executeStartFocusSession,
  executeGetCalendarContext,
  executeNavigate,
} from "./focus";

import {
  executeGetMorningBriefing,
  executeSuggestReschedule,
  executeAnalyzeDependencies,
  executeAnalyzeGoalAlignment,
  executeGetUserContext,
  executeGetFocusRecommendation,
  executeAnalyzeWorkload,
  executeGetPatternInsights,
} from "./intelligence";

// Tool executor type
type ToolExecutor = (
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
) => Promise<ToolResult>;

// Registry mapping tool names to executors
const executorRegistry: Record<string, ToolExecutor> = {
  // Task Management
  [TOOL_NAMES.CREATE_ITEM]: executeCreateItem,
  [TOOL_NAMES.LIST_ITEMS]: executeListItems,
  [TOOL_NAMES.UPDATE_ITEM]: executeUpdateItem,
  [TOOL_NAMES.DELETE_ITEM]: executeDeleteItem,
  [TOOL_NAMES.MARK_COMPLETE]: executeMarkComplete,
  [TOOL_NAMES.BATCH_UPDATE]: executeBatchUpdate,
  [TOOL_NAMES.BULK_CREATE]: executeBulkCreate,
  [TOOL_NAMES.SEARCH_ITEMS]: executeSearchItems,

  // Research
  [TOOL_NAMES.SEARCH_WEB]: executeSearchWeb,
  [TOOL_NAMES.FETCH_WEBPAGE]: executeFetchWebPage,
  [TOOL_NAMES.RESEARCH_TOPIC]: executeResearchTopic,

  // Planning
  [TOOL_NAMES.BREAK_DOWN_TASK]: executeBreakDownTask,
  [TOOL_NAMES.CREATE_PLAN]: executeCreatePlan,
  [TOOL_NAMES.SUGGEST_SCHEDULE]: executeSuggestSchedule,

  // Analysis
  [TOOL_NAMES.GET_ANALYTICS]: executeGetAnalytics,
  [TOOL_NAMES.ANALYZE_PATTERNS]: executeAnalyzePatterns,
  [TOOL_NAMES.GET_DEPENDENCY_GRAPH]: executeGetDependencyGraph,
  [TOOL_NAMES.GET_SUMMARY]: executeGetSummary,

  // Memory
  [TOOL_NAMES.REMEMBER_PREFERENCE]: executeRememberPreference,
  [TOOL_NAMES.RECALL_CONTEXT]: executeRecallContext,
  [TOOL_NAMES.LOG_OBSERVATION]: executeLogObservation,

  // Focus
  [TOOL_NAMES.START_FOCUS_SESSION]: executeStartFocusSession,
  [TOOL_NAMES.GET_CALENDAR_CONTEXT]: executeGetCalendarContext,
  [TOOL_NAMES.NAVIGATE]: executeNavigate,

  // Intelligence (Phase 2)
  [TOOL_NAMES.GET_MORNING_BRIEFING]: executeGetMorningBriefing,
  [TOOL_NAMES.SUGGEST_RESCHEDULE]: executeSuggestReschedule,
  [TOOL_NAMES.ANALYZE_DEPENDENCIES]: executeAnalyzeDependencies,
  [TOOL_NAMES.ANALYZE_GOAL_ALIGNMENT]: executeAnalyzeGoalAlignment,
  [TOOL_NAMES.GET_USER_CONTEXT]: executeGetUserContext,
  [TOOL_NAMES.GET_FOCUS_RECOMMENDATION]: executeGetFocusRecommendation,
  [TOOL_NAMES.ANALYZE_WORKLOAD]: executeAnalyzeWorkload,
  [TOOL_NAMES.GET_PATTERN_INSIGHTS]: executeGetPatternInsights,
};

// Main executor function
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const executor = executorRegistry[toolName];

  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await executor(input, ctx);
  } catch (error) {
    console.error(`[Tool Executor] Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

// Execute with timeout
export async function executeToolWithTimeout(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
  timeoutMs: number = 30000
): Promise<ToolResult> {
  const timeoutPromise = new Promise<ToolResult>((_, reject) => {
    setTimeout(() => reject(new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([executeTool(toolName, input, ctx), timeoutPromise]);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

// Get list of available tools
export function getAvailableTools(): string[] {
  return Object.keys(executorRegistry);
}

// Check if tool exists
export function isToolAvailable(toolName: string): boolean {
  return toolName in executorRegistry;
}
