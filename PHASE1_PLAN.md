# Phase 1: AI Agent Foundation - Detailed Implementation Plan

## Vision

Transform the current simple chatbot into an intelligent, agentic assistant that can:
- Execute multi-step workflows autonomously
- Research and gather information from the web
- Break down complex tasks into actionable subtasks
- Learn user patterns and preferences over time
- Provide proactive, contextual assistance

---

## Part 1: Core Architecture

### 1.1 Replace JSON Parsing with Claude Tool Use

**Current Problem:**
```
User: "Help me find internships"
AI: *outputs malformed JSON or wrong response*
```

**New Approach:**
```typescript
// Define tools with strict schemas
const tools = [
  {
    name: "search_web",
    description: "Search the internet for information",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        type: {
          type: "string",
          enum: ["general", "jobs", "news", "academic"],
          description: "Type of search"
        }
      },
      required: ["query"]
    }
  },
  // ... more tools
];

// Claude returns structured tool calls
// {
//   type: "tool_use",
//   name: "search_web",
//   input: { query: "software engineering internships Iowa 2025", type: "jobs" }
// }
```

**Implementation:**
- [ ] Install Anthropic SDK: `npm install @anthropic-ai/sdk`
- [ ] Create `/src/lib/ai/tools.ts` - All tool definitions
- [ ] Create `/src/lib/ai/executor.ts` - Tool execution engine
- [ ] Create `/src/lib/ai/agent.ts` - Agentic loop handler
- [ ] Update `/api/ai/chat/route.ts` - New streaming endpoint

### 1.2 Agentic Loop Implementation

```typescript
// Pseudocode for the agent loop
async function runAgent(userMessage: string, context: AgentContext) {
  const messages = [
    { role: "system", content: buildSystemPrompt(context) },
    ...context.history,
    { role: "user", content: userMessage }
  ];

  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: ALL_TOOLS,
      messages
    });

    // If Claude wants to use tools
    if (response.stop_reason === "tool_use") {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          // Execute tool and collect result
          const result = await executeToolSafely(block.name, block.input, context);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }

      // Add assistant response and tool results to continue loop
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      continue; // Loop back for more tool calls or final response
    }

    // Claude is done - return final response
    return response;
  }
}
```

---

## Part 2: Tool Definitions

### 2.1 Core Task Management Tools

```typescript
// tools/taskManagement.ts

export const createItemTool = {
  name: "create_item",
  description: "Create a new task, meeting, or school item. Use this when the user wants to add something to their list.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Clear, actionable title for the item"
      },
      type: {
        type: "string",
        enum: ["task", "meeting", "school"],
        description: "Type of item"
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "Priority level"
      },
      dueAt: {
        type: "string",
        description: "ISO 8601 datetime for when this is due"
      },
      details: {
        type: "string",
        description: "Additional context, notes, or description"
      },
      estimatedMinutes: {
        type: "number",
        description: "Estimated time to complete in minutes"
      },
      parentId: {
        type: "string",
        description: "ID of parent item if this is a subtask"
      }
    },
    required: ["title"]
  }
};

export const listItemsTool = {
  name: "list_items",
  description: "Get items from the user's list with optional filters. Use this to understand what the user has on their plate.",
  input_schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["task", "meeting", "school"] },
      status: { type: "string", enum: ["not_started", "in_progress", "completed", "blocked"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      overdue: { type: "boolean", description: "Only show overdue items" },
      dueBefore: { type: "string", description: "ISO date - items due before this" },
      dueAfter: { type: "string", description: "ISO date - items due after this" },
      limit: { type: "number", description: "Max items to return", default: 20 },
      includeCompleted: { type: "boolean", default: false }
    }
  }
};

export const updateItemTool = {
  name: "update_item",
  description: "Update an existing item. Can change title, status, priority, due date, etc.",
  input_schema: {
    type: "object",
    properties: {
      itemId: { type: "string", description: "ID of item to update" },
      title: { type: "string" },
      status: { type: "string", enum: ["not_started", "in_progress", "completed", "blocked"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      dueAt: { type: "string" },
      details: { type: "string" },
      estimatedMinutes: { type: "number" }
    },
    required: ["itemId"]
  }
};

export const batchUpdateTool = {
  name: "batch_update",
  description: "Update multiple items at once based on filters. Useful for bulk operations like 'mark all overdue as high priority'.",
  input_schema: {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: {
          type: { type: "string" },
          status: { type: "string" },
          priority: { type: "string" },
          overdue: { type: "boolean" }
        }
      },
      updates: {
        type: "object",
        properties: {
          status: { type: "string" },
          priority: { type: "string" },
          dueAt: { type: "string" }
        }
      }
    },
    required: ["filter", "updates"]
  }
};
```

