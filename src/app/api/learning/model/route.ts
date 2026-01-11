import { NextRequest, NextResponse } from "next/server";
import { learningEngine } from "@/lib/ai/learning/engine";
import type { UserModel } from "@/lib/ai/learning/types";

// GET /api/learning/model - Get user's learning model
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const model = await learningEngine.getModel(userId);

    // Transform for API response
    const response = {
      userId: model.userId,
      lastUpdated: model.lastUpdated.toISOString(),
      samplesUsed: model.samplesUsed,
      overallConfidence: model.overallConfidence,
      productivity: {
        peakHours: getTopHours(model.productivityPattern.hourlyScores),
        peakDays: getTopDays(model.productivityPattern.dayOfWeekScores),
        peakWindows: model.productivityPattern.peakProductivityWindows,
        optimalFocusDuration: model.productivityPattern.optimalFocusDuration,
      },
      estimation: {
        globalAccuracy: model.estimationModel.globalAccuracy,
        byTaskType: model.estimationModel.byTaskType,
        bySize: model.estimationModel.bySize,
        suggestions: model.estimationModel.improvementSuggestions,
      },
      preferences: {
        communicationStyle: model.preferences.communicationStyle,
        notificationPreferences: {
          peakEngagementHour: model.preferences.notificationPreferences.peakEngagementHour,
          groupingPreference: model.preferences.notificationPreferences.groupingPreference,
          quietHours: model.preferences.notificationPreferences.quietHours,
        },
        workStyle: model.preferences.workStyle,
        topSuggestionTypes: model.preferences.suggestionPreferences.mostValuableSuggestions,
        leastValuableSuggestionTypes: model.preferences.suggestionPreferences.leastValuableSuggestions,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user model:", error);
    return NextResponse.json(
      { error: "Failed to fetch user model" },
      { status: 500 }
    );
  }
}

// POST /api/learning/model/update - Trigger model update
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Force model update
    await learningEngine.updateModels(userId);

    const updatedModel = await learningEngine.getModel(userId);

    return NextResponse.json({
      success: true,
      lastUpdated: updatedModel.lastUpdated.toISOString(),
      confidence: updatedModel.overallConfidence,
      samplesUsed: updatedModel.samplesUsed,
    });
  } catch (error) {
    console.error("Error updating user model:", error);
    return NextResponse.json(
      { error: "Failed to update user model" },
      { status: 500 }
    );
  }
}

// Get top N hours from hourly scores
function getTopHours(hourlyScores: Record<number, { completionRate: number }>): number[] {
  return Object.entries(hourlyScores)
    .sort(([, a], [, b]) => b.completionRate - a.completionRate)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}

// Get top N days from daily scores
function getTopDays(dayOfWeekScores: Record<string, { completionRate: number }>): string[] {
  return Object.entries(dayOfWeekScores)
    .sort(([, a], [, b]) => b.completionRate - a.completionRate)
    .slice(0, 3)
    .map(([day]) => day);
}
