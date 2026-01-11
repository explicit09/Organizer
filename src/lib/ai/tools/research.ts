import type { ToolDefinition } from "../types";

export const searchWebTool: ToolDefinition = {
  name: "search_web",
  description: "Search the internet for information. Use for finding jobs, internships, articles, tutorials, or any external information the user needs.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query - be specific and include relevant context like location, year, field",
      },
      searchType: {
        type: "string",
        enum: ["general", "jobs", "news", "academic", "tutorials"],
        description: "Type of search to optimize results",
      },
      maxResults: {
        type: "number",
        description: "Number of results to return (default 5)",
      },
    },
    required: ["query"],
  },
};

export const fetchWebPageTool: ToolDefinition = {
  name: "fetch_webpage",
  description: "Fetch and read the content of a specific webpage. Use after search_web to get detailed information from a result.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to fetch",
      },
      extractType: {
        type: "string",
        enum: ["full", "summary", "main_content", "links"],
        description: "What to extract from the page",
      },
    },
    required: ["url"],
  },
};

export const researchTopicTool: ToolDefinition = {
  name: "research_topic",
  description: "Conduct in-depth research on a topic. Combines multiple searches and synthesizes findings. Use for complex research tasks.",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic to research",
      },
      context: {
        type: "string",
        description: "User's context - why they need this info",
      },
      depth: {
        type: "string",
        enum: ["quick", "moderate", "thorough"],
        description: "How deep to research",
      },
      focus: {
        type: "array",
        items: { type: "string" },
        description: "Specific aspects to focus on",
      },
    },
    required: ["topic"],
  },
};

export const researchTools: ToolDefinition[] = [
  searchWebTool,
  fetchWebPageTool,
  researchTopicTool,
];
