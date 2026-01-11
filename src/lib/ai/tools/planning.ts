import type { ToolDefinition } from "../types";

export const breakDownTaskTool: ToolDefinition = {
  name: "break_down_task",
  description: "Break down a complex task into smaller, actionable subtasks. Creates the subtasks as items linked to a parent.",
  input_schema: {
    type: "object",
    properties: {
      taskDescription: {
        type: "string",
        description: "Description of the complex task to break down",
      },
      parentItemId: {
        type: "string",
        description: "ID of existing item to add subtasks to (optional - will create parent if not provided)",
      },
      context: {
        type: "string",
        description: "Additional context about the user's situation, skills, constraints",
      },
      granularity: {
        type: "string",
        enum: ["high-level", "detailed", "very-detailed"],
        description: "How detailed the breakdown should be",
      },
      includeEstimates: {
        type: "boolean",
        description: "Include time estimates for each subtask (default true)",
      },
      includeDependencies: {
        type: "boolean",
        description: "Identify which subtasks depend on others (default true)",
      },
    },
    required: ["taskDescription"],
  },
};

export const createPlanTool: ToolDefinition = {
  name: "create_plan",
  description: "Create a comprehensive plan for achieving a goal. Includes task breakdown, scheduling, and milestones.",
  input_schema: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "The goal to plan for",
      },
      deadline: {
        type: "string",
        description: "Target completion date (ISO 8601)",
      },
      constraints: {
        type: "array",
        items: { type: "string" },
        description: "Constraints to consider (time, budget, skills, etc.)",
      },
      resources: {
        type: "array",
        items: { type: "string" },
        description: "Available resources",
      },
    },
    required: ["goal"],
  },
};

export const suggestScheduleTool: ToolDefinition = {
  name: "suggest_schedule",
  description: "Analyze the user's tasks and suggest optimal scheduling. Considers priorities, dependencies, and available time.",
  input_schema: {
    type: "object",
    properties: {
      itemIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific items to schedule (optional - will consider all pending if not provided)",
      },
      timeframe: {
        type: "string",
        enum: ["today", "this_week", "next_week", "this_month"],
        description: "Timeframe to schedule within",
      },
      preferences: {
        type: "object",
        properties: {
          focusTimePreference: {
            type: "string",
            enum: ["morning", "afternoon", "evening"],
          },
          maxTasksPerDay: { type: "number" },
          minFocusBlockMinutes: { type: "number" },
        },
        description: "Scheduling preferences",
      },
    },
  },
};

export const planningTools: ToolDefinition[] = [
  breakDownTaskTool,
  createPlanTool,
  suggestScheduleTool,
];
