import type { ToolDefinition } from "../types";

export const startFocusSessionTool: ToolDefinition = {
  name: "start_focus_session",
  description: "Start a focused work session (Pomodoro-style). Can be linked to a specific task.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "Item to focus on (optional)",
      },
      duration: {
        type: "number",
        description: "Session duration in minutes (default 25)",
      },
      blockNotifications: {
        type: "boolean",
        description: "Block notifications during session (default true)",
      },
    },
  },
};

export const getCalendarContextTool: ToolDefinition = {
  name: "get_calendar_context",
  description: "Get information about the user's calendar - meetings, free time, conflicts.",
  input_schema: {
    type: "object",
    properties: {
      timeframe: {
        type: "string",
        enum: ["today", "tomorrow", "this_week", "next_week"],
        description: "Timeframe to check",
      },
      includeDetails: {
        type: "boolean",
        description: "Include meeting details (default true)",
      },
      findFreeSlots: {
        type: "boolean",
        description: "Also return available time slots (default false)",
      },
      minSlotMinutes: {
        type: "number",
        description: "Minimum free slot duration to return (default 30)",
      },
    },
  },
};

export const navigateTool: ToolDefinition = {
  name: "navigate",
  description: "Navigate the user to a specific page in the app.",
  input_schema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        enum: ["/dashboard", "/tasks", "/meetings", "/school", "/inbox", "/progress", "/schedule", "/notes", "/projects"],
        description: "Page to navigate to",
      },
    },
    required: ["to"],
  },
};

export const focusTools: ToolDefinition[] = [
  startFocusSessionTool,
  getCalendarContextTool,
  navigateTool,
];
