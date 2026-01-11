import { listItems, createItem, type Item } from "./items";
import { listPlans, createPlan, updatePlan, calculatePlanProgress, type Plan, type PlanStep } from "./plans";
import { getActiveTrackedRepos, fetchRepoActivity, type TrackedRepo } from "./github";
import { webSearch, type SearchResult } from "./web-search";
import { analyzeRepository, generateImplementationSuggestion, generatePRDraft, type RepoAnalysis } from "./github-analyzer";

// ============ Types ============

export type PlannerMode = "research" | "code" | "planning" | "general";

export type PlannerContext = {
  mode: PlannerMode;
  currentDate: string;
  currentTime: string;
  items: {
    total: number;
    tasks: number;
    inProgress: number;
    overdue: number;
  };
  upcomingItems: Array<{
    id: string;
    title: string;
    type: string;
    dueAt?: string;
    priority: string;
  }>;
  activePlans: Array<{
    id: string;
    title: string;
    mode: string;
    progress: number;
  }>;
  trackedRepos: Array<{
    id: string;
    name: string;
    status: string;
  }>;
};

export type PlannerAction =
  | { type: "web_search"; data: WebSearchAction }
  | { type: "analyze_repo"; data: AnalyzeRepoAction }
  | { type: "suggest_implementation"; data: SuggestImplementationAction }
  | { type: "create_pr_draft"; data: CreatePRDraftAction }
  | { type: "create_plan"; data: CreatePlanAction }
  | { type: "schedule_tasks"; data: ScheduleTasksAction }
  | { type: "create_task"; data: CreateTaskAction }
  | { type: "get_context"; data: GetContextAction }
  | { type: "respond"; data: RespondAction };

type WebSearchAction = {
  query: string;
  filters?: {
    type?: "internships" | "companies" | "resources" | "tutorials";
    location?: string;
    remote?: boolean;
  };
};

type AnalyzeRepoAction = {
  repoId?: string;
  repoName?: string;
  analysisType: "structure" | "patterns" | "dependencies" | "full";
};

type SuggestImplementationAction = {
  feature: string;
  repoId?: string;
  context?: string;
};

type CreatePRDraftAction = {
  title: string;
  description: string;
  changes: Array<{
    file: string;
    action: "create" | "modify" | "delete";
    content?: string;
  }>;
  repoId?: string;
};

type CreatePlanAction = {
  title: string;
  goal: string;
  steps: Array<{
    title: string;
    description?: string;
    estimatedMinutes?: number;
    scheduledFor?: string;
  }>;
  mode?: PlannerMode;
  timeline?: {
    startDate?: string;
    endDate?: string;
  };
};

type ScheduleTasksAction = {
  tasks: Array<{
    title: string;
    priority: "urgent" | "high" | "medium" | "low";
    dueAt?: string;
    estimatedMinutes?: number;
    details?: string;
  }>;
  strategy: "now" | "tomorrow" | "spread" | "smart";
};

type CreateTaskAction = {
  title: string;
  type?: "task" | "meeting" | "school";
  priority?: "urgent" | "high" | "medium" | "low";
  dueAt?: string;
  details?: string;
  estimatedMinutes?: number;
};

type GetContextAction = {
  contextType: "items" | "repos" | "plans" | "all";
};

type RespondAction = {
  message: string;
};

export type PlannerResult = {
  success: boolean;
  message: string;
  data?: unknown;
  artifacts?: Array<{
    type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
    title: string;
    content: unknown;
  }>;
};

// ============ Context Building ============

export function buildPlannerContext(
  mode: PlannerMode,
  options: { userId: string }
): PlannerContext {
  const { userId } = options;
  const now = new Date();
  const items = listItems(undefined, { userId });
  const plans = listPlans({ status: "active" }, { userId });
  const repos = getActiveTrackedRepos(userId);

  const overdue = items.filter((i) => {
    if (!i.dueAt || i.status === "completed") return false;
    return new Date(i.dueAt) < now;
  });

  const upcoming = items
    .filter((i) => i.dueAt && i.status !== "completed" && new Date(i.dueAt) > now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  return {
    mode,
    currentDate: now.toISOString().split("T")[0],
    currentTime: now.toTimeString().split(" ")[0],
    items: {
      total: items.length,
      tasks: items.filter((i) => i.type === "task").length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      overdue: overdue.length,
    },
    upcomingItems: upcoming.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      dueAt: i.dueAt,
      priority: i.priority,
    })),
    activePlans: plans.map((p) => {
      const progress = calculatePlanProgress(p);
      return {
        id: p.id,
        title: p.title,
        mode: p.mode,
        progress: progress.percentage,
      };
    }),
    trackedRepos: repos.map((r) => ({
      id: r.id,
      name: `${r.repoOwner}/${r.repoName}`,
      status: r.status,
    })),
  };
}

