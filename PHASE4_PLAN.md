# Phase 4: Adaptive Learning - Detailed Implementation Plan

## Vision

Create an AI that **gets smarter the more you use it**. It learns your patterns, preferences, and working style to provide increasingly personalized and accurate assistance.

The AI should:
- Recognize how YOU work (not generic advice)
- Improve its predictions over time
- Adapt suggestions to your actual behavior
- Remember what works and what doesn't
- Feel like it truly "knows" you

---

## Core Philosophy

**Phase 1**: AI can do things (execution)
**Phase 2**: AI understands context (intelligence)
**Phase 3**: AI acts proactively (anticipation)
**Phase 4**: AI learns and adapts (personalization)

### The Learning Loop

```
     ┌─────────────────────────────────────┐
     │                                     │
     ▼                                     │
┌─────────┐    ┌─────────┐    ┌─────────┐  │
│ Observe │───▶│ Learn   │───▶│ Apply   │──┘
└─────────┘    └─────────┘    └─────────┘
     │              │              │
     │              │              │
  User actions   Patterns      Better
  & feedback     & models     suggestions
```

---

## Part 1: Learning Framework

### 1.1 What the AI Learns

```typescript
// src/lib/ai/learning/types.ts

interface LearnableAspects {
  // Temporal Patterns
  productiveHours: HourlyProductivity[];     // When you get most done
  preferredWorkTimes: WorkTimePreference[];   // When you prefer to work
  focusDuration: FocusPattern;               // How long you can focus
  breakPatterns: BreakPattern;               // When/how you take breaks

  // Task Patterns
  estimationAccuracy: EstimationModel;       // How accurate are your estimates
  completionPatterns: CompletionPattern[];   // How you complete different types
  procrastinationTriggers: string[];         // What causes delays
  taskPreferences: TaskPreference[];         // Types you prefer/avoid

  // Priority Patterns
  actualPrioritization: PriorityPattern;     // How you actually prioritize
  urgencyResponse: UrgencyPattern;           // How you handle urgent items
  deadlineBehavior: DeadlinePattern;         // How you approach deadlines

  // Communication Patterns
  responsePreferences: ResponsePreference;   // Brief vs detailed responses
  notificationTolerance: NotificationPattern; // How many is too many
  feedbackStyle: FeedbackPreference;         // How to deliver feedback

  // Work Style
  batchVsSwitch: WorkStylePattern;           // Batch similar vs context switch
  morningVsEvening: ChronotypePatttern;      // Early bird vs night owl
  planningStyle: PlanningPattern;            // Detailed planner vs spontaneous

  // Goal Patterns
  goalPersistence: GoalPattern[];            // How you stick to goals
  habitFormation: HabitFormationPattern;     // How habits stick
  motivationTriggers: string[];              // What motivates you
}

interface HourlyProductivity {
  hour: number; // 0-23
  dayOfWeek: string;
  averageCompletions: number;
  averageFocusMinutes: number;
  confidenceScore: number; // Based on sample size
}

interface EstimationModel {
  averageAccuracy: number; // 1.0 = perfect, >1 = overestimate, <1 = underestimate
  byTaskType: Record<string, number>;
  byPriority: Record<string, number>;
  byEstimatedSize: Record<string, number>; // small/medium/large
  trend: "improving" | "stable" | "declining";
}

interface CompletionPattern {
  taskType: string;
  averageTimeToComplete: number; // minutes
  completionRate: number; // % of created tasks completed
  commonBlockers: string[];
  bestTimeToWork: string[];
}
```

### 1.2 Learning Engine