### 2.2 Research & Information Tools

```typescript
// tools/research.ts

export const searchWebTool = {
  name: "search_web",
  description: "Search the internet for information. Use this for finding jobs, internships, articles, tutorials, or any external information the user needs.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query - be specific and include relevant context like location, year, field"
      },
      searchType: {
        type: "string",
        enum: ["general", "jobs", "news", "academic", "tutorials"],
        description: "Type of search to optimize results"
      },
      maxResults: {
        type: "number",
        default: 5,
        description: "Number of results to return"
      }
    },
    required: ["query"]
  }
};

export const fetchWebPageTool = {
  name: "fetch_webpage",
  description: "Fetch and read the content of a specific webpage. Use after search_web to get detailed information from a result.",
  input_schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to fetch" },
      extractType: {
        type: "string",
        enum: ["full", "summary", "main_content", "links"],
        description: "What to extract from the page"
      }
    },
    required: ["url"]
  }
};

export const researchTopicTool = {
  name: "research_topic",
  description: "Conduct in-depth research on a topic. Combines multiple searches and synthesizes findings. Use for complex research tasks.",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "Topic to research" },
      context: { type: "string", description: "User's context - why they need this info" },
      depth: {
        type: "string",
        enum: ["quick", "moderate", "thorough"],
        description: "How deep to research"
      },
      focus: {
        type: "array",
        items: { type: "string" },
        description: "Specific aspects to focus on"
      }
    },
    required: ["topic"]
  }
};
```

### 2.3 Planning & Breakdown Tools

```typescript
// tools/planning.ts

export const breakDownTaskTool = {
  name: "break_down_task",
  description: "Break down a complex task into smaller, actionable subtasks. Creates the subtasks as items linked to a parent.",
  input_schema: {
    type: "object",
    properties: {
      taskDescription: {
        type: "string",
        description: "Description of the complex task to break down"
      },
      parentItemId: {
        type: "string",
        description: "ID of existing item to add subtasks to (optional - will create parent if not provided)"
      },
      context: {
        type: "string",
        description: "Additional context about the user's situation, skills, constraints"
      },
      granularity: {
        type: "string",
        enum: ["high-level", "detailed", "very-detailed"],
        description: "How detailed the breakdown should be"
      },
      includeEstimates: {
        type: "boolean",
        default: true,
        description: "Include time estimates for each subtask"
      },
      includeDependencies: {
        type: "boolean",
        default: true,
        description: "Identify which subtasks depend on others"
      }
    },
    required: ["taskDescription"]
  }
};

export const createPlanTool = {
  name: "create_plan",
  description: "Create a comprehensive plan for achieving a goal. Includes research, task breakdown, scheduling, and milestones.",
  input_schema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The goal to plan for" },
      deadline: { type: "string", description: "Target completion date" },
      constraints: {
        type: "array",
        items: { type: "string" },
        description: "Constraints to consider (time, budget, skills, etc.)"
      },
      resources: {
        type: "array",
        items: { type: "string" },
        description: "Available resources"
      }
    },
    required: ["goal"]
  }
};

export const suggestScheduleTool = {
  name: "suggest_schedule",
  description: "Analyze the user's calendar and tasks to suggest optimal scheduling. Considers priorities, dependencies, and available time.",
  input_schema: {
    type: "object",
    properties: {
      itemIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific items to schedule (optional - will consider all pending if not provided)"
      },
      timeframe: {
        type: "string",
        enum: ["today", "this_week", "next_week", "this_month"],
        description: "Timeframe to schedule within"
      },
      preferences: {
        type: "object",
        properties: {
          focusTimePreference: { type: "string", enum: ["morning", "afternoon", "evening"] },
          maxMeetingsPerDay: { type: "number" },
          minFocusBlockMinutes: { type: "number" }
        }
      }
    }
  }
};
```

### 2.4 Analysis & Insights Tools

