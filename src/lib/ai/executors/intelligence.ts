import type { ToolResult, ToolExecutionContext } from "../types";
import { generateMorningBriefing, type BriefingConfig } from "../features/briefing";
import { suggestReschedule } from "../features/rescheduling";
import { analyzeDependencies, generateDependencyRecommendations } from "../features/dependencies";
import { analyzeGoalAlignment } from "../features/goalAlignment";
import { assembleFullContext, assembleQuickContext, assembleContextWithFocus } from "../context/assembler";
import { getPatternContext } from "../context/patterns";
import { getWorkloadContext } from "../context/workload";
import { getPriorityContext } from "../context/priority";
import type { UserContext, RescheduleContext, RescheduleConstraints } from "../context/types";

export async function executeGetMorningBriefing(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const config: Partial<BriefingConfig> = {
      includeCalendar: input.includeCalendar !== false,
      includePriorities: input.includePriorities !== false,
      includeHabits: input.includeHabits !== false,
      includeInsights: input.includeInsights !== false,
      maxItems: (input.maxItems as number) || 5,
      verbosity: (input.verbosity as BriefingConfig["verbosity"]) || "normal",
    };

    const briefing = generateMorningBriefing(ctx.userId, config);

    return {
      success: true,
      data: {
        greeting: briefing.greeting,
        date: briefing.date,
        sections: briefing.sections,
        suggestedFocus: briefing.suggestedFocus
          ? {
              item: briefing.suggestedFocus.item,
              reason: briefing.suggestedFocus.reason,
              estimatedMinutes: briefing.suggestedFocus.estimatedMinutes,
            }
          : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate morning briefing",
    };
  }
}

export async function executeSuggestReschedule(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const itemId = input.itemId as string;
    const reason = input.reason as RescheduleContext["reason"];

    if (!itemId) {
      return { success: false, error: "itemId is required" };
    }

    const constraints: RescheduleConstraints = {};
    if (input.notBefore) constraints.notBefore = new Date(input.notBefore as string);
    if (input.notAfter) constraints.notAfter = new Date(input.notAfter as string);
    if (input.avoidWeekends) constraints.avoidWeekends = input.avoidWeekends as boolean;
    if (input.avoidDays) constraints.avoidDays = input.avoidDays as string[];
    if (input.preferredTimeOfDay) {
      constraints.preferredTimeOfDay = input.preferredTimeOfDay as "morning" | "afternoon" | "evening";
    }

    const options = suggestReschedule(ctx.userId, itemId, reason, constraints);

    return {
      success: true,
      data: {
        itemId,
        reason,
        options: options.map((opt) => ({
          newDueAt: opt.newDueAt.toISOString(),
          confidence: Math.round(opt.confidence * 100),
          reasoning: opt.reasoning,
          impact: {
            conflictsCreated: opt.impact.conflictsCreated,
            cascadeEffects: opt.impact.cascadeEffects.length,
            capacityChange: opt.impact.capacityChange,
          },
        })),
        recommendation: options.length > 0
          ? `Recommended: ${options[0].newDueAt.toLocaleDateString()} (${Math.round(options[0].confidence * 100)}% confidence)`
          : "No suitable time slots found",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to suggest reschedule options",
    };
  }
}

export async function executeAnalyzeDependencies(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const includeRecommendations = input.includeRecommendations !== false;
    const focusOnCriticalPath = input.focusOnCriticalPath !== false;
    const maxChains = (input.maxChains as number) || 5;

    const graph = analyzeDependencies(ctx.userId);

    const result: Record<string, unknown> = {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.length,
    };

    if (focusOnCriticalPath) {
      result.criticalPath = {
        length: graph.criticalPath.length,
        items: graph.criticalPath.map((id) => {
          const node = graph.nodes.get(id);
          return node ? { id, title: node.item.title, status: node.item.status } : { id };
        }),
      };
    }

    result.blockedChains = graph.blockedChains.slice(0, maxChains).map((chain) => ({
      blocker: {
        id: chain.rootBlocker.id,
        title: chain.rootBlocker.title,
      },
      chainLength: chain.chainLength,
      totalBlockedItems: chain.totalBlockedItems,
      totalBlockedHours: Math.round(chain.totalBlockedHours * 10) / 10,
      impact: chain.unblockImpact,
    }));

    if (includeRecommendations) {
      result.recommendations = generateDependencyRecommendations(graph);
    }

    result.summary = graph.blockedChains.length > 0
      ? `${graph.blockedChains.length} blocking chains found. Top blocker: "${graph.blockedChains[0].rootBlocker.title}"`
      : "No blocking dependencies found";

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze dependencies",
    };
  }
}

