import { NextRequest, NextResponse } from "next/server";
import { learningEngine } from "@/lib/ai/learning/engine";
import {
  adaptSuggestionsForUser,
  generatePersonalizedSuggestion,
} from "@/lib/ai/learning/adaptive/suggestions";
import {
  adaptNotificationDelivery,
  createNotificationDigest,
  calculateOptimalFrequency,
  hasReachedLimit,
} from "@/lib/ai/learning/adaptive/notifications";
import type { AdaptiveSuggestion } from "@/lib/ai/learning/types";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

// POST /api/learning/suggestions - Process suggestions through adaptive engine
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    const model = await learningEngine.getModel(userId);

    switch (action) {
      case "adapt": {
        const { suggestions } = data;
        if (!suggestions || !Array.isArray(suggestions)) {
          return NextResponse.json(
            { error: "suggestions array is required" },
            { status: 400 }
          );
        }

        // Convert to AdaptiveSuggestion format if needed
        const formattedSuggestions: AdaptiveSuggestion[] = suggestions.map((s) => ({
          id: s.id || randomUUID(),
          type: s.type,
          message: s.message,
          priority: s.priority || "medium",
          confidence: s.confidence || 0.5,
          predictedAcceptance: 0,
          personalizationApplied: false,
          ...s,
        }));

        const adapted = adaptSuggestionsForUser(formattedSuggestions, model);

        // Store suggestions in history
        const db = getDb();
        const now = new Date().toISOString();
        for (const suggestion of adapted) {
          db.prepare(
            `INSERT INTO suggestion_history
             (id, user_id, suggestion_type, suggestion_json, confidence, predicted_acceptance, personalization_applied, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            suggestion.id,
            userId,
            suggestion.type,
            JSON.stringify(suggestion),
            suggestion.confidence,
            suggestion.predictedAcceptance,
            suggestion.personalizationApplied ? 1 : 0,
            now
          );
        }

        return NextResponse.json({
          suggestions: adapted.map((s) => ({
            id: s.id,
            type: s.type,
            message: s.message,
            priority: s.priority,
            confidence: s.confidence,
            predictedAcceptance: s.predictedAcceptance,
            delayUntil: s.delayUntil?.toISOString(),
          })),
        });
      }

      case "personalize_message": {
        const { template, context } = data;
        if (!template) {
          return NextResponse.json(
            { error: "template is required" },
            { status: 400 }
          );
        }

        const personalized = generatePersonalizedSuggestion(
          template,
          model,
          context || {}
        );

        return NextResponse.json({ message: personalized });
      }

      case "adapt_notification": {
        const { notification } = data;
        if (!notification || !notification.type || !notification.message) {
          return NextResponse.json(
            { error: "notification with type and message is required" },
            { status: 400 }
          );
        }

        const adapted = adaptNotificationDelivery(
          {
            type: notification.type,
            priority: notification.priority || "medium",
            message: notification.message,
          },
          model
        );

        return NextResponse.json({
          skip: adapted.skip,
          reason: adapted.reason,
          channel: adapted.channel,
          deliverAt: adapted.deliverAt?.toISOString(),
          groupWith: adapted.groupWith,
          adaptedMessage: adapted.adaptedMessage,
        });
      }

      case "digest": {
        const { notifications } = data;
        if (!notifications || !Array.isArray(notifications)) {
          return NextResponse.json(
            { error: "notifications array is required" },
            { status: 400 }
          );
        }

        const digest = createNotificationDigest(notifications, model);

        return NextResponse.json({
          message: digest.message,
          count: digest.count,
          types: digest.types,
        });
      }

      case "check_limits": {
        const limits = await hasReachedLimit(userId, model);
        const frequency = calculateOptimalFrequency(model);

        return NextResponse.json({
          limits,
          optimalFrequency: frequency,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: adapt, personalize_message, adapt_notification, digest, check_limits` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing suggestions request:", error);
    return NextResponse.json(
      { error: "Failed to process suggestions request" },
      { status: 500 }
    );
  }
}

// GET /api/learning/suggestions - Get suggestion preferences and stats
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const model = await learningEngine.getModel(userId);
    const db = getDb();

    // Get suggestion history stats
    const stats = db
      .prepare(
        `SELECT
          suggestion_type,
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END) as accepted,
          AVG(predicted_acceptance) as avg_predicted,
          AVG(CASE WHEN outcome = 'accepted' THEN 1.0 ELSE 0.0 END) as actual_rate
         FROM suggestion_history
         WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
         GROUP BY suggestion_type`
      )
      .all(userId) as Array<{
      suggestion_type: string;
      total: number;
      accepted: number;
      avg_predicted: number | null;
      actual_rate: number | null;
    }>;

    return NextResponse.json({
      preferences: {
        acceptanceRateByType: model.preferences.suggestionPreferences.acceptanceRateByType,
        preferredTimingByType: model.preferences.suggestionPreferences.preferredTimingByType,
        mostValuableSuggestions: model.preferences.suggestionPreferences.mostValuableSuggestions,
        leastValuableSuggestions: model.preferences.suggestionPreferences.leastValuableSuggestions,
      },
      communicationStyle: model.preferences.communicationStyle,
      notificationPreferences: {
        peakEngagementHour: model.preferences.notificationPreferences.peakEngagementHour,
        groupingPreference: model.preferences.notificationPreferences.groupingPreference,
        channelPreference: model.preferences.notificationPreferences.channelPreference,
      },
      stats: stats.map((s) => ({
        type: s.suggestion_type,
        total: s.total,
        accepted: s.accepted,
        avgPredicted: s.avg_predicted,
        actualRate: s.actual_rate,
      })),
    });
  } catch (error) {
    console.error("Error fetching suggestion preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestion preferences" },
      { status: 500 }
    );
  }
}