```typescript
// src/lib/ai/learning/engine.ts

interface LearningEngine {
  // Observation
  observe(event: UserEvent): Promise<void>;

  // Pattern extraction
  extractPatterns(userId: string): Promise<LearnedPatterns>;

  // Model updates
  updateModels(userId: string): Promise<void>;

  // Predictions
  predictCompletionTime(item: Item, userId: string): Promise<TimePrediction>;
  predictProductivity(timeSlot: TimeSlot, userId: string): Promise<ProductivityPrediction>;
  predictSuccess(suggestion: Suggestion, userId: string): Promise<SuccessPrediction>;

  // Adaptation
  adaptSuggestions(suggestions: Suggestion[], userId: string): Promise<Suggestion[]>;
  adaptNotifications(userId: string): Promise<NotificationAdaptation>;
}

class LearningEngineImpl implements LearningEngine {
  private observers: PatternObserver[] = [];
  private models: Map<string, UserModel> = new Map();

  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;

    // Log the event
    await logLearningEvent(userId, event);

    // Notify all observers
    for (const observer of this.observers) {
      if (observer.interestedIn(type)) {
        await observer.observe(event);
      }
    }

    // Check if models need updating
    const eventCount = await getRecentEventCount(userId);
    if (eventCount % 10 === 0) { // Update models every 10 events
      await this.updateModels(userId);
    }
  }

  async updateModels(userId: string): Promise<void> {
    const events = await getLearningEvents(userId, { days: 30 });
    const currentModel = this.models.get(userId) || createEmptyModel();

    // Update each aspect
    const updatedModel: UserModel = {
      ...currentModel,
      productivityPattern: await updateProductivityPattern(events, currentModel),
      estimationModel: await updateEstimationModel(events, currentModel),
      completionPatterns: await updateCompletionPatterns(events, currentModel),
      workStyle: await updateWorkStyleModel(events, currentModel),
      preferences: await updatePreferenceModel(events, currentModel),
      lastUpdated: new Date()
    };

    this.models.set(userId, updatedModel);
    await persistModel(userId, updatedModel);
  }

  async predictCompletionTime(item: Item, userId: string): Promise<TimePrediction> {
    const model = await this.getModel(userId);

    // Get historical data for similar items
    const similarItems = await getSimilarCompletedItems(item, userId);

    // Base estimate
    const userEstimate = item.estimatedMinutes || 60;

    // Adjust based on estimation accuracy
    const accuracyFactor = model.estimationModel.byTaskType[item.type] ||
                          model.estimationModel.averageAccuracy;
    const adjustedEstimate = userEstimate * (1 / accuracyFactor);

    // Consider complexity indicators
    const complexityMultiplier = calculateComplexityMultiplier(item, model);

    // Calculate confidence based on data quality
    const confidence = calculatePredictionConfidence(similarItems.length, model);

    return {
      estimatedMinutes: Math.round(adjustedEstimate * complexityMultiplier),
      confidenceInterval: {
        low: Math.round(adjustedEstimate * 0.7),
        high: Math.round(adjustedEstimate * 1.5)
      },
      confidence,
      reasoning: generatePredictionReasoning(item, model, accuracyFactor)
    };
  }

  async adaptSuggestions(
    suggestions: Suggestion[],
    userId: string
  ): Promise<Suggestion[]> {
    const model = await this.getModel(userId);
    const suggestionHistory = await getSuggestionHistory(userId);

    return suggestions.map(suggestion => {
      // Calculate acceptance probability
      const acceptanceProbability = predictSuggestionAcceptance(
        suggestion,
        model,
        suggestionHistory
      );

      // Adjust priority based on learned preferences
      const adjustedPriority = adjustPriorityForUser(
        suggestion.priority,
        model.preferences
      );

      // Modify wording based on communication preferences
      const adjustedMessage = adaptMessageStyle(
        suggestion.message,
        model.preferences.responseStyle
      );

      return {
        ...suggestion,
        priority: adjustedPriority,
        message: adjustedMessage,
        predictedAcceptance: acceptanceProbability,
        personalizationApplied: true
      };
    }).sort((a, b) => b.predictedAcceptance - a.predictedAcceptance);
  }
}
```

### 1.3 Pattern Observers

```typescript
// src/lib/ai/learning/observers/productivity.ts

class ProductivityObserver implements PatternObserver {
  interestedIn(eventType: string): boolean {
    return ["item_completed", "focus_session_ended", "item_started"].includes(eventType);
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;
    const hour = timestamp.getHours();
    const dayOfWeek = getDayOfWeek(timestamp);

    if (type === "item_completed") {
      await recordCompletion(userId, {
        hour,
        dayOfWeek,
        itemType: data.item.type,
        duration: data.actualDuration,
        estimatedDuration: data.item.estimatedMinutes
      });
    }

    if (type === "focus_session_ended") {
      await recordFocusSession(userId, {
        hour,
        dayOfWeek,
        duration: data.duration,
        completedItems: data.completedItems,
        interrupted: data.wasInterrupted
      });
    }
  }
}

// src/lib/ai/learning/observers/estimation.ts

class EstimationObserver implements PatternObserver {
  interestedIn(eventType: string): boolean {
    return eventType === "item_completed";
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, data } = event;
    const { item, actualDuration } = data;

    if (!item.estimatedMinutes || !actualDuration) return;

    const accuracy = item.estimatedMinutes / actualDuration;

    await recordEstimationAccuracy(userId, {
      itemId: item.id,
      itemType: item.type,
      priority: item.priority,
      estimated: item.estimatedMinutes,
      actual: actualDuration,
      accuracy,
      overUnder: accuracy > 1 ? "over" : "under"
    });
  }
}

// src/lib/ai/learning/observers/behavior.ts

class BehaviorObserver implements PatternObserver {
  interestedIn(eventType: string): boolean {
    return [
      "suggestion_accepted",
      "suggestion_dismissed",
      "notification_clicked",
      "notification_ignored",
      "item_rescheduled",
      "priority_changed"
    ].includes(eventType);
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;

    switch (type) {
      case "suggestion_accepted":
        await recordSuggestionOutcome(userId, {
          suggestionType: data.suggestionType,
          accepted: true,
          timeToAction: data.timeToAction,
          context: data.context
        });
        break;

      case "suggestion_dismissed":
        await recordSuggestionOutcome(userId, {
          suggestionType: data.suggestionType,
          accepted: false,
          reason: data.reason,
          context: data.context
        });
        break;

      case "item_rescheduled":
        await recordReschedulePattern(userId, {
          originalDue: data.originalDue,
          newDue: data.newDue,
          daysShifted: data.daysShifted,
          reason: data.reason,
          wasOverdue: data.wasOverdue
        });
        break;
    }
  }
}
```

---

## Part 2: Specific Learning Models

### 2.1 Productivity Time Model

