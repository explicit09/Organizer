import Anthropic from "@anthropic-ai/sdk";

// ========== Tool Definition Types ==========

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ========== Tool Execution Types ==========

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  timezone?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ========== Agent Context Types ==========

export interface AgentContext {
  // Temporal
  currentTime: string;
  currentDate: string;
  dayOfWeek: string;
  timezone: string;

  // Workload
  openTaskCount: number;
  overdueCount: number;
  todayDueCount: number;
  inProgressCount: number;

  // Calendar
  todayMeetings: number;
  nextMeeting?: {
    title: string;
    startsAt: string;
    minutesUntil: number;
  };
  freeTimeSlots?: Array<{
    start: string;
    end: string;
    durationMinutes: number;
  }>;

  // Current focus
  currentFocus?: string;
  activeGoals: string[];

  // Learned preferences
  preferences: Array<{
    category: string;
    key: string;
    value: string;
  }>;

  // Observed patterns
  patterns: Array<{
    type: string;
    summary: string;
  }>;

  // Recent items for context
  upcomingItems: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    dueAt?: string;
  }>;

  overdueItems: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    dueAt: string;
    daysOverdue: number;
  }>;
}

// ========== Conversation Types ==========

export type MessageRole = "user" | "assistant";

export interface ConversationMessage {
  role: MessageRole;
  content: string | Anthropic.ContentBlock[];
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ========== Streaming Types ==========

export interface StreamEvent {
  type: "text" | "tool_use_start" | "tool_use_end" | "tool_result" | "error" | "done";
  content?: string;
  toolName?: string;
  toolId?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: ToolResult;
  error?: string;
}

// ========== Memory & Learning Types ==========

export interface UserPreference {
  id: string;
  userId: string;
  category: "work_style" | "schedule" | "communication" | "priorities" | "constraints" | "goals" | "personal";
  key: string;
  value: string;
  confidence: "explicit" | "inferred" | "observed";
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMemory {
  id: string;
  userId: string;
  type: "observation" | "fact" | "pattern" | "preference";
  category: string;
  content: string;
  significance: "low" | "medium" | "high";
  embedding?: string;
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface UserPattern {
  id: string;
  userId: string;
  patternType: string;
  patternData: Record<string, unknown>;
  confidence: number;
  sampleSize: number;
  firstObservedAt: string;
  lastUpdatedAt: string;
}

// ========== Response Types ==========

export interface AgentResponse {
  content: string;
  toolsUsed: Array<{
    name: string;
    input: Record<string, unknown>;
    result: ToolResult;
  }>;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

// ========== API Request/Response Types ==========

export interface ChatRequest {
  message: string;
  conversationId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  response: AgentResponse;
}