// ============ System Prompts ============

export function getPlannerSystemPrompt(context: PlannerContext): string {
  const basePrompt = `You are an AI planning assistant in ${context.mode.toUpperCase()} mode. You help users plan, research, and execute their goals effectively.

CURRENT CONTEXT:
- Date: ${context.currentDate}
- Time: ${context.currentTime}
- Mode: ${context.mode}

TASK STATS:
- Total items: ${context.items.total}
- Tasks: ${context.items.tasks}
- In progress: ${context.items.inProgress}
- Overdue: ${context.items.overdue}

UPCOMING ITEMS:
${context.upcomingItems.map((i) => `- [${i.type}] "${i.title}" (${i.priority})${i.dueAt ? ` - Due: ${i.dueAt}` : ""}`).join("\n") || "None"}

ACTIVE PLANS:
${context.activePlans.map((p) => `- "${p.title}" (${p.mode}) - ${p.progress}% complete`).join("\n") || "None"}

TRACKED REPOS:
${context.trackedRepos.map((r) => `- ${r.name} (${r.status})`).join("\n") || "None"}`;

  const modeSpecificPrompts: Record<PlannerMode, string> = {
    research: `
MODE: RESEARCH
You help users find opportunities like internships, companies, resources, and learning materials.

CAPABILITIES:
1. web_search - Search for opportunities (internships, companies, resources)
2. create_task - Create tasks from findings
3. create_plan - Create research plans

When the user asks about internships, companies, or resources:
- Use web_search to find relevant results
- Summarize key findings
- Suggest follow-up actions`,

    code: `
MODE: CODE
You help users analyze repositories, suggest implementations, and generate PRs.

CAPABILITIES:
1. analyze_repo - Analyze repository structure, patterns, dependencies
2. suggest_implementation - Suggest how to implement features
3. create_pr_draft - Generate PR with changes
4. create_task - Create development tasks

When the user asks about implementing features:
- First analyze the relevant repo if available
- Suggest implementation approach
- Break down into tasks if needed
- Offer to generate PR draft`,

    planning: `
MODE: PLANNING
You help users create actionable plans, schedule tasks, and prioritize work.

CAPABILITIES:
1. create_plan - Create structured plans with steps
2. schedule_tasks - Schedule tasks using smart prioritization
3. create_task - Create individual tasks
4. get_context - Get current tasks and plans

When the user wants to plan:
- Understand their goal clearly
- Break it into actionable steps
- Consider time estimates
- Use schedule_tasks for smart scheduling`,

    general: `
MODE: GENERAL
You provide general assistance with task management and productivity.

CAPABILITIES:
1. create_task - Create tasks
2. get_context - Get current context
3. create_plan - Create simple plans

Help users with general questions about their tasks and productivity.`,
  };

  return `${basePrompt}

${modeSpecificPrompts[context.mode]}

RESPONSE FORMAT:
Always respond with valid JSON:

For actions:
{"action": "action_type", "data": {...}}

For conversation:
{"action": "respond", "data": {"message": "Your response"}}

You can also return multiple actions:
[{"action": "...", "data": {...}}, {"action": "...", "data": {...}}]

RULES:
- Always provide helpful, actionable responses
- When creating plans, be specific about steps
- Use appropriate actions based on the mode
- Be proactive in suggesting next steps
- For dates, use ISO format (YYYY-MM-DDTHH:mm:ss)`;
}

// ============ Action Execution ============