```typescript
// src/lib/ai/learning/models/productivity.ts

interface ProductivityModel {
  hourlyScores: Map<number, HourScore>; // 0-23
  dayOfWeekScores: Map<string, DayScore>;
  combinedScores: Map<string, number>; // "monday-9" -> score
  optimalFocusDuration: number;
  optimalBreakFrequency: number;
  peakProductivityWindows: TimeWindow[];
}

interface HourScore {
  completionRate: number;
  averageQuality: number;
  focusability: number;
  sampleSize: number;
  trend: "improving" | "stable" | "declining";
}

async function updateProductivityPattern(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<ProductivityModel> {
  const completions = events.filter(e => e.type === "item_completed");
  const focusSessions = events.filter(e => e.type === "focus_session_ended");

  // Calculate hourly scores
  const hourlyScores = new Map<number, HourScore>();
  for (let hour = 0; hour < 24; hour++) {
    const hourCompletions = completions.filter(e => e.timestamp.getHours() === hour);
    const hourFocus = focusSessions.filter(e => e.timestamp.getHours() === hour);

    if (hourCompletions.length + hourFocus.length < 3) {
      // Not enough data - use prior or default
      hourlyScores.set(hour, currentModel?.productivityPattern?.hourlyScores?.get(hour) || defaultHourScore(hour));
      continue;
    }

    hourlyScores.set(hour, {
      completionRate: hourCompletions.length / Math.max(getWorkdaysInPeriod(events), 1),
      averageQuality: calculateAverageQuality(hourCompletions),
      focusability: calculateFocusability(hourFocus),
      sampleSize: hourCompletions.length + hourFocus.length,
      trend: calculateTrend(hourCompletions, currentModel?.productivityPattern?.hourlyScores?.get(hour))
    });
  }

  // Find optimal focus duration
  const focusDurations = focusSessions
    .filter(s => s.data.completedItems > 0)
    .map(s => s.data.duration);
  const optimalFocusDuration = calculateOptimalDuration(focusDurations);

  // Identify peak windows
  const peakWindows = identifyPeakWindows(hourlyScores);

  return {
    hourlyScores,
    dayOfWeekScores: calculateDayScores(completions),
    combinedScores: calculateCombinedScores(hourlyScores, completions),
    optimalFocusDuration,
    optimalBreakFrequency: Math.round(optimalFocusDuration / 25) * 5, // 5 min per 25 min focus
    peakProductivityWindows: peakWindows
  };
}

function identifyPeakWindows(hourlyScores: Map<number, HourScore>): TimeWindow[] {
  const windows: TimeWindow[] = [];
  const threshold = 0.7; // Top 30% of productivity

  // Find max score
  const maxScore = Math.max(...Array.from(hourlyScores.values()).map(s => s.completionRate));

  // Find consecutive hours above threshold
  let windowStart: number | null = null;
  for (let hour = 0; hour < 24; hour++) {
    const score = hourlyScores.get(hour)!;
    const isAboveThreshold = score.completionRate >= maxScore * threshold;

    if (isAboveThreshold && windowStart === null) {
      windowStart = hour;
    } else if (!isAboveThreshold && windowStart !== null) {
      windows.push({
        start: windowStart,
        end: hour,
        score: calculateWindowScore(hourlyScores, windowStart, hour),
        label: labelTimeWindow(windowStart, hour)
      });
      windowStart = null;
    }
  }

  return windows.sort((a, b) => b.score - a.score).slice(0, 3);
}
```

### 2.2 Estimation Calibration Model

```typescript
// src/lib/ai/learning/models/estimation.ts

interface EstimationCalibrationModel {
  globalAccuracy: number;
  byTaskType: Record<string, TaskTypeEstimation>;
  bySize: Record<string, SizeEstimation>;
  byComplexity: ComplexityEstimation;
  improvementSuggestions: string[];
}

interface TaskTypeEstimation {
  accuracy: number;
  averageError: number;
  sampleSize: number;
  bias: "overestimate" | "underestimate" | "accurate";
  suggestedMultiplier: number;
}

async function updateEstimationModel(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<EstimationCalibrationModel> {
  const completions = events.filter(e =>
    e.type === "item_completed" &&
    e.data.item.estimatedMinutes &&
    e.data.actualDuration
  );

  if (completions.length < 5) {
    return currentModel?.estimationModel || defaultEstimationModel();
  }

  // Calculate by task type
  const byTaskType: Record<string, TaskTypeEstimation> = {};
  const types = [...new Set(completions.map(c => c.data.item.type))];

  for (const type of types) {
    const typeCompletions = completions.filter(c => c.data.item.type === type);
    const accuracies = typeCompletions.map(c =>
      c.data.item.estimatedMinutes / c.data.actualDuration
    );

    const avgAccuracy = average(accuracies);
    const avgError = average(typeCompletions.map(c =>
      Math.abs(c.data.item.estimatedMinutes - c.data.actualDuration)
    ));

    byTaskType[type] = {
      accuracy: avgAccuracy,
      averageError: avgError,
      sampleSize: typeCompletions.length,
      bias: avgAccuracy > 1.2 ? "overestimate" :
            avgAccuracy < 0.8 ? "underestimate" : "accurate",
      suggestedMultiplier: 1 / avgAccuracy
    };
  }

  // Calculate by size (small < 30min, medium 30-120, large > 120)
  const bySize = calculateSizeEstimations(completions);

  // Generate improvement suggestions
  const suggestions = generateEstimationSuggestions(byTaskType, bySize);

  return {
    globalAccuracy: average(Object.values(byTaskType).map(t => t.accuracy)),
    byTaskType,
    bySize,
    byComplexity: calculateComplexityEstimation(completions),
    improvementSuggestions: suggestions
  };
}

function generateEstimationSuggestions(
  byType: Record<string, TaskTypeEstimation>,
  bySize: Record<string, SizeEstimation>
): string[] {
  const suggestions: string[] = [];

  // Check for consistent overestimation
  const overestimators = Object.entries(byType)
    .filter(([_, est]) => est.bias === "overestimate" && est.sampleSize >= 3);

  if (overestimators.length > 0) {
    const types = overestimators.map(([type]) => type).join(", ");
    suggestions.push(
      `You tend to overestimate ${types} tasks. Try reducing estimates by ~${Math.round((average(overestimators.map(([_, e]) => e.suggestedMultiplier)) - 1) * 100)}%`
    );
  }

  // Check for consistent underestimation
  const underestimators = Object.entries(byType)
    .filter(([_, est]) => est.bias === "underestimate" && est.sampleSize >= 3);

  if (underestimators.length > 0) {
    const types = underestimators.map(([type]) => type).join(", ");
    suggestions.push(
      `You tend to underestimate ${types} tasks. Consider adding buffer time.`
    );
  }

  // Check for size-based patterns
  if (bySize["large"]?.bias === "underestimate") {
    suggestions.push(
      "Large tasks (2+ hours) often take longer than expected. Consider breaking them down."
    );
  }

  return suggestions;
}
```

