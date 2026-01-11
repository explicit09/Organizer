import type { ToolDefinition } from "../types";

export const createItemTool: ToolDefinition = {
  name: "create_item",
  description: "Create a new task, meeting, or school item. Use this when the user wants to add something to their list.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Clear, actionable title for the item",
      },
      type: {
        type: "string",
        enum: ["task", "meeting", "school"],
        description: "Type of item - task for general todos, meeting for calendar events, school for academic work",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "Priority level. Use urgent sparingly for truly time-sensitive items.",
      },
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "blocked"],
        description: "Initial status, defaults to not_started",
      },
      dueAt: {
        type: "string",
        description: "ISO 8601 datetime for when this is due (e.g., 2025-01-15T09:00:00Z)",
      },
      details: {
        type: "string",
        description: "Additional context, notes, or description",
      },
      estimatedMinutes: {
        type: "number",
        description: "Estimated time to complete in minutes",
      },
      parentId: {
        type: "string",
        description: "ID of parent item if this is a subtask",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags for categorization",
      },
    },
    required: ["title"],
  },
};

export const listItemsTool: ToolDefinition = {
  name: "list_items",
  description: "Get items from the user's list with optional filters. Use this to understand what the user has on their plate.",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["task", "meeting", "school"],
        description: "Filter by item type",
      },
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "blocked"],
        description: "Filter by status",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "Filter by priority",
      },
      overdue: {
        type: "boolean",
        description: "Only show items that are past their due date",
      },
      dueBefore: {
        type: "string",
        description: "ISO date - show items due before this date",
      },
      dueAfter: {
        type: "string",
        description: "ISO date - show items due after this date",
      },
      dueToday: {
        type: "boolean",
        description: "Only show items due today",
      },
      limit: {
        type: "number",
        description: "Max items to return (default 20)",
      },
      includeCompleted: {
        type: "boolean",
        description: "Include completed items in results (default false)",
      },
    },
  },
};

export const updateItemTool: ToolDefinition = {
  name: "update_item",
  description: "Update an existing item. Can change title, status, priority, due date, etc. Use item ID or search by title.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "ID of item to update, or the item's title to search for",
      },
      title: {
        type: "string",
        description: "New title",
      },
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "blocked"],
        description: "New status",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "New priority",
      },
      dueAt: {
        type: "string",
        description: "New due date (ISO 8601)",
      },
      details: {
        type: "string",
        description: "New details/notes",
      },
      estimatedMinutes: {
        type: "number",
        description: "New time estimate in minutes",
      },
    },
    required: ["itemId"],
  },
};

export const deleteItemTool: ToolDefinition = {
  name: "delete_item",
  description: "Delete an item. Use with caution - this action cannot be undone.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "ID of item to delete, or the item's title to search for",
      },
    },
    required: ["itemId"],
  },
};

export const markCompleteTool: ToolDefinition = {
  name: "mark_complete",
  description: "Mark one or more items as completed. Great for batch completing tasks.",
  input_schema: {
    type: "object",
    properties: {
      itemIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of item IDs or titles to mark complete",
      },
    },
    required: ["itemIds"],
  },
};

export const batchUpdateTool: ToolDefinition = {
  name: "batch_update",
  description: "Update multiple items at once based on filters. Useful for bulk operations like 'mark all overdue as high priority'.",
  input_schema: {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["task", "meeting", "school"],
          },
          status: {
            type: "string",
            enum: ["not_started", "in_progress", "completed", "blocked"],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          overdue: {
            type: "boolean",
            description: "Match only overdue items",
          },
        },
        description: "Filters to select which items to update",
      },
      updates: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["not_started", "in_progress", "completed", "blocked"],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          dueAt: {
            type: "string",
            description: "New due date (ISO 8601)",
          },
        },
        description: "Updates to apply to matching items",
      },
    },
    required: ["filter", "updates"],
  },
};

export const bulkCreateTool: ToolDefinition = {
  name: "bulk_create",
  description: "Create multiple items at once. Great for adding several related tasks or breaking down a project.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            type: {
              type: "string",
              enum: ["task", "meeting", "school"],
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
            dueAt: { type: "string" },
            details: { type: "string" },
            estimatedMinutes: { type: "number" },
            parentId: { type: "string" },
          },
          required: ["title"],
        },
        description: "Array of items to create",
      },
    },
    required: ["items"],
  },
};

export const searchItemsTool: ToolDefinition = {
  name: "search_items",
  description: "Search for items by keyword. Searches title, details, and tags.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query",
      },
      limit: {
        type: "number",
        description: "Max results to return (default 10)",
      },
    },
    required: ["query"],
  },
};

// Export all task management tools
export const taskManagementTools: ToolDefinition[] = [
  createItemTool,
  listItemsTool,
  updateItemTool,
  deleteItemTool,
  markCompleteTool,
  batchUpdateTool,
  bulkCreateTool,
  searchItemsTool,
];