export async function executeAnalyzeGoalAlignment(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const includeAreaBreakdown = input.includeAreaBreakdown !== false;
    const includeDriftAnalysis = input.includeDriftAnalysis !== false;
    const includeRecommendations = input.includeRecommendations !== false;

    const analysis = analyzeGoalAlignment(ctx.userId);

    const result: Record<string, unknown> = {
      overallAlignment: Math.round(analysis.overallAlignment * 100),
      byGoal: analysis.byGoal.map((g) => ({
        goal: g.goal.title,
        progress: Math.round(g.progress * 100),
        alignedHours: Math.round(g.alignedHours * 10) / 10,
        trend: g.trend,
        projectedCompletion: g.projectedCompletion?.toLocaleDateString() || null,
      })),
    };

    if (includeAreaBreakdown) {
      result.byArea = analysis.byArea.map((a) => ({
        area: a.area,
        itemCount: a.itemCount,
        hoursAllocated: Math.round(a.hoursAllocated * 10) / 10,
        percentageOfTotal: Math.round(a.percentageOfTotal * 100),
        trend: a.trend,
        daysSinceLastActivity: a.lastActivity
          ? Math.floor((Date.now() - a.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));
    }

    if (includeDriftAnalysis) {
      result.drift = {
        isDrifting: analysis.drift.isDrifting,
        severity: analysis.drift.driftSeverity,
        direction: analysis.drift.driftDirection,
        explanation: analysis.drift.explanation,
      };
    }

    if (includeRecommendations) {
      result.recommendations = analysis.recommendations.map((r) => ({
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
      }));
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze goal alignment",
    };
  }
}

export async function executeGetUserContext(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const quick = input.quick as boolean;
    const sections = input.sections as Array<keyof UserContext> | undefined;

    let context: Partial<UserContext>;

    if (quick) {
      context = assembleQuickContext({ userId: ctx.userId });
    } else if (sections && sections.length > 0) {
      context = assembleContextWithFocus({ userId: ctx.userId }, sections);
    } else {
      context = assembleFullContext({ userId: ctx.userId });
    }

    // Serialize the context for safe JSON response
    const serialized: Record<string, unknown> = {};

    if (context.temporal) {
      serialized.temporal = {
        now: context.temporal.now.toISOString(),
        timeOfDay: context.temporal.timeOfDay,
        dayOfWeek: context.temporal.dayOfWeek,
        weekNumber: context.temporal.weekOfYear,
        daysUntilWeekend: context.temporal.daysUntilEndOfWeek,
        isWeekend: context.temporal.isWeekend,
      };
    }

    if (context.workload) {
      serialized.workload = {
        totalOpenItems: context.workload.totalOpenItems,
        dueToday: context.workload.dueTodayCount,
        dueThisWeek: context.workload.dueThisWeekCount,
        overdue: context.workload.overdueCount,
        capacityUtilization: Math.round(context.workload.capacityUtilization * 100),
        streakDays: context.workload.streakDays,
        completedToday: context.workload.completedToday,
      };
    }

    if (context.calendar) {
      serialized.calendar = {
        meetingsToday: context.calendar.meetingsToday.length,
        totalMeetingHoursThisWeek: context.calendar.totalMeetingHoursThisWeek,
        nextMeeting: context.calendar.nextMeeting?.title || null,
        minutesUntilNextMeeting: context.calendar.minutesUntilNextMeeting,
        freeBlocksToday: context.calendar.freeBlocksToday.length,
      };
    }

    if (context.priorities) {
      serialized.priorities = {
        criticalItems: context.priorities.criticalItems.length,
        blockingItems: context.priorities.blockingItems.length,
        blockedItems: context.priorities.blockedItems.length,
        quickWins: context.priorities.quickWins.length,
        atRiskDeadlines: context.priorities.atRiskDeadlines.length,
      };
    }

    if (context.goals) {
      serialized.goals = {
        activeGoals: context.goals.activeGoals.length,
        alignedWorkThisWeek: Math.round(context.goals.alignedWorkThisWeek * 100),
        neglectedAreas: context.goals.neglectedAreas,
      };
    }

    if (context.patterns) {
      serialized.patterns = {
        productiveHours: context.patterns.productiveHours,
        estimationAccuracy: Math.round(context.patterns.estimationAccuracy * 100),
        averageTaskDuration: context.patterns.averageTaskDuration,
        focusSessionAverage: context.patterns.focusSessionAverage,
      };
    }

    if (context.habits) {
      const streakValues = Object.values(context.habits.streaks);
      const longestStreak = streakValues.length > 0 ? Math.max(...streakValues) : 0;
      serialized.habits = {
        todaysHabits: context.habits.todaysHabits.length,
        habitCompletionRate: Math.round(context.habits.habitCompletionRate * 100),
        longestStreak,
      };
    }

    if (context.recentActivity) {
      serialized.recentActivity = {
        recentlyViewed: context.recentActivity.recentlyViewed.length,
        lastActiveAt: context.recentActivity.lastActiveAt?.toISOString() || null,
        completedToday: context.recentActivity.todaysCompletions.length,
        currentFocusSession: context.recentActivity.currentFocusSession?.itemTitle || null,
      };
    }

    if (context.memory) {
      serialized.memory = {
        recentTopics: context.memory.recentTopics,
        ongoingProjects: context.memory.ongoingProjects,
        mentionedConstraints: context.memory.mentionedConstraints.length,
        expressedFrustrations: context.memory.expressedFrustrations.length,
      };
    }

    return { success: true, data: serialized };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user context",
    };
  }
}