### 2.3 Preference Learning Model

```typescript
// src/lib/ai/learning/models/preferences.ts

interface PreferenceModel {
  communicationStyle: CommunicationPreference;
  notificationPreferences: NotificationPreferenceModel;
  suggestionPreferences: SuggestionPreferenceModel;
  workStyle: WorkStylePreference;
  implicitPreferences: ImplicitPreference[];
}

interface CommunicationPreference {
  preferredLength: "brief" | "moderate" | "detailed";
  tonePreference: "casual" | "professional" | "encouraging";
  emojiUsage: "never" | "sometimes" | "often";
  technicalLevel: "simple" | "moderate" | "technical";
  confidence: number;
}

interface SuggestionPreferenceModel {
  acceptanceRateByType: Record<string, number>;
  preferredTimingByType: Record<string, string>;
  dismissalReasons: Record<string, number>;
  mostValuableSuggestions: string[];
  leastValuableSuggestions: string[];
}

async function updatePreferenceModel(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<PreferenceModel> {
  // Analyze suggestion interactions
  const suggestions = events.filter(e =>
    e.type === "suggestion_accepted" || e.type === "suggestion_dismissed"
  );

  const acceptanceByType: Record<string, { accepted: number; total: number }> = {};
  for (const event of suggestions) {
    const type = event.data.suggestionType;
    if (!acceptanceByType[type]) {
      acceptanceByType[type] = { accepted: 0, total: 0 };
    }
    acceptanceByType[type].total++;
    if (event.type === "suggestion_accepted") {
      acceptanceByType[type].accepted++;
    }
  }

  const acceptanceRateByType: Record<string, number> = {};
  for (const [type, data] of Object.entries(acceptanceByType)) {
    acceptanceRateByType[type] = data.total > 0 ? data.accepted / data.total : 0.5;
  }

  // Analyze notification interactions
  const notifications = events.filter(e =>
    e.type === "notification_clicked" || e.type === "notification_ignored"
  );
  const notificationPreferences = analyzeNotificationPreferences(notifications);

  // Infer communication preferences from interaction patterns
  const communicationStyle = inferCommunicationStyle(events, currentModel);

  // Identify implicit preferences
  const implicitPreferences = extractImplicitPreferences(events);

  return {
    communicationStyle,
    notificationPreferences,
    suggestionPreferences: {
      acceptanceRateByType,
      preferredTimingByType: analyzePreferredTiming(suggestions),
      dismissalReasons: aggregateDismissalReasons(suggestions),
      mostValuableSuggestions: identifyValuableSuggestions(acceptanceRateByType),
      leastValuableSuggestions: identifyLowValueSuggestions(acceptanceRateByType)
    },
    workStyle: inferWorkStyle(events),
    implicitPreferences
  };
}

function inferCommunicationStyle(
  events: LearningEvent[],
  currentModel: UserModel
): CommunicationPreference {
  // Analyze how user interacts with responses
  const messageInteractions = events.filter(e => e.type === "message_feedback");

  // Check if user asks for elaboration (prefers detail)
  const elaborationRequests = events.filter(e =>
    e.type === "user_message" &&
    (e.data.content.toLowerCase().includes("more detail") ||
     e.data.content.toLowerCase().includes("explain") ||
     e.data.content.toLowerCase().includes("tell me more"))
  );

  // Check if user asks to be brief
  const brevityRequests = events.filter(e =>
    e.type === "user_message" &&
    (e.data.content.toLowerCase().includes("briefly") ||
     e.data.content.toLowerCase().includes("tldr") ||
     e.data.content.toLowerCase().includes("just tell me"))
  );

  let preferredLength: CommunicationPreference["preferredLength"] = "moderate";
  if (elaborationRequests.length > brevityRequests.length * 2) {
    preferredLength = "detailed";
  } else if (brevityRequests.length > elaborationRequests.length * 2) {
    preferredLength = "brief";
  }

  // Calculate confidence based on sample size
  const totalInteractions = elaborationRequests.length + brevityRequests.length;
  const confidence = Math.min(totalInteractions / 20, 1);

  return {
    preferredLength,
    tonePreference: inferTonePreference(events),
    emojiUsage: inferEmojiPreference(events),
    technicalLevel: inferTechnicalLevel(events),
    confidence
  };
}

function extractImplicitPreferences(events: LearningEvent[]): ImplicitPreference[] {
  const preferences: ImplicitPreference[] = [];

  // Time-based patterns
  const completionTimes = events
    .filter(e => e.type === "item_completed")
    .map(e => e.timestamp.getHours());

  if (completionTimes.length > 10) {
    const avgCompletionHour = average(completionTimes);
    if (avgCompletionHour < 10) {
      preferences.push({
        category: "work_style",
        key: "chronotype",
        value: "morning_person",
        confidence: 0.7,
        source: "observed"
      });
    } else if (avgCompletionHour > 18) {
      preferences.push({
        category: "work_style",
        key: "chronotype",
        value: "evening_person",
        confidence: 0.7,
        source: "observed"
      });
    }
  }

  // Task type preferences
  const taskTypes = events
    .filter(e => e.type === "item_created")
    .map(e => e.data.item.type);

  const typeCounts = countBy(taskTypes);
  const dominantType = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (dominantType && dominantType[1] > taskTypes.length * 0.5) {
    preferences.push({
      category: "task_preferences",
      key: "dominant_type",
      value: dominantType[0],
      confidence: 0.8,
      source: "observed"
    });
  }

  return preferences;
}
```

