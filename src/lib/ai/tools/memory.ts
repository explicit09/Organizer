import type { ToolDefinition } from "../types";

export const rememberPreferenceTool: ToolDefinition = {
  name: "remember_preference",
  description: "Store a user preference or important information for future reference. Use when user expresses a preference or pattern.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["work_style", "schedule", "communication", "priorities", "constraints", "goals", "personal"],
        description: "Category of preference",
      },
      key: {
        type: "string",
        description: "Specific preference key (e.g., 'preferred_focus_time', 'meeting_buffer')",
      },
      value: {
        type: "string",
        description: "The preference value",
      },
      confidence: {
        type: "string",
        enum: ["explicit", "inferred", "observed"],
        description: "How this preference was learned - explicit if user stated it directly",
      },
    },
    required: ["category", "key", "value"],
  },
};

export const recallContextTool: ToolDefinition = {
  name: "recall_context",
  description: "Recall stored information about the user. Use to personalize responses and remember past interactions.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["preferences", "recent_topics", "goals", "patterns", "all"],
        description: "Category of context to recall",
      },
      query: {
        type: "string",
        description: "Specific thing to recall (optional)",
      },
    },
  },
};

export const logObservationTool: ToolDefinition = {
  name: "log_observation",
  description: "Log an observation about user behavior for pattern learning. Use when noticing something that might be useful later.",
  input_schema: {
    type: "object",
    properties: {
      observation: {
        type: "string",
        description: "What was observed",
      },
      category: {
        type: "string",
        enum: ["productivity", "mood", "focus", "habits", "preferences", "struggles"],
        description: "Category of observation",
      },
      significance: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "How significant is this observation",
      },
    },
    required: ["observation", "category"],
  },
};

export const memoryTools: ToolDefinition[] = [
  rememberPreferenceTool,
  recallContextTool,
  logObservationTool,
];