export async function executePlannerAction(
  action: PlannerAction,
  options: { userId: string }
): Promise<PlannerResult> {
  const { userId } = options;

  try {
    switch (action.type) {
      case "web_search": {
        const results = await performWebSearch(action.data);
        return {
          success: true,
          message: `Found ${results.length} results for "${action.data.query}"`,
          artifacts: [{
            type: "search_results",
            title: `Search: ${action.data.query}`,
            content: results,
          }],
        };
      }

      case "analyze_repo": {
        const analysis = await performRepoAnalysis(action.data, { userId });
        return {
          success: true,
          message: `Analyzed repository: ${analysis.name}`,
          artifacts: [{
            type: "repo_analysis",
            title: `Analysis: ${analysis.name}`,
            content: analysis,
          }],
        };
      }

      case "suggest_implementation": {
        const suggestion = await performImplementationSuggestion(action.data, { userId });
        return {
          success: true,
          message: "Generated implementation suggestion",
          artifacts: [{
            type: "code",
            title: `Implementation: ${action.data.feature}`,
            content: suggestion,
          }],
        };
      }

      case "create_pr_draft": {
        const pr = performPRDraftGeneration(action.data);
        return {
          success: true,
          message: `Created PR draft: "${action.data.title}"`,
          artifacts: [{
            type: "pr_draft",
            title: action.data.title,
            content: pr,
          }],
        };
      }

      case "create_plan": {
        const steps: PlanStep[] = action.data.steps.map((s, i) => ({
          id: crypto.randomUUID(),
          title: s.title,
          description: s.description,
          status: "pending",
          order: i,
          estimatedMinutes: s.estimatedMinutes,
          scheduledFor: s.scheduledFor,
        }));

        const plan = createPlan({
          title: action.data.title,
          goal: action.data.goal,
          mode: action.data.mode || "planning",
          steps,
          timeline: action.data.timeline,
        }, { userId });

        return {
          success: true,
          message: `Created plan: "${plan.title}" with ${steps.length} steps`,
          data: plan,
          artifacts: [{
            type: "plan",
            title: plan.title,
            content: plan,
          }],
        };
      }

      case "schedule_tasks": {
        const createdTasks: Item[] = [];
        const { tasks, strategy } = action.data;
        const now = new Date();

        // Get existing items to check for schedule conflicts
        const existingItems = listItems(undefined, { userId });
        const existingDueDates = existingItems
          .filter(i => i.dueAt && i.status !== "completed")
          .map(i => new Date(i.dueAt!).toDateString());

        // Calculate daily load for smart scheduling
        const dailyLoad: Record<string, number> = {};
        for (const item of existingItems) {
          if (item.dueAt && item.status !== "completed") {
            const dateKey = new Date(item.dueAt).toDateString();
            dailyLoad[dateKey] = (dailyLoad[dateKey] || 0) + (item.estimatedMinutes || 30);
          }
        }

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          let dueAt = task.dueAt;

          // Apply scheduling strategy
          if (!dueAt) {
            switch (strategy) {
              case "now": {
                const today = new Date(now);
                today.setHours(17, 0, 0, 0);
                dueAt = today.toISOString();
                break;
              }
              case "tomorrow": {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(17, 0, 0, 0);
                dueAt = tomorrow.toISOString();
                break;
              }
              case "spread": {
                const spreadDate = new Date(now);
                spreadDate.setDate(spreadDate.getDate() + i);
                spreadDate.setHours(17, 0, 0, 0);
                dueAt = spreadDate.toISOString();
                break;
              }
              case "smart": {
                // Smart scheduling considers:
                // 1. Priority (urgent = today, high = tomorrow, etc.)
                // 2. Estimated time
                // 3. Existing workload on each day
                // 4. Avoids overloading single days
                
                const baseDays = task.priority === "urgent" ? 0 
                  : task.priority === "high" ? 1 
                  : task.priority === "medium" ? 3 
                  : 7;
                
                let targetDate = new Date(now);
                targetDate.setDate(targetDate.getDate() + baseDays);
                
                // Find a day with capacity (max 4 hours = 240 minutes per day)
                const maxDailyMinutes = 240;
                const taskMinutes = task.estimatedMinutes || 30;
                let attempts = 0;
                
                while (attempts < 14) { // Look up to 2 weeks ahead
                  const dateKey = targetDate.toDateString();
                  const currentLoad = dailyLoad[dateKey] || 0;
                  
                  if (currentLoad + taskMinutes <= maxDailyMinutes) {
                    // Found a day with capacity
                    dailyLoad[dateKey] = currentLoad + taskMinutes;
                    break;
                  }
                  
                  // Try next day
                  targetDate.setDate(targetDate.getDate() + 1);
                  attempts++;
                }
                
                targetDate.setHours(17, 0, 0, 0);
                dueAt = targetDate.toISOString();
                break;
              }
            }
          }

          const item = createItem({
            type: "task",
            title: task.title,
            priority: task.priority,
            dueAt,
            details: task.details,
            estimatedMinutes: task.estimatedMinutes,
          }, { userId });

          createdTasks.push(item);
        }

        // Generate summary message
        const byDate: Record<string, string[]> = {};
        for (const task of createdTasks) {
          if (task.dueAt) {
            const dateStr = new Date(task.dueAt).toLocaleDateString();
            if (!byDate[dateStr]) byDate[dateStr] = [];
            byDate[dateStr].push(task.title);
          }
        }

        const scheduleSummary = Object.entries(byDate)
          .map(([date, titles]) => `${date}: ${titles.length} task(s)`)
          .join(", ");

        return {
          success: true,
          message: `Scheduled ${createdTasks.length} tasks using "${strategy}" strategy. ${scheduleSummary}`,
          data: createdTasks,
        };
      }

      case "create_task": {
        const item = createItem({
          type: action.data.type || "task",
          title: action.data.title,
          priority: action.data.priority || "medium",
          dueAt: action.data.dueAt,
          details: action.data.details,
          estimatedMinutes: action.data.estimatedMinutes,
        }, { userId });

        return {
          success: true,
          message: `Created task: "${item.title}"`,
          data: item,
        };
      }

      case "get_context": {
        const items = listItems(undefined, { userId });
        const plans = listPlans(undefined, { userId });
        const repos = getActiveTrackedRepos(userId);

        const contextData: Record<string, unknown> = {};
        
        if (action.data.contextType === "items" || action.data.contextType === "all") {
          contextData.items = items.slice(0, 10);
        }
        if (action.data.contextType === "plans" || action.data.contextType === "all") {
          contextData.plans = plans;
        }
        if (action.data.contextType === "repos" || action.data.contextType === "all") {
          contextData.repos = repos;
        }

        return {
          success: true,
          message: "Retrieved context",
          data: contextData,
        };
      }

      case "respond": {
        return {
          success: true,
          message: action.data.message,
        };
      }

      default:
        return {
          success: false,
          message: "Unknown action type",
        };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed",
    };
  }
}