```typescript
// tools/analysis.ts

export const getAnalyticsTool = {
  name: "get_analytics",
  description: "Get productivity analytics and insights. Use to understand patterns, progress, and areas for improvement.",
  input_schema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month"],
        description: "Time period for analytics"
      },
      focus: {
        type: "array",
        items: {
          type: "string",
          enum: ["completion_rate", "time_allocation", "priorities", "overdue", "habits", "focus_sessions", "goals"]
        },
        description: "Specific metrics to analyze"
      },
      compareWith: {
        type: "string",
        enum: ["previous_period", "average", "best"],
        description: "What to compare against"
      }
    }
  }
};

export const analyzePatternsTool = {
  name: "analyze_patterns",
  description: "Analyze user's behavioral patterns over time. Identifies productive times, common blockers, and habits.",
  input_schema: {
    type: "object",
    properties: {
      analysisType: {
        type: "string",
        enum: ["productivity", "time_usage", "completion_patterns", "blocking_patterns", "habit_adherence"],
        description: "Type of pattern analysis"
      },
      lookbackDays: {
        type: "number",
        default: 30,
        description: "How many days to analyze"
      }
    },
    required: ["analysisType"]
  }
};

export const getDependencyGraphTool = {
  name: "get_dependency_graph",
  description: "Get the dependency graph for items. Shows what blocks what and identifies critical paths.",
  input_schema: {
    type: "object",
    properties: {
      rootItemId: {
        type: "string",
        description: "Start from a specific item (optional)"
      },
      includeCompleted: {
        type: "boolean",
        default: false
      },
      maxDepth: {
        type: "number",
        default: 5,
        description: "Maximum depth to traverse"
      }
    }
  }
};
```

### 2.5 Memory & Learning Tools

```typescript
// tools/memory.ts

export const rememberPreferenceTool = {
  name: "remember_preference",
  description: "Store a user preference or important information for future reference. Use when user expresses a preference or pattern.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["work_style", "schedule", "communication", "priorities", "constraints", "goals", "personal"],
        description: "Category of preference"
      },
      key: {
        type: "string",
        description: "Specific preference key (e.g., 'preferred_focus_time', 'meeting_buffer')"
      },
      value: {
        type: "string",
        description: "The preference value"
      },
      confidence: {
        type: "string",
        enum: ["explicit", "inferred", "observed"],
        description: "How this preference was learned"
      }
    },
    required: ["category", "key", "value"]
  }
};

export const recallContextTool = {
  name: "recall_context",
  description: "Recall stored information about the user. Use to personalize responses and remember past conversations.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["preferences", "recent_topics", "goals", "patterns", "all"]
      },
      query: {
        type: "string",
        description: "Specific thing to recall (optional)"
      }
    }
  }
};

export const logObservationTool = {
  name: "log_observation",
  description: "Log an observation about user behavior for pattern learning. Use when noticing something that might be useful later.",
  input_schema: {
    type: "object",
    properties: {
      observation: { type: "string", description: "What was observed" },
      category: {
        type: "string",
        enum: ["productivity", "mood", "focus", "habits", "preferences", "struggles"]
      },
      significance: {
        type: "string",
        enum: ["low", "medium", "high"]
      }
    },
    required: ["observation", "category"]
  }
};
```

### 2.6 Focus & Productivity Tools

```typescript
// tools/focus.ts

export const startFocusSessionTool = {
  name: "start_focus_session",
  description: "Start a focused work session (Pomodoro). Can be linked to a specific task.",
  input_schema: {
    type: "object",
    properties: {
      itemId: {
        type: "string",
        description: "Item to focus on (optional)"
      },
      duration: {
        type: "number",
        default: 25,
        description: "Session duration in minutes"
      },
      blockNotifications: {
        type: "boolean",
        default: true
      },
      setCalendarBusy: {
        type: "boolean",
        default: false,
        description: "Mark as busy in connected calendars"
      }
    }
  }
};

export const getCalendarContextTool = {
  name: "get_calendar_context",
  description: "Get information about the user's calendar - meetings, free time, conflicts.",
  input_schema: {
    type: "object",
    properties: {
      timeframe: {
        type: "string",
        enum: ["today", "tomorrow", "this_week", "next_week"]
      },
      includeDetails: {
        type: "boolean",
        default: true
      },
      findFreeSlots: {
        type: "boolean",
        default: false,
        description: "Also return available time slots"
      },
      minSlotMinutes: {
        type: "number",
        default: 30,
        description: "Minimum free slot duration to return"
      }
    }
  }
};
```

---

## Part 3: Database Schema Changes