---

## Part 3: Feedback Loop

### 3.1 Explicit Feedback Collection

```typescript
// src/lib/ai/learning/feedback.ts

type FeedbackType =
  | "suggestion_rating"
  | "prediction_accuracy"
  | "preference_correction"
  | "feature_request"
  | "general_feedback";

interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  context: Record<string, unknown>;
  rating?: number; // 1-5
  comment?: string;
  correction?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
  timestamp: Date;
}

async function collectSuggestionFeedback(
  userId: string,
  suggestionId: string,
  outcome: "accepted" | "dismissed" | "modified",
  details?: {
    rating?: number;
    reason?: string;
    modification?: unknown;
  }
): Promise<void> {
  const feedback: Feedback = {
    id: generateId(),
    userId,
    type: "suggestion_rating",
    context: {
      suggestionId,
      outcome,
      ...details
    },
    rating: details?.rating,
    comment: details?.reason,
    timestamp: new Date()
  };

  await saveFeedback(feedback);

  // Immediately incorporate strong signals
  if (outcome === "dismissed" && details?.reason) {
    await incorporateDismissalReason(userId, suggestionId, details.reason);
  }

  if (details?.rating && details.rating <= 2) {
    await flagLowRatedSuggestion(userId, suggestionId);
  }
}

async function collectPredictionFeedback(
  userId: string,
  predictionType: string,
  predicted: unknown,
  actual: unknown
): Promise<void> {
  const accuracy = calculatePredictionAccuracy(predicted, actual);

  const feedback: Feedback = {
    id: generateId(),
    userId,
    type: "prediction_accuracy",
    context: {
      predictionType,
      predicted,
      actual,
      accuracy
    },
    timestamp: new Date()
  };

  await saveFeedback(feedback);

  // Update prediction model
  await updatePredictionModelWithFeedback(userId, predictionType, accuracy);
}

async function collectPreferenceCorrection(
  userId: string,
  category: string,
  correctedValue: unknown,
  previousValue: unknown
): Promise<void> {
  const feedback: Feedback = {
    id: generateId(),
    userId,
    type: "preference_correction",
    context: { category },
    correction: {
      field: category,
      oldValue: previousValue,
      newValue: correctedValue
    },
    timestamp: new Date()
  };

  await saveFeedback(feedback);

  // Immediately update preference
  await updateUserPreference(userId, category, correctedValue, "explicit");
}
```

### 3.2 Implicit Feedback Detection

```typescript
// src/lib/ai/learning/implicitFeedback.ts

interface ImplicitSignal {
  type: string;
  strength: "weak" | "medium" | "strong";
  interpretation: string;
  action: string;
}

function detectImplicitFeedback(events: LearningEvent[]): ImplicitSignal[] {
  const signals: ImplicitSignal[] = [];

  // Pattern: User immediately reschedules after AI schedule suggestion
  const scheduleSuggestions = events.filter(e => e.type === "schedule_suggested");
  const reschedules = events.filter(e => e.type === "item_rescheduled");

  for (const suggestion of scheduleSuggestions) {
    const quickReschedule = reschedules.find(r =>
      r.data.itemId === suggestion.data.itemId &&
      differenceInMinutes(r.timestamp, suggestion.timestamp) < 5
    );

    if (quickReschedule) {
      signals.push({
        type: "schedule_preference",
        strength: "medium",
        interpretation: `User prefers ${quickReschedule.data.newTime} over suggested ${suggestion.data.suggestedTime}`,
        action: "adjust_scheduling_model"
      });
    }
  }

  // Pattern: User consistently ignores certain notification types
  const notifications = events.filter(e => e.type === "notification_sent");
  const interactions = events.filter(e =>
    e.type === "notification_clicked" || e.type === "notification_dismissed"
  );

  const notificationsByType = groupBy(notifications, "data.type");
  for (const [type, typeNotifications] of Object.entries(notificationsByType)) {
    const typeInteractions = interactions.filter(i =>
      typeNotifications.some(n => n.data.id === i.data.notificationId)
    );

    const interactionRate = typeInteractions.length / typeNotifications.length;

    if (interactionRate < 0.2 && typeNotifications.length >= 5) {
      signals.push({
        type: "notification_preference",
        strength: "strong",
        interpretation: `User rarely engages with "${type}" notifications (${Math.round(interactionRate * 100)}% rate)`,
        action: "reduce_notification_frequency"
      });
    }
  }

  // Pattern: User works during "non-productive" hours
  const completionsDuringLowHours = events.filter(e =>
    e.type === "item_completed" &&
    isLowProductivityHour(e.timestamp.getHours(), e.userId)
  );

  if (completionsDuringLowHours.length > 5) {
    signals.push({
      type: "productivity_pattern",
      strength: "medium",
      interpretation: "User is productive during previously identified 'low' hours",
      action: "recalibrate_productivity_model"
    });
  }

  return signals;
}
```