export async function executeGetFocusRecommendation(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const availableMinutes = (input.availableMinutes as number) || 60;
    const energyLevel = (input.energyLevel as string) || "medium";
    const preferQuickWins = input.preferQuickWins as boolean;
    const excludeTypes = input.excludeTypes as string[] | undefined;

    const priorities = getPriorityContext(ctx.userId);
    const workload = getWorkloadContext(ctx.userId);

    // Filter items based on constraints
    let candidates = [
      ...priorities.criticalItems,
      ...priorities.blockingItems,
      ...priorities.quickWins,
    ];

    // Remove duplicates
    candidates = candidates.filter(
      (item, index, self) => self.findIndex((i) => i.id === item.id) === index
    );

    // Exclude types if specified
    if (excludeTypes && excludeTypes.length > 0) {
      candidates = candidates.filter((item) => !excludeTypes.includes(item.type));
    }

    // Filter by time available
    candidates = candidates.filter(
      (item) => (item.estimatedMinutes || 30) <= availableMinutes
    );

    // Score candidates
    const scored = candidates.map((item) => {
      let score = 0;

      // Priority boost
      if (item.priority === "urgent") score += 40;
      else if (item.priority === "high") score += 30;
      else if (item.priority === "medium") score += 20;
      else score += 10;

      // Blocking boost
      if (priorities.blockingItems.some((b) => b.id === item.id)) {
        score += 25;
      }

      // Quick win preference
      if (preferQuickWins && (item.estimatedMinutes || 30) <= 30) {
        score += 20;
      }

      // Energy level matching
      const estimatedEffort = (item.estimatedMinutes || 60) / 60;
      if (energyLevel === "high" && estimatedEffort >= 1) {
        score += 15; // Tackle bigger tasks when energy is high
      } else if (energyLevel === "low" && estimatedEffort < 0.5) {
        score += 15; // Prefer smaller tasks when tired
      }

      // Overdue penalty/boost
      if (item.dueAt && new Date(item.dueAt) < new Date()) {
        score += 35; // Overdue items get high priority
      }

      return { item, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const recommendation = scored[0];

    if (!recommendation) {
      return {
        success: true,
        data: {
          recommendation: null,
          message: "No suitable tasks found for your current availability and energy level",
          alternatives: [],
        },
      };
    }

    return {
      success: true,
      data: {
        recommendation: {
          item: {
            id: recommendation.item.id,
            title: recommendation.item.title,
            type: recommendation.item.type,
            priority: recommendation.item.priority,
            estimatedMinutes: recommendation.item.estimatedMinutes || 30,
          },
          score: recommendation.score,
          reasoning: generateFocusReasoning(recommendation.item, energyLevel, preferQuickWins),
        },
        alternatives: scored.slice(1, 4).map((s) => ({
          id: s.item.id,
          title: s.item.title,
          estimatedMinutes: s.item.estimatedMinutes || 30,
        })),
        stats: {
          candidatesConsidered: candidates.length,
          availableMinutes,
          energyLevel,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get focus recommendation",
    };
  }
}

function generateFocusReasoning(
  item: { priority?: string; estimatedMinutes?: number; dueAt?: string },
  energyLevel: string,
  preferQuickWins: boolean
): string {
  const reasons: string[] = [];

  if (item.dueAt && new Date(item.dueAt) < new Date()) {
    reasons.push("This is overdue and needs immediate attention");
  } else if (item.priority === "urgent") {
    reasons.push("Marked as urgent priority");
  } else if (item.priority === "high") {
    reasons.push("High priority item");
  }

  const estimatedMinutes = item.estimatedMinutes || 30;
  if (preferQuickWins && estimatedMinutes <= 30) {
    reasons.push("Quick win to build momentum");
  }

  if (energyLevel === "high" && estimatedMinutes >= 60) {
    reasons.push("Good match for your current high energy");
  } else if (energyLevel === "low" && estimatedMinutes <= 30) {
    reasons.push("Manageable task for current energy level");
  }

  return reasons.length > 0 ? reasons.join(". ") : "Best available option based on priorities";
}

export async function executeAnalyzeWorkload(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const period = (input.period as string) || "this_week";
    const includeCapacityAnalysis = input.includeCapacityAnalysis !== false;
    const includeSuggestions = input.includeSuggestions !== false;

    const workload = getWorkloadContext(ctx.userId);
    const priorities = getPriorityContext(ctx.userId);

    const result: Record<string, unknown> = {
      period,
      overview: {
        totalOpenItems: workload.totalOpenItems,
        dueToday: workload.dueTodayCount,
        dueThisWeek: workload.dueThisWeekCount,
        overdue: workload.overdueCount,
        completedToday: workload.completedToday,
        streakDays: workload.streakDays,
      },
    };

    if (includeCapacityAnalysis) {
      const utilizationPercent = Math.round(workload.capacityUtilization * 100);
      let capacityStatus: string;

      if (utilizationPercent > 120) {
        capacityStatus = "significantly_overloaded";
      } else if (utilizationPercent > 100) {
        capacityStatus = "overloaded";
      } else if (utilizationPercent > 80) {
        capacityStatus = "near_capacity";
      } else if (utilizationPercent > 50) {
        capacityStatus = "balanced";
      } else {
        capacityStatus = "under_utilized";
      }

      result.capacity = {
        availableHoursThisWeek: workload.availableHoursThisWeek,
        committedHoursThisWeek: workload.estimatedHoursRemaining,
        utilizationPercent,
        status: capacityStatus,
      };
    }

    if (includeSuggestions) {
      const suggestions: string[] = [];

      if (workload.capacityUtilization > 1.2) {
        const excessHours = Math.round(
          (workload.capacityUtilization - 1) * workload.availableHoursThisWeek
        );
        suggestions.push(
          `You're ${excessHours} hours over capacity. Consider deferring ${Math.ceil(excessHours / 2)} tasks.`
        );
      }

      if (workload.overdueCount > 0) {
        suggestions.push(
          `${workload.overdueCount} items are overdue. Prioritize these or reschedule with realistic dates.`
        );
      }

      if (priorities.blockingItems.length > 0) {
        suggestions.push(
          `Focus on the ${priorities.blockingItems.length} blocking items to unblock other work.`
        );
      }

      if (workload.dueTodayCount > 5) {
        suggestions.push(
          "Heavy day ahead. Consider moving some items to tomorrow if not critical."
        );
      }

      if (workload.streakDays >= 7) {
        suggestions.push(
          `Great ${workload.streakDays}-day streak! Keep the momentum going.`
        );
      }

      result.suggestions = suggestions;
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze workload",
    };
  }
}

export async function executeGetPatternInsights(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const insightTypes = (input.insightTypes as string[]) || [
      "productive_hours",
      "completion_patterns",
      "estimation_accuracy",
    ];
    const lookbackDays = (input.lookbackDays as number) || 30;

    const patterns = getPatternContext(ctx.userId);

    const result: Record<string, unknown> = {
      lookbackDays,
      requestedInsights: insightTypes,
    };

    if (insightTypes.includes("productive_hours")) {
      result.productiveHours = {
        peakHours: patterns.productiveHours,
        insight:
          patterns.productiveHours.length > 0
            ? `Your most productive hours are: ${patterns.productiveHours.join(", ")}`
            : "Not enough data to determine productive hours yet",
      };
    }

    if (insightTypes.includes("completion_patterns")) {
      const bestDays = Object.entries(patterns.completionRateByDay)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      result.completionPatterns = {
        byDay: patterns.completionRateByDay,
        bestDays: bestDays.map(([day, rate]) => ({
          day,
          rate: Math.round(rate * 100),
        })),
        insight:
          bestDays.length > 0
            ? `You complete the most tasks on ${bestDays[0][0]}s`
            : "Not enough completion data yet",
      };
    }

    if (insightTypes.includes("estimation_accuracy")) {
      const accuracyPercent = Math.round(patterns.estimationAccuracy * 100);
      let accuracyLevel: string;
      let tip: string;

      if (accuracyPercent >= 90) {
        accuracyLevel = "excellent";
        tip = "Your estimates are very accurate!";
      } else if (accuracyPercent >= 70) {
        accuracyLevel = "good";
        tip = "Minor improvements could help with planning";
      } else if (accuracyPercent >= 50) {
        accuracyLevel = "fair";
        tip = "Try adding 50% buffer to your estimates";
      } else {
        accuracyLevel = "needs_improvement";
        tip = "Consider doubling your initial time estimates";
      }

      result.estimationAccuracy = {
        accuracyPercent,
        level: accuracyLevel,
        averageTaskDuration: patterns.averageTaskDuration,
        tip,
      };
    }

    if (insightTypes.includes("area_distribution")) {
      result.areaDistribution = {
        note: "Use analyze_goal_alignment for detailed area breakdown",
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get pattern insights",
    };
  }
}
