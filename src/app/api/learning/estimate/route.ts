import { NextRequest, NextResponse } from "next/server";
import { learningEngine } from "@/lib/ai/learning/engine";
import {
  getCalibratedEstimate,
  calculateTotalTime,
  suggestBetterEstimate,
  getEstimationTips,
  recordActualCompletion,
} from "@/lib/ai/learning/adaptive/estimates";

// POST /api/learning/estimate - Get calibrated estimate for a task
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
      case "estimate": {
        const { task } = data;
        if (!task || !task.type || !task.size) {
          return NextResponse.json(
            { error: "task with type and size is required" },
            { status: 400 }
          );
        }

        const estimate = getCalibratedEstimate(task, model);

        return NextResponse.json({
          estimatedMinutes: estimate.estimatedMinutes,
          confidence: estimate.confidence,
          range: estimate.range,
          factors: estimate.factors,
        });
      }

      case "batch": {
        const { tasks } = data;
        if (!tasks || !Array.isArray(tasks)) {
          return NextResponse.json(
            { error: "tasks array is required" },
            { status: 400 }
          );
        }

        const result = calculateTotalTime(tasks, model);

        return NextResponse.json({
          totalMinutes: result.total,
          range: result.range,
          confidence: result.confidence,
          breakdown: result.breakdown.map((b, i) => ({
            index: i,
            taskType: b.task.type,
            taskSize: b.task.size,
            estimatedMinutes: b.estimate.estimatedMinutes,
            confidence: b.estimate.confidence,
          })),
        });
      }

      case "suggest": {
        const { task } = data;
        if (!task || !task.type || !task.size) {
          return NextResponse.json(
            { error: "task with type and size is required" },
            { status: 400 }
          );
        }

        const suggestion = suggestBetterEstimate(task, model);

        return NextResponse.json({
          suggestedMinutes: suggestion.suggestedMinutes,
          currentMinutes: suggestion.currentMinutes,
          reason: suggestion.reason,
          confidence: suggestion.confidence,
        });
      }

      case "tips": {
        const tips = getEstimationTips(model);
        return NextResponse.json({ tips });
      }

      case "record_completion": {
        const { taskId, estimatedMinutes, actualMinutes, taskDetails } = data;
        if (!taskId || estimatedMinutes === undefined || actualMinutes === undefined || !taskDetails) {
          return NextResponse.json(
            { error: "taskId, estimatedMinutes, actualMinutes, and taskDetails are required" },
            { status: 400 }
          );
        }

        await recordActualCompletion(
          userId,
          taskId,
          estimatedMinutes,
          actualMinutes,
          taskDetails
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: estimate, batch, suggest, tips, record_completion` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing estimate request:", error);
    return NextResponse.json(
      { error: "Failed to process estimate request" },
      { status: 500 }
    );
  }
}

// GET /api/learning/estimate - Get estimation summary and tips
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const model = await learningEngine.getModel(userId);
    const tips = getEstimationTips(model);

    return NextResponse.json({
      estimationModel: {
        globalAccuracy: model.estimationModel.globalAccuracy,
        byTaskType: model.estimationModel.byTaskType,
        bySize: model.estimationModel.bySize,
      },
      tips,
      suggestions: model.estimationModel.improvementSuggestions,
    });
  } catch (error) {
    console.error("Error fetching estimation summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimation summary" },
      { status: 500 }
    );
  }
}