---

## Part 4: Adaptive Behavior

### 4.1 Adaptive Suggestions

```typescript
// src/lib/ai/learning/adaptive/suggestions.ts

async function generateAdaptiveSuggestions(
  userId: string,
  context: UserContext
): Promise<AdaptiveSuggestion[]> {
  const model = await getLearningModel(userId);
  const baseSuggestions = await generateBaseSuggestions(context);

  const adaptedSuggestions = baseSuggestions.map(suggestion => {
    // Skip suggestions the user typically dismisses
    const historicalAcceptance = model.suggestionPreferences.acceptanceRateByType[suggestion.type];
    if (historicalAcceptance !== undefined && historicalAcceptance < 0.2) {
      return null; // Don't bother suggesting
    }

    // Adjust timing based on when user typically accepts this type
    const preferredTime = model.suggestionPreferences.preferredTimingByType[suggestion.type];
    if (preferredTime && !isNearTime(preferredTime)) {
      suggestion.delayUntil = parseTime(preferredTime);
    }

    // Adjust priority based on user's actual behavior
    if (model.workStyle.urgencyResponse === "delayed" && suggestion.priority === "high") {
      // User tends to handle "urgent" things later - don't over-prioritize
      suggestion.priority = "medium";
    }

    // Adjust wording based on communication preferences
    suggestion.message = adaptMessage(
      suggestion.message,
      model.communicationStyle
    );

    // Add confidence score
    suggestion.confidence = calculateSuggestionConfidence(suggestion, model);

    return suggestion;
  }).filter(Boolean);

  // Sort by predicted acceptance
  return adaptedSuggestions.sort((a, b) =>
    (b.confidence * (model.suggestionPreferences.acceptanceRateByType[b.type] || 0.5)) -
    (a.confidence * (model.suggestionPreferences.acceptanceRateByType[a.type] || 0.5))
  );
}

function adaptMessage(
  message: string,
  style: CommunicationPreference
): string {
  let adapted = message;

  // Adjust length
  if (style.preferredLength === "brief") {
    adapted = truncateToEssentials(adapted);
  } else if (style.preferredLength === "detailed") {
    // Keep as is or expand
  }

  // Adjust tone
  if (style.tonePreference === "casual") {
    adapted = casualizeTone(adapted);
  } else if (style.tonePreference === "professional") {
    adapted = formalizeTone(adapted);
  }

  // Adjust emoji usage
  if (style.emojiUsage === "never") {
    adapted = removeEmojis(adapted);
  } else if (style.emojiUsage === "often") {
    adapted = addRelevantEmojis(adapted);
  }

  return adapted;
}
```

### 4.2 Adaptive Notifications

```typescript
// src/lib/ai/learning/adaptive/notifications.ts

async function adaptNotificationDelivery(
  userId: string,
  notification: ProactiveNotification
): Promise<AdaptedNotification> {
  const model = await getLearningModel(userId);
  const prefs = model.notificationPreferences;

  // Check if this notification type is valuable to user
  const typeValue = prefs.valueByType[notification.type];
  if (typeValue !== undefined && typeValue < 0.3) {
    // User doesn't find this valuable - skip or downgrade
    if (notification.priority !== "urgent") {
      return { skip: true, reason: "low_value_type" };
    }
  }

  // Determine optimal channel
  const optimalChannel = determineOptimalChannel(notification, prefs);

  // Determine optimal timing
  const optimalTime = determineOptimalTiming(notification, prefs, model);

  // Determine if should be grouped
  const shouldGroup = prefs.groupingPreference === "aggressive" ||
    (prefs.groupingPreference === "moderate" && notification.priority === "low");

  return {
    skip: false,
    channel: optimalChannel,
    deliverAt: optimalTime,
    groupWith: shouldGroup ? findSimilarPending(userId, notification) : null,
    adaptedMessage: adaptMessage(notification.message, model.communicationStyle)
  };
}

function determineOptimalTiming(
  notification: ProactiveNotification,
  prefs: NotificationPreferenceModel,
  model: UserModel
): Date {
  const now = new Date();

  // Urgent notifications go immediately
  if (notification.priority === "urgent") {
    return now;
  }

  // Check quiet hours
  if (isInQuietHours(now, prefs.quietHours)) {
    return getEndOfQuietHours(prefs.quietHours);
  }

  // Check user's notification engagement patterns
  const bestHour = prefs.peakEngagementHour;
  if (bestHour !== undefined) {
    const currentHour = now.getHours();
    if (Math.abs(currentHour - bestHour) > 2) {
      // Schedule for peak engagement hour if not urgent
      const scheduledTime = new Date(now);
      scheduledTime.setHours(bestHour, 0, 0, 0);
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      return scheduledTime;
    }
  }

  return now;
}
```

