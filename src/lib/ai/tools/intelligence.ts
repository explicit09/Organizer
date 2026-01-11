import type { ToolDefinition } from "../types";

// Morning Briefing Tool
export const getMorningBriefingTool: ToolDefinition = {
  name: "get_morning_briefing",
  description:
    "Generate a personalized morning briefing for the user. Includes schedule overview, priorities, habits, and intelligent insights. Best used at the start of a day or when user asks for an overview.",
  input_schema: {
    type: "object",
    properties: {
      includeCalendar: {
        type: "boolean",
        description: "Include today's schedule and meetings (default true)",
      },
      includePriorities: {
        type: "boolean",
        description: "Include priority items and deadlines (default true)",
      },
      includeHabits: {
        type: "boolean",
        description: "Include habit tracking status (default true)",
      },
      includeInsights: {
        type: "boolean",
        description: "Include AI-generated insights and suggestions (default true)",
      },
      maxItems: {
        type: "number",
        description: "Maximum items per section (default 5)",
      },
      verbosity: {
        type: "string",
        enum: ["brief", "normal", "detailed"],
        description: "Level of detail in the briefing (default normal)",
      },
    },
  },
};

// Smart Rescheduling Tool
export const suggestRescheduleTool: ToolDefinition = {
  name: "suggest_reschedule",
  description:
    "Get intelligent rescheduling suggestions for a task. Considers user's calendar, workload, productive hours, and dependencies to find optimal times.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "ID of the item to reschedule",
      },
      reason: {
        type: "string",
        enum: ["conflict", "overloaded", "missed_deadline", "priority_change", "user_request"],
        description: "Reason for rescheduling",
      },
      notBefore: {
        type: "string",
        description: "ISO date string - earliest acceptable time",
      },
      notAfter: {
        type: "string",
        description: "ISO date string - latest acceptable time",
      },
      avoidWeekends: {
        type: "boolean",
        description: "Avoid scheduling on weekends (default false)",
      },
      avoidDays: {
        type: "array",
        items: { type: "string" },
        description: "Days to avoid (e.g., ['Monday', 'Friday'])",
      },
      preferredTimeOfDay: {
        type: "string",
        enum: ["morning", "afternoon", "evening"],
        description: "Preferred time of day for the task",
      },
    },
    required: ["itemId", "reason"],
  },
};

// Dependency Analysis Tool
export const analyzeDependenciesTool: ToolDefinition = {
  name: "analyze_dependencies",
  description:
    "Analyze task dependencies to identify blockers, critical paths, and high-impact items. Helps prioritize work that unblocks the most other tasks.",
  input_schema: {
    type: "object",
    properties: {
      includeRecommendations: {
        type: "boolean",
        description: "Include AI recommendations for dependency management (default true)",
      },
      focusOnCriticalPath: {
        type: "boolean",
        description: "Highlight critical path items (default true)",
      },
      maxChains: {
        type: "number",
        description: "Maximum blocked chains to return (default 5)",
      },
    },
  },
};

// Goal Alignment Tool
export const analyzeGoalAlignmentTool: ToolDefinition = {
  name: "analyze_goal_alignment",
  description:
    "Analyze how well current work aligns with stated goals. Detects drift, identifies neglected areas, and provides recommendations to stay on track.",
  input_schema: {
    type: "object",
    properties: {
      includeAreaBreakdown: {
        type: "boolean",
        description: "Include breakdown by life area (default true)",
      },
      includeDriftAnalysis: {
        type: "boolean",
        description: "Include drift detection (default true)",
      },
      includeRecommendations: {
        type: "boolean",
        description: "Include alignment recommendations (default true)",
      },
    },
  },
};

// User Context Tool
export const getUserContextTool: ToolDefinition = {
  name: "get_user_context",
  description:
    "Get comprehensive context about the user's current state. Includes temporal info, workload, calendar, priorities, goals, patterns, and more. Use for deep understanding before making recommendations.",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "temporal",
            "workload",
            "calendar",
            "priorities",
            "goals",
            "patterns",
            "habits",
            "recentActivity",
            "memory",
          ],
        },
        description: "Specific context sections to include (default: all)",
      },
      quick: {
        type: "boolean",
        description: "Get quick context (temporal + workload + priorities only) for faster response",
      },
    },
  },
};

// Focus Recommendation Tool
export const getFocusRecommendationTool: ToolDefinition = {
  name: "get_focus_recommendation",
  description:
    "Get an intelligent recommendation for what to focus on right now. Considers priorities, time available, energy levels, and blocked items.",
  input_schema: {
    type: "object",
    properties: {
      availableMinutes: {
        type: "number",
        description: "How many minutes the user has available",
      },
      energyLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "User's current energy level",
      },
      preferQuickWins: {
        type: "boolean",
        description: "Prefer quick wins over deep work (default false)",
      },
      excludeTypes: {
        type: "array",
        items: { type: "string" },
        description: "Item types to exclude from recommendations",
      },
    },
  },
};

// Workload Balance Tool
export const analyzeWorkloadTool: ToolDefinition = {
  name: "analyze_workload",
  description:
    "Analyze current workload distribution and capacity. Identifies overcommitment, suggests load balancing, and predicts completion feasibility.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "this_week", "next_week", "this_month"],
        description: "Time period to analyze (default this_week)",
      },
      includeCapacityAnalysis: {
        type: "boolean",
        description: "Include available vs committed hours analysis (default true)",
      },
      includeSuggestions: {
        type: "boolean",
        description: "Include load balancing suggestions (default true)",
      },
    },
  },
};

// Pattern Insights Tool
export const getPatternInsightsTool: ToolDefinition = {
  name: "get_pattern_insights",
  description:
    "Get insights from user's productivity patterns. Identifies best working hours, common blockers, and areas for improvement.",
  input_schema: {
    type: "object",
    properties: {
      insightTypes: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "productive_hours",
            "completion_patterns",
            "estimation_accuracy",
            "blocking_patterns",
            "area_distribution",
          ],
        },
        description: "Types of insights to include",
      },
      lookbackDays: {
        type: "number",
        description: "Days of history to analyze (default 30)",
      },
    },
  },
};

// Export all intelligence tools
export const intelligenceTools: ToolDefinition[] = [
  getMorningBriefingTool,
  suggestRescheduleTool,
  analyzeDependenciesTool,
  analyzeGoalAlignmentTool,
  getUserContextTool,
  getFocusRecommendationTool,
  analyzeWorkloadTool,
  getPatternInsightsTool,
];
