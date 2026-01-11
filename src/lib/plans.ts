import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import { logActivity } from "./activity";

// ============ Types ============

export type PlanStatus = "draft" | "active" | "completed" | "archived";
export type PlanMode = "research" | "code" | "planning" | "general";

export type PlanStep = {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  itemId?: string; // Link to created task
  order: number;
  estimatedMinutes?: number;
  scheduledFor?: string;
};

export type Plan = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  mode: PlanMode;
  status: PlanStatus;
  goal: string;
  context?: string; // JSON string of relevant context (repos, items, etc.)
  steps: PlanStep[];
  timeline?: {
    startDate?: string;
    endDate?: string;
  };
  linkedItemIds: string[]; // Items created from this plan
  linkedRepoIds: string[]; // GitHub repos linked to this plan
  conversationId?: string; // Link to conversation that created this plan
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PlanConversation = {
  id: string;
  userId: string;
  planId?: string;
  mode: PlanMode;
  title: string;
  messages: PlanMessage[];
  context?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PlanMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: PlannerAction[];
  artifacts?: PlanArtifact[];
  timestamp: string;
};

export type PlannerAction = {
  type: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: unknown;
};

export type PlanArtifact = {
  type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
  title: string;
  content: unknown;
};

// ============ Schemas ============

const planStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).default("pending"),
  itemId: z.string().optional(),
  order: z.number().int().min(0),
  estimatedMinutes: z.number().int().positive().optional(),
  scheduledFor: z.string().datetime().optional(),
});

const planCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  mode: z.enum(["research", "code", "planning", "general"]).default("general"),
  goal: z.string().min(1),
  context: z.string().optional(),
  steps: z.array(planStepSchema).optional().default([]),
  timeline: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).optional(),
  linkedItemIds: z.array(z.string()).optional().default([]),
  linkedRepoIds: z.array(z.string()).optional().default([]),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const planUpdateSchema = planCreateSchema.partial().extend({
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

const conversationCreateSchema = z.object({
  mode: z.enum(["research", "code", "planning", "general"]).default("general"),
  title: z.string().optional(),
  planId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// ============ Database Setup ============

function getPlansTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'draft',
      goal TEXT NOT NULL,
      context TEXT,
      steps TEXT NOT NULL DEFAULT '[]',
      timeline TEXT,
      linkedItemIds TEXT NOT NULL DEFAULT '[]',
      linkedRepoIds TEXT NOT NULL DEFAULT '[]',
      conversationId TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  return db;
}

function getPlanConversationsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_conversations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      planId TEXT,
      mode TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      context TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  return db;
}

// ============ Plan CRUD ============

type PlanRow = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  mode: PlanMode;
  status: PlanStatus;
  goal: string;
  context: string | null;
  steps: string;
  timeline: string | null;
  linkedItemIds: string;
  linkedRepoIds: string;
  conversationId: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapPlanRow(row: PlanRow): Plan {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? undefined,
    mode: row.mode,
    status: row.status,
    goal: row.goal,
    context: row.context ?? undefined,
    steps: JSON.parse(row.steps) as PlanStep[],
    timeline: row.timeline ? JSON.parse(row.timeline) : undefined,
    linkedItemIds: JSON.parse(row.linkedItemIds) as string[],
    linkedRepoIds: JSON.parse(row.linkedRepoIds) as string[],
    conversationId: row.conversationId ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPlan(
  input: z.input<typeof planCreateSchema>,
  options?: { userId?: string }
): Plan {
  const data = planCreateSchema.parse(input);
  const db = getPlansTable();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  // Add IDs to steps if not present
  const stepsWithIds = data.steps.map((step, index) => ({
    ...step,
    id: step.id || randomUUID(),
    order: step.order ?? index,
  }));

  db.prepare(`
    INSERT INTO plans (
      id, userId, title, description, mode, status, goal, context,
      steps, timeline, linkedItemIds, linkedRepoIds, conversationId, metadata,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.title,
    data.description ?? null,
    data.mode,
    "draft",
    data.goal,
    data.context ?? null,
    JSON.stringify(stepsWithIds),
    data.timeline ? JSON.stringify(data.timeline) : null,
    JSON.stringify(data.linkedItemIds),
    JSON.stringify(data.linkedRepoIds),
    data.conversationId ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null,
    now,
    now
  );

  logActivity({
    userId,
    action: "plan_created",
    data: { planId: id, title: data.title, mode: data.mode },
  });

  return getPlan(id, { userId })!;
}

export function getPlan(id: string, options?: { userId?: string }): Plan | null {
  const db = getPlansTable();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db.prepare(
    "SELECT * FROM plans WHERE id = ? AND userId = ?"
  ).get(id, userId) as PlanRow | undefined;

  if (!row) return null;
  return mapPlanRow(row);
}

export function listPlans(
  filters?: { status?: PlanStatus; mode?: PlanMode },
  options?: { userId?: string }
): Plan[] {
  const db = getPlansTable();
  const userId = options?.userId ?? getDefaultUserId();
  
  const clauses: string[] = ["userId = ?"];
  const params: (string | undefined)[] = [userId];

  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.mode) {
    clauses.push("mode = ?");
    params.push(filters.mode);
  }

  const rows = db.prepare(`
    SELECT * FROM plans
    WHERE ${clauses.join(" AND ")}
    ORDER BY updatedAt DESC
  `).all(...params) as PlanRow[];

  return rows.map(mapPlanRow);
}

export function updatePlan(
  id: string,
  patch: z.input<typeof planUpdateSchema>,
  options?: { userId?: string }
): Plan | null {
  const data = planUpdateSchema.parse(patch);
  const db = getPlansTable();
  const now = new Date().toISOString();
  const userId = options?.userId ?? getDefaultUserId();

  const existing = getPlan(id, { userId });
  if (!existing) return null;

  // Merge steps if provided
  const steps = data.steps 
    ? data.steps.map((step, index) => ({
        ...step,
        id: step.id || randomUUID(),
        order: step.order ?? index,
      }))
    : existing.steps;

  db.prepare(`
    UPDATE plans SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      mode = COALESCE(?, mode),
      status = COALESCE(?, status),
      goal = COALESCE(?, goal),
      context = COALESCE(?, context),
      steps = ?,
      timeline = COALESCE(?, timeline),
      linkedItemIds = COALESCE(?, linkedItemIds),
      linkedRepoIds = COALESCE(?, linkedRepoIds),
      conversationId = COALESCE(?, conversationId),
      metadata = COALESCE(?, metadata),
      updatedAt = ?
    WHERE id = ? AND userId = ?
  `).run(
    data.title ?? null,
    data.description ?? null,
    data.mode ?? null,
    data.status ?? null,
    data.goal ?? null,
    data.context ?? null,
    JSON.stringify(steps),
    data.timeline ? JSON.stringify(data.timeline) : null,
    data.linkedItemIds ? JSON.stringify(data.linkedItemIds) : null,
    data.linkedRepoIds ? JSON.stringify(data.linkedRepoIds) : null,
    data.conversationId ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null,
    now,
    id,
    userId
  );

  logActivity({
    userId,
    action: "plan_updated",
    data: { planId: id, updates: Object.keys(data) },
  });

  return getPlan(id, { userId });
}

export function deletePlan(id: string, options?: { userId?: string }): boolean {
  const db = getPlansTable();
  const userId = options?.userId ?? getDefaultUserId();
  const result = db.prepare("DELETE FROM plans WHERE id = ? AND userId = ?").run(id, userId);

  if (result.changes > 0) {
    logActivity({
      userId,
      action: "plan_deleted",
      data: { planId: id },
    });
  }

  return result.changes > 0;
}

// ============ Plan Step Operations ============

export function updatePlanStep(
  planId: string,
  stepId: string,
  updates: Partial<PlanStep>,
  options?: { userId?: string }
): Plan | null {
  const plan = getPlan(planId, options);
  if (!plan) return null;

  const stepIndex = plan.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return null;

  plan.steps[stepIndex] = { ...plan.steps[stepIndex], ...updates };

  return updatePlan(planId, { steps: plan.steps }, options);
}

export function addPlanStep(
  planId: string,
  step: Omit<PlanStep, "id">,
  options?: { userId?: string }
): Plan | null {
  const plan = getPlan(planId, options);
  if (!plan) return null;

  const newStep: PlanStep = {
    ...step,
    id: randomUUID(),
    order: step.order ?? plan.steps.length,
  };

  return updatePlan(planId, { steps: [...plan.steps, newStep] }, options);
}

export function removePlanStep(
  planId: string,
  stepId: string,
  options?: { userId?: string }
): Plan | null {
  const plan = getPlan(planId, options);
  if (!plan) return null;

  const newSteps = plan.steps.filter(s => s.id !== stepId);
  return updatePlan(planId, { steps: newSteps }, options);
}

// ============ Conversation CRUD ============

type ConversationRow = {
  id: string;
  userId: string;
  planId: string | null;
  mode: PlanMode;
  title: string;
  messages: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapConversationRow(row: ConversationRow): PlanConversation {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId ?? undefined,
    mode: row.mode,
    title: row.title,
    messages: JSON.parse(row.messages) as PlanMessage[],
    context: row.context ? JSON.parse(row.context) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createConversation(
  input: z.input<typeof conversationCreateSchema>,
  options?: { userId?: string }
): PlanConversation {
  const data = conversationCreateSchema.parse(input);
  const db = getPlanConversationsTable();
  const now = new Date().toISOString();
  const id = randomUUID();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(`
    INSERT INTO plan_conversations (id, userId, planId, mode, title, messages, context, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.planId ?? null,
    data.mode,
    data.title || `${data.mode.charAt(0).toUpperCase() + data.mode.slice(1)} Session`,
    "[]",
    data.context ? JSON.stringify(data.context) : null,
    now,
    now
  );

  return getConversation(id, { userId })!;
}

export function getConversation(id: string, options?: { userId?: string }): PlanConversation | null {
  const db = getPlanConversationsTable();
  const userId = options?.userId ?? getDefaultUserId();
  const row = db.prepare(
    "SELECT * FROM plan_conversations WHERE id = ? AND userId = ?"
  ).get(id, userId) as ConversationRow | undefined;

  if (!row) return null;
  return mapConversationRow(row);
}

export function listConversations(
  filters?: { mode?: PlanMode; planId?: string },
  options?: { userId?: string }
): PlanConversation[] {
  const db = getPlanConversationsTable();
  const userId = options?.userId ?? getDefaultUserId();
  
  const clauses: string[] = ["userId = ?"];
  const params: (string | undefined)[] = [userId];

  if (filters?.mode) {
    clauses.push("mode = ?");
    params.push(filters.mode);
  }
  if (filters?.planId) {
    clauses.push("planId = ?");
    params.push(filters.planId);
  }

  const rows = db.prepare(`
    SELECT * FROM plan_conversations
    WHERE ${clauses.join(" AND ")}
    ORDER BY updatedAt DESC
    LIMIT 50
  `).all(...params) as ConversationRow[];

  return rows.map(mapConversationRow);
}

export function addMessageToConversation(
  conversationId: string,
  message: Omit<PlanMessage, "id" | "timestamp">,
  options?: { userId?: string }
): PlanConversation | null {
  const db = getPlanConversationsTable();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  const conversation = getConversation(conversationId, { userId });
  if (!conversation) return null;

  const newMessage: PlanMessage = {
    ...message,
    id: randomUUID(),
    timestamp: now,
  };

  const messages = [...conversation.messages, newMessage];

  db.prepare(`
    UPDATE plan_conversations SET messages = ?, updatedAt = ?
    WHERE id = ? AND userId = ?
  `).run(JSON.stringify(messages), now, conversationId, userId);

  return getConversation(conversationId, { userId });
}

export function updateConversation(
  id: string,
  updates: { title?: string; planId?: string; context?: Record<string, unknown> },
  options?: { userId?: string }
): PlanConversation | null {
  const db = getPlanConversationsTable();
  const userId = options?.userId ?? getDefaultUserId();
  const now = new Date().toISOString();

  const existing = getConversation(id, { userId });
  if (!existing) return null;

  db.prepare(`
    UPDATE plan_conversations SET
      title = COALESCE(?, title),
      planId = COALESCE(?, planId),
      context = COALESCE(?, context),
      updatedAt = ?
    WHERE id = ? AND userId = ?
  `).run(
    updates.title ?? null,
    updates.planId ?? null,
    updates.context ? JSON.stringify(updates.context) : null,
    now,
    id,
    userId
  );

  return getConversation(id, { userId });
}

export function deleteConversation(id: string, options?: { userId?: string }): boolean {
  const db = getPlanConversationsTable();
  const userId = options?.userId ?? getDefaultUserId();
  const result = db.prepare("DELETE FROM plan_conversations WHERE id = ? AND userId = ?").run(id, userId);
  return result.changes > 0;
}

// ============ Plan Progress ============

export function calculatePlanProgress(plan: Plan): {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  nextStep?: PlanStep;
} {
  const totalSteps = plan.steps.length;
  const completedSteps = plan.steps.filter(s => s.status === "completed").length;
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const nextStep = plan.steps
    .filter(s => s.status === "pending" || s.status === "in_progress")
    .sort((a, b) => a.order - b.order)[0];

  return { totalSteps, completedSteps, percentage, nextStep };
}

// ============ Plan to Items ============

export async function convertPlanToItems(
  planId: string,
  options?: { userId?: string }
): Promise<string[]> {
  const { createItem } = await import("./items");
  const plan = getPlan(planId, options);
  if (!plan) return [];

  const createdItemIds: string[] = [];

  for (const step of plan.steps) {
    if (!step.itemId) {
      const item = createItem({
        type: "task",
        title: step.title,
        details: step.description,
        estimatedMinutes: step.estimatedMinutes,
        dueAt: step.scheduledFor,
      }, options);

      // Update the step with the created item ID
      updatePlanStep(planId, step.id, { itemId: item.id }, options);
      createdItemIds.push(item.id);
    }
  }

  // Update plan with linked item IDs
  updatePlan(planId, {
    linkedItemIds: [...plan.linkedItemIds, ...createdItemIds],
    status: "active",
  }, options);

  return createdItemIds;
}

// ============ Conversation to Plan Conversion ============

export type ConversationAnalysis = {
  suggestedTitle: string;
  suggestedGoal: string;
  extractedSteps: Array<{
    title: string;
    description?: string;
    estimatedMinutes?: number;
  }>;
  suggestedMode: PlanMode;
  confidence: number; // 0-100
};

/**
 * Analyzes a conversation and extracts a potential plan structure
 */
export function analyzeConversationForPlan(
  conversation: PlanConversation
): ConversationAnalysis {
  const messages = conversation.messages;
  const userMessages = messages.filter(m => m.role === "user");
  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Extract potential goal from first user message
  const firstUserMessage = userMessages[0]?.content || "";
  const suggestedGoal = extractGoal(firstUserMessage);

  // Generate title from goal
  const suggestedTitle = generateTitleFromGoal(suggestedGoal);

  // Extract action items and steps from the conversation
  const extractedSteps = extractStepsFromConversation(messages);

  // Determine confidence based on conversation quality
  const confidence = calculateConfidence(messages, extractedSteps);

  return {
    suggestedTitle,
    suggestedGoal,
    extractedSteps,
    suggestedMode: conversation.mode,
    confidence,
  };
}

function extractGoal(message: string): string {
  // Common goal-indicating phrases
  const goalPatterns = [
    /i want to (.+?)(?:\.|$)/i,
    /i need to (.+?)(?:\.|$)/i,
    /help me (.+?)(?:\.|$)/i,
    /i'm trying to (.+?)(?:\.|$)/i,
    /my goal is to (.+?)(?:\.|$)/i,
    /i'd like to (.+?)(?:\.|$)/i,
    /can you help (?:me )?(.+?)(?:\?|$)/i,
  ];

  for (const pattern of goalPatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, use the first sentence (up to 100 chars)
  const firstSentence = message.split(/[.!?]/)[0] || message;
  return firstSentence.slice(0, 100).trim();
}

function generateTitleFromGoal(goal: string): string {
  // Capitalize first letter and limit length
  const title = goal.charAt(0).toUpperCase() + goal.slice(1);
  if (title.length > 50) {
    return title.slice(0, 47) + "...";
  }
  return title;
}

function extractStepsFromConversation(
  messages: PlanMessage[]
): Array<{ title: string; description?: string; estimatedMinutes?: number }> {
  const steps: Array<{ title: string; description?: string; estimatedMinutes?: number }> = [];
  
  // Look for numbered lists, bullet points, or action items in assistant messages
  for (const message of messages) {
    if (message.role !== "assistant") continue;

    const content = message.content;

    // Pattern 1: Numbered lists (1. Step, 2. Step)
    const numberedMatches = content.matchAll(/^\s*\d+\.\s*(.+?)$/gm);
    for (const match of numberedMatches) {
      if (match[1] && !isMetaContent(match[1])) {
        steps.push({
          title: match[1].trim().slice(0, 100),
          estimatedMinutes: estimateMinutes(match[1]),
        });
      }
    }

    // Pattern 2: Bullet points (- Step, • Step, * Step)
    const bulletMatches = content.matchAll(/^\s*[-•*]\s*(.+?)$/gm);
    for (const match of bulletMatches) {
      if (match[1] && !isMetaContent(match[1])) {
        steps.push({
          title: match[1].trim().slice(0, 100),
          estimatedMinutes: estimateMinutes(match[1]),
        });
      }
    }

    // Pattern 3: Action verbs at start of sentences
    const actionMatches = content.matchAll(/(?:^|\. )((?:Create|Build|Implement|Add|Set up|Configure|Install|Write|Design|Test|Review|Check|Update|Fix|Refactor)[^.]+\.)/gi);
    for (const match of actionMatches) {
      if (match[1] && !steps.some(s => s.title.toLowerCase().includes(match[1].toLowerCase().slice(0, 20)))) {
        steps.push({
          title: match[1].trim().slice(0, 100),
          estimatedMinutes: estimateMinutes(match[1]),
        });
      }
    }

    // Check for artifacts that might contain plan steps
    if (message.artifacts) {
      for (const artifact of message.artifacts) {
        if (artifact.type === "plan" && artifact.content) {
          const planContent = artifact.content as { steps?: Array<{ title: string; description?: string; estimatedMinutes?: number }> };
          if (planContent.steps) {
            for (const step of planContent.steps) {
              if (!steps.some(s => s.title === step.title)) {
                steps.push(step);
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate and limit steps
  const uniqueSteps = steps.filter((step, index, self) =>
    index === self.findIndex(s => 
      s.title.toLowerCase() === step.title.toLowerCase() ||
      s.title.toLowerCase().includes(step.title.toLowerCase().slice(0, 20))
    )
  );

  return uniqueSteps.slice(0, 20); // Limit to 20 steps
}

function isMetaContent(text: string): boolean {
  // Filter out meta content that isn't a real step
  const metaPatterns = [
    /^here['']?s/i,
    /^let me/i,
    /^i can/i,
    /^i'll/i,
    /^you can/i,
    /^for example/i,
    /^note:/i,
    /^tip:/i,
  ];
  return metaPatterns.some(p => p.test(text.trim()));
}

function estimateMinutes(stepText: string): number {
  const text = stepText.toLowerCase();
  
  // Quick tasks (15 min)
  if (text.includes("check") || text.includes("review") || text.includes("verify")) {
    return 15;
  }
  
  // Short tasks (30 min)
  if (text.includes("update") || text.includes("fix") || text.includes("add")) {
    return 30;
  }
  
  // Medium tasks (60 min)
  if (text.includes("create") || text.includes("implement") || text.includes("write")) {
    return 60;
  }
  
  // Longer tasks (120 min)
  if (text.includes("design") || text.includes("build") || text.includes("develop")) {
    return 120;
  }
  
  // Default
  return 30;
}

function calculateConfidence(messages: PlanMessage[], steps: Array<{ title: string }>): number {
  let confidence = 50; // Base confidence

  // More messages = more context = higher confidence
  confidence += Math.min(messages.length * 5, 20);

  // More steps extracted = higher confidence
  confidence += Math.min(steps.length * 3, 15);

  // Presence of artifacts increases confidence
  const hasArtifacts = messages.some(m => m.artifacts && m.artifacts.length > 0);
  if (hasArtifacts) confidence += 10;

  // Presence of actions increases confidence
  const hasActions = messages.some(m => m.actions && m.actions.length > 0);
  if (hasActions) confidence += 5;

  return Math.min(confidence, 95); // Cap at 95%
}

/**
 * Converts a conversation into a plan
 */
export function convertConversationToPlan(
  conversationId: string,
  overrides?: Partial<{
    title: string;
    goal: string;
    steps: Array<{ title: string; description?: string; estimatedMinutes?: number }>;
  }>,
  options?: { userId?: string }
): Plan | null {
  const conversation = getConversation(conversationId, options);
  if (!conversation) return null;

  const analysis = analyzeConversationForPlan(conversation);

  // Create the plan with analyzed or overridden values
  const plan = createPlan({
    title: overrides?.title || analysis.suggestedTitle,
    goal: overrides?.goal || analysis.suggestedGoal,
    mode: conversation.mode,
    steps: (overrides?.steps || analysis.extractedSteps).map((step, index) => ({
      ...step,
      status: "pending" as const,
      order: index,
    })),
    conversationId,
    metadata: {
      analysisConfidence: analysis.confidence,
      convertedAt: new Date().toISOString(),
    },
  }, options);

  // Link the plan to the conversation
  updateConversation(conversationId, { planId: plan.id }, options);

  return plan;
}