### 4.3 Adaptive Time Estimates

```typescript
// src/lib/ai/learning/adaptive/estimates.ts

async function adaptTimeEstimate(
  item: Item,
  userId: string
): Promise<AdaptedEstimate> {
  const model = await getLearningModel(userId);
  const userEstimate = item.estimatedMinutes;

  if (!userEstimate) {
    // No user estimate - provide AI estimate
    return generateAIEstimate(item, model);
  }

  // Get calibration for this type of task
  const calibration = model.estimationModel.byTaskType[item.type] ||
                     model.estimationModel;

  // Calculate adjusted estimate
  const multiplier = calibration.suggestedMultiplier || 1;
  const adjusted = Math.round(userEstimate * multiplier);

  // Calculate confidence interval
  const variance = calibration.averageError / userEstimate;
  const low = Math.round(adjusted * (1 - variance));
  const high = Math.round(adjusted * (1 + variance));

  // Generate explanation
  const explanation = generateEstimateExplanation(
    userEstimate,
    adjusted,
    calibration,
    item
  );

  return {
    userEstimate,
    adjustedEstimate: adjusted,
    confidenceInterval: { low, high },
    confidence: calculateEstimateConfidence(calibration),
    explanation,
    shouldSuggestAdjustment: Math.abs(multiplier - 1) > 0.2
  };
}

function generateEstimateExplanation(
  original: number,
  adjusted: number,
  calibration: TaskTypeEstimation,
  item: Item
): string {
  if (Math.abs(adjusted - original) < 5) {
    return "Your estimate looks accurate based on your history.";
  }

  if (adjusted > original) {
    if (calibration.bias === "underestimate") {
      return `Based on your history with ${item.type} tasks, these typically take ~${Math.round((calibration.suggestedMultiplier - 1) * 100)}% longer than estimated.`;
    }
    return `Similar tasks have taken longer than expected. Consider adding buffer time.`;
  } else {
    if (calibration.bias === "overestimate") {
      return `You tend to overestimate ${item.type} tasks. You might finish this faster than expected.`;
    }
    return `Based on your history, this might take less time than estimated.`;
  }
}
```

---

## Part 5: Database Schema

### 5.1 Learning Tables

```sql
-- Learning events for pattern extraction
CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_learning_events_user ON learning_events(user_id, event_type);
CREATE INDEX idx_learning_events_time ON learning_events(user_id, timestamp);

-- Learned user models (cached)
CREATE TABLE IF NOT EXISTS user_models (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL, -- productivity, estimation, preferences, etc.
  model_data TEXT NOT NULL, -- JSON
  version INTEGER DEFAULT 1,
  samples_used INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, model_type)
);

-- Feedback collected from user
CREATE TABLE IF NOT EXISTS learning_feedback (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  context TEXT, -- JSON
  rating INTEGER,
  comment TEXT,
  correction TEXT, -- JSON
  incorporated BOOLEAN DEFAULT FALSE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_user ON learning_feedback(user_id, feedback_type);

-- Prediction tracking for accuracy measurement
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  predicted_value TEXT NOT NULL, -- JSON
  actual_value TEXT, -- JSON (filled in later)
  accuracy REAL, -- Calculated when actual is known
  context TEXT, -- JSON
  predicted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE INDEX idx_predictions_user ON predictions(user_id, prediction_type);
CREATE INDEX idx_predictions_unresolved ON predictions(user_id, resolved_at) WHERE resolved_at IS NULL;

-- Implicit preferences inferred from behavior
CREATE TABLE IF NOT EXISTS implicit_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  source TEXT NOT NULL, -- observed, inferred, explicit
  evidence TEXT, -- JSON array of supporting events
  first_observed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category, key)
);
```

---

## Part 6: Implementation Timeline

### Week 1: Learning Infrastructure
- [ ] Set up learning event logging
- [ ] Create event observers
- [ ] Implement learning engine skeleton
- [ ] Set up model persistence

### Week 2: Pattern Extraction
- [ ] Productivity pattern extraction
- [ ] Estimation calibration model
- [ ] Completion pattern analysis
- [ ] Work style inference

### Week 3: Preference Learning
- [ ] Communication style inference
- [ ] Notification preference learning
- [ ] Suggestion acceptance tracking
- [ ] Implicit preference detection

### Week 4: Feedback Loop
- [ ] Explicit feedback collection
- [ ] Implicit signal detection
- [ ] Prediction accuracy tracking
- [ ] Model update triggers

### Week 5: Adaptive Behavior
- [ ] Adaptive suggestions
- [ ] Adaptive notifications
- [ ] Adaptive time estimates
- [ ] Personalized messaging

### Week 6: Integration & Polish
- [ ] Integrate with Phase 1-3 systems
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User-facing learning insights

---

## Part 7: Example Learning Journeys

### 7.1 New User (Week 1)