### 3.1 User Preferences Table

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- work_style, schedule, communication, etc.
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence TEXT DEFAULT 'explicit', -- explicit, inferred, observed
  source TEXT, -- how it was learned
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category, key)
);
```

### 3.2 AI Memory Table

```sql
CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- observation, fact, pattern, preference
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  significance TEXT DEFAULT 'medium',
  embedding TEXT, -- for semantic search later
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- some memories can expire
  access_count INTEGER DEFAULT 0,
  last_accessed_at DATETIME
);

CREATE INDEX idx_ai_memory_user_type ON ai_memory(user_id, type);
CREATE INDEX idx_ai_memory_category ON ai_memory(user_id, category);
```

### 3.3 Behavioral Patterns Table

```sql
CREATE TABLE IF NOT EXISTS user_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- productive_hours, common_blockers, task_duration_accuracy, etc.
  pattern_data TEXT NOT NULL, -- JSON blob with pattern details
  confidence REAL DEFAULT 0.5, -- 0-1 confidence score
  sample_size INTEGER DEFAULT 0,
  first_observed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, pattern_type)
);
```

### 3.4 Enhanced Conversation History

```sql
-- Update existing ai_conversations table
ALTER TABLE ai_conversations ADD COLUMN tool_calls TEXT; -- JSON array of tool calls made
ALTER TABLE ai_conversations ADD COLUMN context_used TEXT; -- What context was provided
ALTER TABLE ai_conversations ADD COLUMN feedback TEXT; -- User feedback on response
ALTER TABLE ai_conversations ADD COLUMN tokens_used INTEGER;
```

---

## Part 4: System Prompt Design

### 4.1 Base System Prompt

```typescript
function buildSystemPrompt(context: AgentContext): string {
  return `You are an intelligent personal assistant integrated into a productivity app. Your role is to help the user manage their tasks, time, and goals effectively.

## Your Capabilities
You have access to tools that let you:
- Create, update, and manage tasks, meetings, and school items
- Search the web for information (jobs, internships, research, etc.)
- Break down complex tasks into actionable subtasks
- Analyze productivity patterns and provide insights
- Remember user preferences and learn from interactions
- Access and analyze calendar information
- Start focus sessions and manage notifications

## Current Context
- Current time: ${context.currentTime}
- Day of week: ${context.dayOfWeek}
- User's timezone: ${context.timezone}

## User's Current State
- Open tasks: ${context.openTaskCount}
- Overdue items: ${context.overdueCount}
- Today's meetings: ${context.todayMeetings}
- Current focus: ${context.currentFocus || "None set"}
- Active goals: ${context.activeGoals.join(", ") || "None"}

## User's Preferences (Learned)
${context.preferences.map(p => `- ${p.key}: ${p.value}`).join("\n")}

## Recent Patterns Observed
${context.patterns.map(p => `- ${p.type}: ${p.summary}`).join("\n")}

## Instructions

1. **Be Proactive**: Don't just answer questions - anticipate needs. If you notice issues (overdue tasks, scheduling conflicts, goal misalignment), mention them.

2. **Research Thoroughly**: When asked to find information (jobs, internships, resources), use the search tools multiple times if needed. Verify information and provide actionable results.

3. **Break Down Complexity**: For complex tasks, always offer to break them into subtasks. Create the subtasks directly when appropriate.

4. **Learn and Remember**: Use the memory tools to store preferences and observations. Reference past interactions when relevant.

5. **Be Contextual**: Consider the user's calendar, current workload, and patterns when making suggestions.

6. **Execute, Don't Just Suggest**: When the user wants something done, do it. Create the tasks, update the items, schedule the time - don't just describe what should be done.

7. **Multi-Step When Needed**: Complex requests may need multiple tool calls. Think through the full workflow:
   - Gather information first (list items, check calendar, search web)
   - Make decisions based on data
   - Execute actions
   - Verify results

## Communication Style
- Be concise but thorough
- Use markdown for formatting (headers, lists, bold for emphasis)
- Acknowledge what you did (e.g., "I've created 3 subtasks for...")
- Ask clarifying questions only when truly necessary
- Be encouraging but realistic about workload and deadlines
`;
}
```

### 4.2 Specialized Prompts

```typescript
// For research-heavy tasks
const RESEARCH_ADDENDUM = `
## Research Mode Active
You're helping with research. Guidelines:
- Use search_web multiple times with different queries to get comprehensive results
- Fetch specific pages that look promising
- Synthesize information from multiple sources
- Cite sources when providing information
- Create tasks for follow-up actions the user should take
- Be specific with job/internship listings: include company, role, location, deadline if available
`;