// ============ Helper Functions ============

async function performWebSearch(data: WebSearchAction): Promise<SearchResult[]> {
  // Use the actual web search service
  const results = await webSearch({
    query: data.query,
    type: data.filters?.type,
    location: data.filters?.location,
    remote: data.filters?.remote,
    limit: 10,
  });
  
  return results;
}

async function performRepoAnalysis(
  data: AnalyzeRepoAction,
  options: { userId: string }
): Promise<RepoAnalysis> {
  const repos = getActiveTrackedRepos(options.userId);
  const repo = data.repoId 
    ? repos.find(r => r.id === data.repoId)
    : repos.find(r => `${r.repoOwner}/${r.repoName}` === data.repoName);

  if (repo) {
    // Use the actual GitHub analyzer
    return analyzeRepository(repo.repoOwner, repo.repoName, {
      userId: options.userId,
      depth: data.analysisType === "full" ? "deep" : "shallow",
    });
  }

  // Parse repoName if provided
  if (data.repoName) {
    const [owner, name] = data.repoName.split("/");
    if (owner && name) {
      return analyzeRepository(owner, name, {
        userId: options.userId,
        depth: data.analysisType === "full" ? "deep" : "shallow",
      });
    }
  }

  // Return basic analysis if no repo found
  return {
    name: "Unknown Repository",
    owner: "",
    structure: { name: "", type: "directory", path: "/", children: [] },
    techStack: { languages: [], frameworks: [], tools: [], buildTools: [] },
    patterns: [],
    metrics: {
      totalFiles: 0,
      contributors: 0,
      commits: 0,
      branches: 0,
      openIssues: 0,
      openPRs: 0,
      lastUpdated: new Date().toISOString(),
    },
    recommendations: [{
      type: "suggestion",
      title: "Repository Not Found",
      description: "Please specify a valid repository or track a repo first.",
      priority: "high",
      category: "documentation",
    }],
  };
}

async function performImplementationSuggestion(
  data: SuggestImplementationAction,
  options: { userId: string }
) {
  // Get repo analysis if available
  let analysis: RepoAnalysis | undefined;
  
  if (data.repoId) {
    const repos = getActiveTrackedRepos(options.userId);
    const repo = repos.find(r => r.id === data.repoId);
    if (repo) {
      analysis = await analyzeRepository(repo.repoOwner, repo.repoName, {
        userId: options.userId,
        depth: "shallow",
      });
    }
  }

  // Use the GitHub analyzer's implementation suggestion generator
  return generateImplementationSuggestion(data.feature, analysis);
}

function performPRDraftGeneration(data: CreatePRDraftAction) {
  return generatePRDraft(data.title, data.description, data.changes);
}

// ============ Parse Actions ============

export function parsePlannerActions(response: string): PlannerAction[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [{ type: "respond", data: { message: response } }];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const actions = Array.isArray(parsed) ? parsed : [parsed];

    return actions.map((a): PlannerAction => {
      if (a.action && a.data) {
        return { type: a.action, data: a.data };
      }
      if (a.type && a.data) {
        return a;
      }
      return { type: "respond", data: { message: JSON.stringify(a) } };
    });
  } catch {
    return [{ type: "respond", data: { message: response } }];
  }
}