```
Day 1: User creates first tasks
- AI uses default estimates and timing
- Learns: User created tasks in morning, prefers "task" type

Day 3: User completes first tasks
- AI observes: Tasks took 20% longer than estimated
- AI observes: User completed most work between 9-11am
- Learns: Initial estimation calibration, morning productivity

Day 5: User dismisses scheduling suggestion
- AI observes: User rescheduled to different time
- Learns: User prefers afternoon for meetings, not morning

Day 7: First week summary
- AI has: Basic productivity pattern, estimation baseline, one preference
- Confidence: Low (limited data)
- Adaptations: Slight estimate adjustments, tentative scheduling preferences
```

### 7.2 Experienced User (Month 3)

```
AI has learned:
- Peak productivity: 9-11am, 2-4pm
- Estimation accuracy: Underestimates by 25% on average
- Prefers: Brief messages, no emojis, morning notifications
- Habits: Exercises at 7am, codes best in morning
- Struggles: Large tasks, context switching

AI adaptations:
- Time estimates auto-adjusted by 1.25x
- Scheduling suggestions favor morning for deep work
- Messages are concise and professional
- Notifications clustered to reduce interruptions
- Large tasks automatically suggested for breakdown

Example interaction:
User: "Create task: Implement auth system"
AI: "I'll create that task. Based on your history with similar tasks:
- This will likely take ~8 hours (not the typical 6 you might estimate)
- I'd suggest breaking it into 4-5 subtasks
- Best scheduled for your morning focus blocks

Want me to break it down now?"
```

### 7.3 Learning Recovery (After Behavior Change)

```
Scenario: User changes job, now works evening hours

Week 1: AI notices anomalies
- Completions happening 6-10pm instead of 9am-4pm
- Old productivity predictions failing

Week 2: AI detects pattern shift
- Implicit signal: "productivity_pattern" strength=strong
- Old model confidence reduced
- New pattern tracking started

Week 3: AI adapts
- Morning suggestions paused
- Evening productivity windows identified
- Notification timing shifted
- User sees: "I noticed your schedule has changed. I'm adjusting my suggestions accordingly."

Week 4: New model stabilized
- Evening productivity pattern confirmed
- Old morning preferences archived (not deleted)
- New baseline established
```

---

## Part 8: Privacy & Transparency

### 8.1 User Control

```typescript
// src/components/LearningSettings.tsx

interface LearningSettings {
  // What to learn
  trackProductivity: boolean;
  trackEstimates: boolean;
  trackPreferences: boolean;
  trackBehavior: boolean;

  // How to use learning
  adaptSuggestions: boolean;
  adaptNotifications: boolean;
  adaptEstimates: boolean;
  showLearningInsights: boolean;

  // Data management
  retentionDays: number;
  exportData: () => void;
  clearLearning: () => void;
  viewRawData: () => void;
}
```

### 8.2 Learning Transparency

```typescript
// src/components/LearningInsights.tsx

// Show users what the AI has learned about them
function LearningInsights({ userId }) {
  const model = useLearningModel(userId);

  return (
    <div className="learning-insights">
      <h2>What I've Learned About You</h2>

      <section>
        <h3>Productivity Patterns</h3>
        <p>Your most productive hours: {model.productivityPattern.peakWindows.map(w => w.label).join(", ")}</p>
        <p>Optimal focus duration: {model.productivityPattern.optimalFocusDuration} minutes</p>
      </section>

      <section>
        <h3>Estimation Accuracy</h3>
        <p>You tend to {model.estimationModel.bias === "underestimate" ? "underestimate" : "overestimate"} task duration</p>
        <p>I adjust your estimates by {Math.round((model.estimationModel.suggestedMultiplier - 1) * 100)}%</p>
      </section>

      <section>
        <h3>Communication Preferences</h3>
        <p>You prefer: {model.preferences.communicationStyle.preferredLength} responses</p>
        <p>Tone: {model.preferences.communicationStyle.tonePreference}</p>
      </section>

      <section>
        <h3>Data Behind This</h3>
        <p>Based on {model.samplesUsed} data points over {model.daysCovered} days</p>
        <p>Confidence: {Math.round(model.overallConfidence * 100)}%</p>
        <button onClick={() => exportLearningData(userId)}>Export My Data</button>
        <button onClick={() => clearLearningData(userId)}>Clear Learning</button>
      </section>
    </div>
  );
}
```

---

## Part 9: Success Metrics

### Learning Quality
- [ ] Prediction accuracy improves over time (measurable)
- [ ] Estimation calibration reaches 90%+ accuracy after 1 month
- [ ] Suggestion acceptance rate increases by 20%+ with personalization

### User Experience
- [ ] Users report AI "understands them" (survey)
- [ ] Reduced time to complete common actions
- [ ] Higher engagement with personalized suggestions

### System Health
- [ ] Model updates complete in < 5 seconds
- [ ] Learning events processed in real-time
- [ ] No degradation with increasing data

---

## Summary

Phase 4 creates an AI that truly learns and adapts:

1. **Observes everything** - Tracks behavior without being creepy
2. **Extracts patterns** - Productivity, estimation, preferences, work style
3. **Collects feedback** - Both explicit and implicit signals
4. **Adapts behavior** - Suggestions, notifications, estimates, timing
5. **Improves continuously** - Gets better the more you use it
6. **Maintains transparency** - Users can see and control what's learned

The result is an AI assistant that feels like it genuinely knows you after a few weeks of use - anticipating your needs, speaking your language, and providing truly personalized guidance.
