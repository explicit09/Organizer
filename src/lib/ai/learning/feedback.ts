// Feedback Collection System
// Collects explicit and implicit feedback to improve learning

import type { Feedback, FeedbackType, ImplicitSignal, LearningEvent } from "./types";
import { getDb } from "../../db";
import { randomUUID } from "crypto";
import { emitLearningEvent } from "./engine";

// Save feedback to database
async function saveFeedback(feedback: Feedback): Promise<void> {
  const db = getDb();

  db.prepare(
    `INSERT INTO learning_feedback
     (id, user_id, feedback_type, context, rating, comment, correction, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    feedback.id,
    feedback.userId,
    feedback.type,
    JSON.stringify(feedback.context),
    feedback.rating || null,
    feedback.comment || null,
    feedback.correction ? JSON.stringify(feedback.correction) : null,
    feedback.timestamp.toISOString()
  );
}

// Collect feedback on a suggestion
export async function collectSuggestionFeedback(
  userId: string,
  suggestionId: string,
  outcome: "accepted" | "dismissed" | "modified",
  details?: {
    rating?: number;
    reason?: string;
    modification?: unknown;
    suggestionType?: string;
  }
): Promise<void> {
  const feedback: Feedback = {
    id: randomUUID(),
    userId,
    type: "suggestion_rating",
    context: {
      suggestionId,
      outcome,
      suggestionType: details?.suggestionType,
      modification: details?.modification,
    },
    rating: details?.rating,
    comment: details?.reason,
    timestamp: new Date(),
  };

  await saveFeedback(feedback);

  // Emit learning event
  await emitLearningEvent(
    userId,
    outcome === "accepted" ? "suggestion_accepted" : "suggestion_dismissed",
    {
      suggestionId,
      suggestionType: details?.suggestionType,
      reason: details?.reason,
      timeToAction: 0, // Would need actual tracking
    }
  );

  // Immediately incorporate strong signals
  if (outcome === "dismissed" && details?.reason) {
    await incorporateDismissalReason(userId, details.suggestionType || "unknown", details.reason);
  }

  if (details?.rating !== undefined && details.rating <= 2) {
    await flagLowRatedSuggestion(userId, suggestionId, details.suggestionType);
  }
}

// Incorporate dismissal reason for immediate learning
async function incorporateDismissalReason(
  userId: string,
  suggestionType: string,
  reason: string
): Promise<void> {
  const db = getDb();

  // Track dismissal reason for this suggestion type
  db.prepare(
    `INSERT INTO implicit_preferences
     (id, user_id, category, key, value, confidence, source, first_observed_at, last_confirmed_at)
     VALUES (?, ?, 'dismissal_reasons', ?, ?, 0.6, 'observed', ?, ?)
     ON CONFLICT (user_id, category, key) DO UPDATE SET
       value = excluded.value,
       confidence = MIN(confidence + 0.1, 1.0),
       last_confirmed_at = excluded.last_confirmed_at`
  ).run(
    randomUUID(),
    userId,
    suggestionType,
    reason,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

// Flag a low-rated suggestion for review
async function flagLowRatedSuggestion(
  userId: string,
  suggestionId: string,
  suggestionType?: string
): Promise<void> {
  const db = getDb();

  // Lower the value of this suggestion type
  if (suggestionType) {
    db.prepare(
      `INSERT INTO implicit_preferences
       (id, user_id, category, key, value, confidence, source, first_observed_at, last_confirmed_at)
       VALUES (?, ?, 'low_value_suggestions', ?, 'true', 0.7, 'explicit', ?, ?)
       ON CONFLICT (user_id, category, key) DO UPDATE SET
         confidence = MIN(confidence + 0.15, 1.0),
         last_confirmed_at = excluded.last_confirmed_at`
    ).run(
      randomUUID(),
      userId,
      suggestionType,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }
}

// Collect feedback on a prediction (e.g., time estimate)
export async function collectPredictionFeedback(
  userId: string,
  predictionType: string,
  predicted: unknown,
  actual: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const accuracy = calculatePredictionAccuracy(predicted, actual);

  const feedback: Feedback = {
    id: randomUUID(),
    userId,
    type: "prediction_accuracy",
    context: {
      predictionType,
      predicted,
      actual,
      accuracy,
      ...context,
    },
    timestamp: new Date(),
  };

  await saveFeedback(feedback);

  // Store prediction for tracking
  const db = getDb();
  db.prepare(
    `INSERT INTO predictions
     (id, user_id, prediction_type, predicted_value, actual_value, accuracy, context, predicted_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    userId,
    predictionType,
    JSON.stringify(predicted),
    JSON.stringify(actual),
    accuracy,
    context ? JSON.stringify(context) : null,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

// Calculate prediction accuracy
function calculatePredictionAccuracy(predicted: unknown, actual: unknown): number {
  // Handle numeric predictions
  if (typeof predicted === "number" && typeof actual === "number") {
    if (actual === 0) return predicted === 0 ? 1 : 0;
    return Math.max(0, 1 - Math.abs(predicted - actual) / actual);
  }

  // Handle boolean predictions
  if (typeof predicted === "boolean" && typeof actual === "boolean") {
    return predicted === actual ? 1 : 0;
  }

  // Handle string predictions
  if (typeof predicted === "string" && typeof actual === "string") {
    return predicted === actual ? 1 : 0;
  }

  return 0.5; // Unknown type
}

// Collect preference correction (user explicitly corrects AI's assumption)
export async function collectPreferenceCorrection(
  userId: string,
  category: string,
  key: string,
  correctedValue: unknown,
  previousValue?: unknown
): Promise<void> {
  const feedback: Feedback = {
    id: randomUUID(),
    userId,
    type: "preference_correction",
    context: { category, key },
    correction: {
      field: `${category}.${key}`,
      oldValue: previousValue,
      newValue: correctedValue,
    },
    timestamp: new Date(),
  };

  await saveFeedback(feedback);

  // Immediately update preference with high confidence
  await updateUserPreference(userId, category, key, correctedValue, "explicit");
}

// Update user preference
async function updateUserPreference(
  userId: string,
  category: string,
  key: string,
  value: unknown,
  source: "observed" | "inferred" | "explicit"
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  // Explicit corrections get highest confidence
  const confidence = source === "explicit" ? 1.0 : source === "observed" ? 0.7 : 0.5;

  db.prepare(
    `INSERT INTO implicit_preferences
     (id, user_id, category, key, value, confidence, source, first_observed_at, last_confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, category, key) DO UPDATE SET
       value = excluded.value,
       confidence = excluded.confidence,
       source = excluded.source,
       last_confirmed_at = excluded.last_confirmed_at`
  ).run(randomUUID(), userId, category, key, JSON.stringify(value), confidence, source, now, now);
}

// Collect general feedback
export async function collectGeneralFeedback(
  userId: string,
  rating: number,
  comment?: string,
  context?: Record<string, unknown>
): Promise<void> {
  const feedback: Feedback = {
    id: randomUUID(),
    userId,
    type: "general_feedback",
    context: context || {},
    rating,
    comment,
    timestamp: new Date(),
  };

  await saveFeedback(feedback);
}

// Detect implicit feedback signals from event patterns
export function detectImplicitFeedback(events: LearningEvent[]): ImplicitSignal[] {
  const signals: ImplicitSignal[] = [];

  // Pattern: User immediately reschedules after AI schedule suggestion
  const scheduleSuggestions = events.filter((e) => e.type === "schedule_suggested");
  const reschedules = events.filter((e) => e.type === "item_rescheduled");

  for (const suggestion of scheduleSuggestions) {
    const quickReschedule = reschedules.find((r) => {
      const timeDiff =
        r.timestamp.getTime() - suggestion.timestamp.getTime();
      return (
        r.data.itemId === suggestion.data.itemId &&
        timeDiff > 0 &&
        timeDiff < 5 * 60 * 1000 // Within 5 minutes
      );
    });

    if (quickReschedule) {
      signals.push({
        type: "schedule_preference",
        strength: "medium",
        interpretation: `User prefers ${quickReschedule.data.newTime} over suggested ${suggestion.data.suggestedTime}`,
        action: "adjust_scheduling_model",
      });
    }
  }

  // Pattern: User consistently ignores certain notification types
  const notifications = events.filter(
    (e) => e.type === "notification_clicked" || e.type === "notification_ignored"
  );
  const notificationsByType = groupBy(notifications, (e) => e.data.notificationType as string);

  for (const [type, typeNotifications] of Object.entries(notificationsByType)) {
    if (!type || typeNotifications.length < 5) continue;

    const clickedCount = typeNotifications.filter(
      (n) => n.type === "notification_clicked"
    ).length;
    const interactionRate = clickedCount / typeNotifications.length;

    if (interactionRate < 0.2) {
      signals.push({
        type: "notification_preference",
        strength: "strong",
        interpretation: `User rarely engages with "${type}" notifications (${Math.round(interactionRate * 100)}% rate)`,
        action: "reduce_notification_frequency",
      });
    }
  }

  // Pattern: Productivity at unexpected times
  const completions = events.filter((e) => e.type === "item_completed");
  const lateNightCompletions = completions.filter((e) => {
    const hour = e.timestamp.getHours();
    return hour >= 22 || hour < 6;
  });

  if (lateNightCompletions.length > 5 && lateNightCompletions.length > completions.length * 0.2) {
    signals.push({
      type: "productivity_pattern",
      strength: "medium",
      interpretation: "User is productive during late night hours",
      action: "recalibrate_productivity_model",
    });
  }

  return signals;
}

// Get feedback history for a user
export async function getFeedbackHistory(
  userId: string,
  options?: { type?: FeedbackType; days?: number; limit?: number }
): Promise<Feedback[]> {
  const db = getDb();
  const days = options?.days || 30;
  const limit = options?.limit || 100;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = `SELECT * FROM learning_feedback WHERE user_id = ? AND timestamp >= ?`;
  const params: unknown[] = [userId, cutoff];

  if (options?.type) {
    query += ` AND feedback_type = ?`;
    params.push(options.type);
  }

  query += ` ORDER BY timestamp DESC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(query).all(...params) as Array<{
    id: string;
    user_id: string;
    feedback_type: string;
    context: string;
    rating: number | null;
    comment: string | null;
    correction: string | null;
    timestamp: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.feedback_type as FeedbackType,
    context: JSON.parse(row.context),
    rating: row.rating || undefined,
    comment: row.comment || undefined,
    correction: row.correction ? JSON.parse(row.correction) : undefined,
    timestamp: new Date(row.timestamp),
  }));
}

// Helper: group array by key function
function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}
