// Phase 4: Learning Engine
// Core engine for observing, learning, and adapting

import type {
  LearningEvent,
  LearningEventType,
  UserEvent,
  UserModel,
  PatternObserver,
  TimePrediction,
  ProductivityPrediction,
  AdaptiveSuggestion,
  AdaptedNotification,
} from "./types";
import { getDb } from "../../db";
import { randomUUID } from "crypto";

// Default empty user model
function createEmptyModel(userId: string): UserModel {
  return {
    userId,
    productivityPattern: {
      hourlyScores: {},
      dayOfWeekScores: {},
      combinedScores: {},
      optimalFocusDuration: 25,
      optimalBreakFrequency: 5,
      peakProductivityWindows: [],
    },
    estimationModel: {
      globalAccuracy: 1.0,
      byTaskType: {},
      bySize: {},
      byComplexity: { byComplexity: {}, multipliers: {} },
      improvementSuggestions: [],
    },
    completionPatterns: [],
    preferences: {
      communicationStyle: {
        preferredLength: "moderate",
        tonePreference: "professional",
        emojiUsage: "sometimes",
        technicalLevel: "moderate",
        confidence: 0,
      },
      notificationPreferences: {
        valueByType: {},
        peakEngagementHour: null,
        groupingPreference: "moderate",
        quietHours: null,
        channelPreference: {},
      },
      suggestionPreferences: {
        acceptanceRateByType: {},
        preferredTimingByType: {},
        dismissalReasons: {},
        mostValuableSuggestions: [],
        leastValuableSuggestions: [],
      },
      workStyle: {
        chronotype: "flexible",
        batchVsSwitch: "mixed",
        planningStyle: "balanced",
        focusStyle: "varied",
      },
      implicitPreferences: [],
    },
    lastUpdated: new Date(),
    samplesUsed: 0,
    daysCovered: 0,
    overallConfidence: 0,
  };
}

class LearningEngine {
  private observers: PatternObserver[] = [];
  private models: Map<string, UserModel> = new Map();
  private updateThreshold = 10; // Update models every N events

  // Register a pattern observer
  registerObserver(observer: PatternObserver): void {
    this.observers.push(observer);
    console.log(`[Learning] Registered observer: ${observer.name}`);
  }

  // Register multiple observers
  registerObservers(observers: PatternObserver[]): void {
    for (const observer of observers) {
      this.registerObserver(observer);
    }
  }

  // Log and process a learning event
  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;

    // Log the event
    await this.logEvent(userId, type, data, timestamp);

    // Notify all interested observers
    for (const observer of this.observers) {
      if (observer.interestedIn(type)) {
        try {
          await observer.observe(event);
        } catch (error) {
          console.error(`[Learning] Observer ${observer.name} error:`, error);
        }
      }
    }