// For planning tasks
const PLANNING_ADDENDUM = `
## Planning Mode Active
You're helping create a plan. Guidelines:
- Start by understanding the full scope
- Break down into phases/milestones
- Each phase should have concrete tasks
- Include time estimates based on user's patterns
- Identify dependencies between tasks
- Consider the user's current workload
- Set realistic deadlines
- Create all items in the system, don't just list them
`;
```

---

## Part 5: Implementation Steps

### Week 1: Core Infrastructure

**Day 1-2: Setup & Tool Definitions**
- [ ] Install Anthropic SDK
- [ ] Create tool definition files
- [ ] Set up TypeScript types for tools
- [ ] Create tool registry system

**Day 3-4: Agentic Loop**
- [ ] Implement base agent loop
- [ ] Add parallel tool call handling
- [ ] Implement error recovery
- [ ] Add timeout handling

**Day 5-7: Tool Executors**
- [ ] Implement executors for all existing actions
- [ ] Add web search integration
- [ ] Add web page fetching
- [ ] Unit tests for each executor

### Week 2: New Capabilities

**Day 1-2: Research Tools**
- [ ] Implement search_web with job/internship awareness
- [ ] Implement fetch_webpage
- [ ] Implement research_topic (orchestrates searches)

**Day 3-4: Planning Tools**
- [ ] Implement break_down_task
- [ ] Implement create_plan
- [ ] Implement suggest_schedule
- [ ] Integrate with existing calendar

**Day 5-7: Analysis Tools**
- [ ] Enhanced analytics tool
- [ ] Pattern analysis tool
- [ ] Dependency graph tool

### Week 3: Memory & Learning

**Day 1-2: Database Changes**
- [ ] Add new tables
- [ ] Migration scripts
- [ ] CRUD functions

**Day 3-4: Memory Tools**
- [ ] Implement preference storage
- [ ] Implement recall system
- [ ] Implement observation logging

**Day 5-7: Pattern Learning**
- [ ] Implement pattern detection
- [ ] Store learned patterns
- [ ] Use patterns in suggestions

### Week 4: Frontend & Polish

**Day 1-2: Fix Chat Rendering**
- [ ] Debug markdown rendering issue
- [ ] Implement streaming responses
- [ ] Show tool execution status

**Day 3-4: Enhanced UI**
- [ ] Tool execution visualization
- [ ] Better error messages
- [ ] Loading states for multi-step

**Day 5-7: Testing & Refinement**
- [ ] End-to-end testing
- [ ] Prompt refinement
- [ ] Performance optimization

---

## Part 6: Example Workflows

### 6.1 Internship Search (Your Use Case)

**User:** "Help me find software engineering internships in Iowa for summer 2025"

**Agent Execution:**
```
1. search_web({ query: "software engineering internships Iowa summer 2025", searchType: "jobs" })
   → Returns 5 job board results

2. search_web({ query: "tech companies Iowa hiring interns 2025", searchType: "jobs" })
   → Returns company-specific results

3. fetch_webpage({ url: "https://...", extractType: "main_content" })
   → Gets details from promising listings

4. create_item({
     title: "Apply to Collins Aerospace internship",
     type: "task",
     dueAt: "2025-01-20",
     details: "Software Engineering Intern - Cedar Rapids\nDeadline: Jan 20\nLink: ...",
     priority: "high"
   })
   → Creates task for each relevant opportunity

5. create_item({
     title: "Update resume for Iowa internship applications",
     type: "task",
     priority: "urgent",
     dueAt: "2025-01-15"
   })
   → Creates prep task

6. remember_preference({
     category: "goals",
     key: "job_search_focus",
     value: "software engineering internships, Iowa, summer 2025"
   })
   → Remembers for future context
```

**Response:**
"I found 8 relevant internship opportunities in Iowa for Summer 2025. I've created tasks for the top 5 with their deadlines:

1. **Collins Aerospace** - Software Engineering Intern (Cedar Rapids)
   - Deadline: Jan 20 | Created task with high priority

2. **John Deere** - Technology Intern (Moline area)
   - Deadline: Feb 1 | Created task

[...etc]

I also created a prep task for updating your resume (due Jan 15 to be ready for the first deadline).

Would you like me to research any of these companies in more detail, or help you prepare application materials?"

### 6.2 Task Breakdown

**User:** "I need to prepare for my CS final exam next week"

**Agent Execution:**
```
1. recall_context({ category: "all" })
   → Gets user's course info, study patterns

