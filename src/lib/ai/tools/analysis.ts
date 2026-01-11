import type { ToolDefinition } from "../types";

export const getAnalyticsTool: ToolDefinition = {
  name: "get_analytics",
  description: "Get productivity analytics and insights. Use to understand patterns, progress, and areas for improvement.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month"],
        description: "Time period for analytics",
      },
      focus: {
        type: "array",
        items: {
          type: "string",
          enum: ["completion_rate", "time_allocation", "priorities", "overdue", "habits", "focus_sessions", "goals"],
        },
        description: "Specific metrics to analyze",
      },
      compareWith: {
        type: "string",
        enum: ["previous_period", "average", "best"],
        description: "What to compare against",
      },
    },
  },
};

export const analyzePatternsTool: ToolDefinition = {
  name: "analyze_patterns",
  description: "Analyze user's behavioral patterns over time. Identifies productive times, common blockers, and habits.",
  input_schema: {
    type: "object",
    properties: {
      analysisType: {
        type: "string",
        enum: ["productivity", "time_usage", "completion_patterns", "blocking_patterns", "habit_adherence"],
        description: "Type of pattern analysis",
      },
      lookbackDays: {
        type: "number",
        description: "How many days to analyze (default 30)",
      },
    },
    required: ["analysisType"],
  },
};

export const getDependencyGraphTool: ToolDefinition = {
  name: "get_dependency_graph",
  description: "Get the dependency graph for items. Shows what blocks what and identifies critical paths.",
  input_schema: {
    type: "object",
    properties: {
      rootItemId: {
        type: "string",
        description: "Start from a specific item (optional)",
      },
      includeCompleted: {
        type: "boolean",
        description: "Include completed items (default false)",
      },
      maxDepth: {
        type: "number",
        description: "Maximum depth to traverse (default 5)",
      },
    },
  },
};

export const getSummaryTool: ToolDefinition = {
  name: "get_summary",
  description: "Get a summary of the user's items and workload. Great for understanding current state.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "this_week", "this_month"],
        description: "Time period to summarize",
      },
      includeInsights: {
        type: "boolean",
        description: "Include AI-generated insights (default true)",
      },
    },
  },
};

export const analysisTools: ToolDefinition[] = [
  getAnalyticsTool,
  analyzePatternsTool,
  getDependencyGraphTool,
  getSummaryTool,
];