    // Check if models need updating
    const eventCount = await this.getRecentEventCount(userId);
    if (eventCount % this.updateThreshold === 0) {
      await this.updateModels(userId);
    }
  }

  // Log event to database
  private async logEvent(
    userId: string,
    type: LearningEventType,
    data: Record<string, unknown>,
    timestamp: Date
  ): Promise<string> {
    const db = getDb();
    const id = randomUUID();

    db.prepare(
      `INSERT INTO learning_events
       (id, user_id, event_type, event_data, timestamp, processed)
       VALUES (?, ?, ?, ?, ?, 0)`
    ).run(id, userId, type, JSON.stringify(data), timestamp.toISOString());

    return id;
  }

  // Get recent event count for a user
  private async getRecentEventCount(userId: string): Promise<number> {
    const db = getDb();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM learning_events
         WHERE user_id = ? AND timestamp >= ?`
      )
      .get(userId, oneHourAgo) as { count: number };

    return result.count;
  }

  // Get learning events for analysis
  async getLearningEvents(
    userId: string,
    options: { days?: number; types?: LearningEventType[] } = {}
  ): Promise<LearningEvent[]> {
    const db = getDb();
    const days = options.days || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = `SELECT * FROM learning_events WHERE user_id = ? AND timestamp >= ?`;
    const params: unknown[] = [userId, cutoff];

    if (options.types && options.types.length > 0) {
      query += ` AND event_type IN (${options.types.map(() => "?").join(",")})`;
      params.push(...options.types);
    }

    query += ` ORDER BY timestamp DESC`;

    const rows = db.prepare(query).all(...params) as Array<{
      id: string;
      user_id: string;
      event_type: string;
      event_data: string;
      timestamp: string;
      processed: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.event_type as LearningEventType,
      data: JSON.parse(row.event_data),
      timestamp: new Date(row.timestamp),
      processed: row.processed === 1,
    }));
  }

  // Update all models for a user
  async updateModels(userId: string): Promise<void> {
    console.log(`[Learning] Updating models for user ${userId}`);

    const events = await this.getLearningEvents(userId, { days: 30 });
    const currentModel = await this.getModel(userId);

    // Import model updaters dynamically to avoid circular deps
    const { updateProductivityModel } = await import("./models/productivity");
    const { updateEstimationModel } = await import("./models/estimation");
    const { updatePreferenceModel } = await import("./models/preferences");

    // Update each model component
    const updatedModel: UserModel = {
      ...currentModel,
      productivityPattern: await updateProductivityModel(events, currentModel),
      estimationModel: await updateEstimationModel(events, currentModel),
      preferences: await updatePreferenceModel(events, currentModel),
      lastUpdated: new Date(),
      samplesUsed: events.length,
      daysCovered: this.calculateDaysCovered(events),
      overallConfidence: this.calculateOverallConfidence(events.length),
    };

    // Persist and cache
    await this.persistModel(userId, updatedModel);
    this.models.set(userId, updatedModel);
  }

  // Calculate days covered by events
  private calculateDaysCovered(events: LearningEvent[]): number {
    if (events.length === 0) return 0;

    const dates = new Set(
      events.map((e) => e.timestamp.toISOString().split("T")[0])
    );
    return dates.size;
  }

  // Calculate overall confidence based on sample size
  private calculateOverallConfidence(sampleSize: number): number {
    // Confidence grows with sample size, maxing at ~100 events
    return Math.min(sampleSize / 100, 1);
  }

  // Get user model (from cache or database)
  async getModel(userId: string): Promise<UserModel> {
    // Check cache first
    if (this.models.has(userId)) {
      return this.models.get(userId)!;
    }

    // Load from database
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT model_type, model_data, samples_used, confidence
         FROM user_models WHERE user_id = ?`
      )
      .all(userId) as Array<{
      model_type: string;
      model_data: string;
      samples_used: number;
      confidence: number;
    }>;

    if (rows.length === 0) {
      return createEmptyModel(userId);
    }

    // Reconstruct model from parts
    const model = createEmptyModel(userId);

    for (const row of rows) {
      const data = JSON.parse(row.model_data);

      switch (row.model_type) {
        case "productivity":
          model.productivityPattern = data;
          break;
        case "estimation":
          model.estimationModel = data;
          break;
        case "preferences":
          model.preferences = data;
          break;
        case "completion_patterns":
          model.completionPatterns = data;
          break;
      }

      model.samplesUsed = Math.max(model.samplesUsed, row.samples_used);
      model.overallConfidence = Math.max(model.overallConfidence, row.confidence);
    }

    // Cache and return
    this.models.set(userId, model);
    return model;
  }

  // Persist model to database
  private async persistModel(userId: string, model: UserModel): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    const modelParts = [
      { type: "productivity", data: model.productivityPattern },
      { type: "estimation", data: model.estimationModel },
      { type: "preferences", data: model.preferences },
      { type: "completion_patterns", data: model.completionPatterns },
    ];

    for (const part of modelParts) {
      db.prepare(
        `INSERT INTO user_models
         (id, user_id, model_type, model_data, samples_used, confidence, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, model_type) DO UPDATE SET
           model_data = excluded.model_data,
           samples_used = excluded.samples_used,
           confidence = excluded.confidence,
           version = version + 1,
           updated_at = excluded.updated_at`
      ).run(
        randomUUID(),
        userId,
        part.type,
        JSON.stringify(part.data),
        model.samplesUsed,
        model.overallConfidence,
        now
      );
    }
  }

  // Predict completion time for an item
  async predictCompletionTime(
    item: { type: string; estimatedMinutes?: number; priority?: string },
    userId: string
  ): Promise<TimePrediction> {
    const model = await this.getModel(userId);
    const userEstimate = item.estimatedMinutes || 60;

    // Get accuracy factor for this task type
    const typeEstimation = model.estimationModel.byTaskType[item.type];
    const accuracyFactor = typeEstimation?.suggestedMultiplier || 1;

    // Adjust estimate
    const adjustedEstimate = Math.round(userEstimate * accuracyFactor);

    // Calculate range based on variance
    const variance = typeEstimation?.averageError
      ? typeEstimation.averageError / userEstimate
      : 0.3;

    // Generate factors explaining the prediction
    const factors = this.generatePredictionFactors(item, model, accuracyFactor);

    return {
      estimatedMinutes: adjustedEstimate,
      confidence: typeEstimation?.sampleSize
        ? Math.min(typeEstimation.sampleSize / 20, 1)
        : 0.3,
      range: {
        low: Math.round(adjustedEstimate * (1 - variance)),
        high: Math.round(adjustedEstimate * (1 + variance)),
      },
      factors,
    };
  }

  // Generate factors explaining the prediction
  private generatePredictionFactors(
    item: { type: string; estimatedMinutes?: number },
    model: UserModel,
    accuracyFactor: number
  ): string[] {
    const factors: string[] = [];

    if (Math.abs(accuracyFactor - 1) < 0.1) {
      factors.push("Your estimate looks accurate based on your history");
    } else if (accuracyFactor > 1) {
      factors.push(
        `${item.type} tasks typically take ~${Math.round((accuracyFactor - 1) * 100)}% longer than estimated`
      );
    } else {
      factors.push(`You tend to overestimate ${item.type} tasks`);
    }

    const typeEstimation = model.estimationModel.byTaskType[item.type];
    if (typeEstimation?.sampleSize) {
      factors.push(`Based on ${typeEstimation.sampleSize} similar tasks`);
    }

    return factors;
  }

  // Predict productivity for a time slot
  async predictProductivity(
    hour: number,
    dayOfWeek: string,
    userId: string
  ): Promise<ProductivityPrediction> {
    const model = await this.getModel(userId);

    const hourScore = model.productivityPattern.hourlyScores[hour];
    const dayScore = model.productivityPattern.dayOfWeekScores[dayOfWeek];

    if (!hourScore && !dayScore) {
      return {
        score: 0.5,
        isOptimal: false,
        recommendation: "Not enough data to predict productivity for this time.",
      };
    }

    const score = hourScore
      ? (hourScore.completionRate + hourScore.focusability) / 2
      : dayScore?.completionRate || 0.5;

    const isOptimal = model.productivityPattern.peakProductivityWindows.some(
      (w) => hour >= w.start && hour < w.end
    );

    let recommendation = "";
    if (isOptimal) {
      recommendation = "This is one of your peak productivity times. Great for deep work!";
    } else if (score < 0.3) {
      recommendation = "Historically, this isn't your most productive time. Consider lighter tasks.";
    } else {
      recommendation = "This is a moderately productive time for you.";
    }

    return { score, isOptimal, recommendation };
  }

  // Adapt suggestions based on learned preferences
  async adaptSuggestions(
    suggestions: AdaptiveSuggestion[],
    userId: string
  ): Promise<AdaptiveSuggestion[]> {
    const model = await this.getModel(userId);
    const { adaptSuggestionsForUser } = await import("./adaptive/suggestions");

    return adaptSuggestionsForUser(suggestions, model);
  }

  // Adapt notification delivery
  async adaptNotification(
    notification: { type: string; priority: string; message: string },
    userId: string
  ): Promise<AdaptedNotification> {
    const model = await this.getModel(userId);
    const { adaptNotificationDelivery } = await import("./adaptive/notifications");

    return adaptNotificationDelivery(notification, model);
  }

  // Get learning insights for UI
  async getLearningInsights(userId: string): Promise<{
    productivitySummary: { peakHours: string[]; optimalFocusDuration: number; bestDays: string[] };
    estimationSummary: { bias: string; adjustmentPercent: number; accuracy: number };
    preferenceSummary: { responseStyle: string; notificationTolerance: string; workStyle: string };
    dataPoints: number;
    daysCovered: number;
    overallConfidence: number;
  }> {
    const model = await this.getModel(userId);

    const peakHours = model.productivityPattern.peakProductivityWindows
      .map((w) => `${w.start}:00-${w.end}:00`)
      .slice(0, 3);

    const bestDays = Object.entries(model.productivityPattern.dayOfWeekScores)
      .sort(([, a], [, b]) => b.completionRate - a.completionRate)
      .slice(0, 2)
      .map(([day]) => day);

    const estimationBias =
      model.estimationModel.globalAccuracy > 1.1
        ? "overestimate"
        : model.estimationModel.globalAccuracy < 0.9
          ? "underestimate"
          : "accurate";

    return {
      productivitySummary: {
        peakHours,
        optimalFocusDuration: model.productivityPattern.optimalFocusDuration,
        bestDays,
      },
      estimationSummary: {
        bias: estimationBias,
        adjustmentPercent: Math.round(
          Math.abs(model.estimationModel.globalAccuracy - 1) * 100
        ),
        accuracy: Math.round(model.estimationModel.globalAccuracy * 100),
      },
      preferenceSummary: {
        responseStyle: model.preferences.communicationStyle.preferredLength,
        notificationTolerance: model.preferences.notificationPreferences.groupingPreference,
        workStyle: model.preferences.workStyle.chronotype,
      },
      dataPoints: model.samplesUsed,
      daysCovered: model.daysCovered,
      overallConfidence: model.overallConfidence,
    };
  }

  // Clear learning data for a user
  async clearLearningData(userId: string): Promise<void> {
    const db = getDb();

    db.prepare(`DELETE FROM learning_events WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM user_models WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM learning_feedback WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM predictions WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM implicit_preferences WHERE user_id = ?`).run(userId);

    this.models.delete(userId);
    console.log(`[Learning] Cleared all learning data for user ${userId}`);
  }

  // Export learning data for a user
  async exportLearningData(userId: string): Promise<{
    events: LearningEvent[];
    model: UserModel;
  }> {
    const events = await this.getLearningEvents(userId, { days: 365 });
    const model = await this.getModel(userId);

    return { events, model };
  }
}

// Singleton instance
export const learningEngine = new LearningEngine();

// Helper to emit learning events from other parts of the app
export async function emitLearningEvent(
  userId: string,
  type: LearningEventType,
  data: Record<string, unknown>
): Promise<void> {
  await learningEngine.observe({
    userId,
    type,
    data,
    timestamp: new Date(),
  });
}
