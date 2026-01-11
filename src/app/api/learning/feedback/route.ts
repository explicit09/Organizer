import { NextRequest, NextResponse } from "next/server";
import {
  collectSuggestionFeedback,
  collectPredictionFeedback,
  collectPreferenceCorrection,
  collectGeneralFeedback,
  getFeedbackHistory,
} from "@/lib/ai/learning/feedback";
import type { FeedbackType } from "@/lib/ai/learning/types";

// POST /api/learning/feedback - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...data } = body;

    switch (type) {
      case "suggestion": {
        const { suggestionId, outcome, rating, reason, modification, suggestionType } = data;
        if (!suggestionId || !outcome) {
          return NextResponse.json(
            { error: "suggestionId and outcome are required for suggestion feedback" },
            { status: 400 }
          );
        }
        await collectSuggestionFeedback(userId, suggestionId, outcome, {
          rating,
          reason,
          modification,
          suggestionType,
        });
        break;
      }

      case "prediction": {
        const { predictionType, predicted, actual, context } = data;
        if (!predictionType || predicted === undefined || actual === undefined) {
          return NextResponse.json(
            { error: "predictionType, predicted, and actual are required for prediction feedback" },
            { status: 400 }
          );
        }
        await collectPredictionFeedback(userId, predictionType, predicted, actual, context);
        break;
      }

      case "preference_correction": {
        const { category, key, correctedValue, previousValue } = data;
        if (!category || !key || correctedValue === undefined) {
          return NextResponse.json(
            { error: "category, key, and correctedValue are required for preference correction" },
            { status: 400 }
          );
        }
        await collectPreferenceCorrection(userId, category, key, correctedValue, previousValue);
        break;
      }

      case "general": {
        const { rating, comment, context } = data;
        if (rating === undefined) {
          return NextResponse.json(
            { error: "rating is required for general feedback" },
            { status: 400 }
          );
        }
        await collectGeneralFeedback(userId, rating, comment, context);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown feedback type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error collecting feedback:", error);
    return NextResponse.json(
      { error: "Failed to collect feedback" },
      { status: 500 }
    );
  }
}

// GET /api/learning/feedback - Get feedback history
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as FeedbackType | null;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const feedback = await getFeedbackHistory(userId, {
      type: type || undefined,
      days,
      limit,
    });

    return NextResponse.json({
      feedback: feedback.map((f) => ({
        id: f.id,
        type: f.type,
        context: f.context,
        rating: f.rating,
        comment: f.comment,
        correction: f.correction,
        timestamp: f.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching feedback history:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback history" },
      { status: 500 }
    );
  }
}