2. list_items({ type: "school" })
   → Sees what school items exist

3. break_down_task({
     taskDescription: "Prepare for CS final exam",
     context: "User is a computer engineering student, exam next week",
     granularity: "detailed",
     includeEstimates: true,
     includeDependencies: true
   })
   → Creates structured breakdown

4. For each subtask, calls create_item() with appropriate estimates and dependencies

5. get_calendar_context({ timeframe: "this_week", findFreeSlots: true })
   → Finds available study time

6. suggest_schedule()
   → Proposes when to do each study task
```

### 6.3 Proactive Morning Briefing

**User:** "Good morning"

**Agent Execution:**
```
1. recall_context({ category: "preferences" })
   → Gets user's briefing preferences

2. get_calendar_context({ timeframe: "today" })
   → Gets today's schedule

3. list_items({ dueBefore: "today_end", status: "not_started" })
   → Gets due items

4. list_items({ status: "overdue" })
   → Gets overdue items

5. get_analytics({ period: "yesterday", focus: ["completion_rate"] })
   → Gets yesterday's performance

6. analyze_patterns({ analysisType: "productivity" })
   → Checks patterns for personalized tips
```

**Response:**
"Good morning! Here's your briefing:

**Today's Schedule:**
- 10:00 AM: Team standup (30 min)
- 2:00 PM: 1:1 with mentor (45 min)
- Free time: 8-10 AM, 10:30 AM-2 PM, 2:45-6 PM

**Priority Tasks:**
- ⚠️ "Review PR #42" is overdue by 1 day
- "Submit internship application" due today
- "Finish lab report" due tomorrow

**Quick Stats:**
- Yesterday: 5/7 tasks completed (71%)
- You're most productive in mornings - I'd suggest tackling the PR review first thing.

Would you like me to start a focus session for the PR review?"

---

## Part 7: Success Metrics

### What "Done" Looks Like

1. **Reliability**: Tool calls succeed >95% of the time
2. **Multi-step**: Can execute 5+ tool calls in one conversation
3. **Research**: Returns actionable job/internship listings with real links
4. **Task Breakdown**: Creates logical, estimated subtasks automatically
5. **Memory**: Remembers preferences across sessions
6. **Streaming**: Responses stream in real-time with tool status
7. **Markdown**: All formatting renders correctly

### Test Scenarios

- [ ] "Find internships" → Returns real listings, creates tasks
- [ ] "Break down [complex task]" → Creates 5+ subtasks with estimates
- [ ] "What's my day look like?" → Shows calendar + tasks + insights
- [ ] "I prefer morning focus time" → Stores preference, uses in future
- [ ] "Help me plan [goal]" → Creates comprehensive plan with items

---

## Part 8: Files to Create/Modify

### New Files
```
src/lib/ai/
├── tools/
│   ├── index.ts           # Tool registry
│   ├── taskManagement.ts  # CRUD tools
│   ├── research.ts        # Web search tools
│   ├── planning.ts        # Breakdown/planning tools
│   ├── analysis.ts        # Analytics tools
│   ├── memory.ts          # Learning tools
│   └── focus.ts           # Productivity tools
├── executor.ts            # Tool execution engine
├── agent.ts               # Agentic loop
├── prompts.ts             # System prompts
└── types.ts               # TypeScript types

src/lib/
├── userPreferences.ts     # Preference CRUD
├── aiMemory.ts            # Memory CRUD
└── userPatterns.ts        # Pattern detection
```

### Modified Files
```
src/app/api/ai/chat/route.ts  # New streaming endpoint
src/lib/db.ts                  # New tables
src/components/AIAgent.tsx     # Streaming + markdown fix
```

---

## Summary

Phase 1 transforms the AI from a simple chatbot into a capable agent that can:

1. **Execute reliably** - Structured tool calls instead of JSON parsing
2. **Research effectively** - Find real internships, jobs, information
3. **Plan intelligently** - Break down tasks, create schedules
4. **Learn continuously** - Remember preferences, observe patterns
5. **Act proactively** - Anticipate needs, surface issues

This foundation enables Phases 2-4 (Intelligence, Proactive, Learning) to build on solid infrastructure.
