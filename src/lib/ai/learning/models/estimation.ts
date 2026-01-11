// Estimation Calibration Model
// Learns how accurate user time estimates are

import type {
  LearningEvent,
  UserModel,
  EstimationCalibrationModel,
  TaskTypeEstimation,
  SizeEstimation,
  ComplexityEstimation,
} from "../types";
import { getDb } from "../../../db";

// Default estimation model
function defaultEstimationModel(): EstimationCalibrationModel {
  return {
    globalAccuracy: 1.0,
    byTaskType: {},
    bySize: {},
    byComplexity: { byComplexity: {}, multipliers: {} },
    improvementSuggestions: [],
  };
}

// Update estimation model from events
export async function updateEstimationModel(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<EstimationCalibrationModel> {
  const userId = currentModel.userId;
  const db = getDb();

  // Get estimation records from database
  const records = db
    .prepare(
      `SELECT * FROM estimation_records
       WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`
    )
    .all(userId) as Array<{
    item_type: string;
    priority: string;
    estimated_minutes: number;
    actual_minutes: number;
    accuracy: number;
    size: string;
    bias: string;
  }>;

  if (records.length < 5) {
    return currentModel?.estimationModel || defaultEstimationModel();
  }

  // Calculate by task type
  const byTaskType: Record<string, TaskTypeEstimation> = {};
  const types = [...new Set(records.map((r) => r.item_type))];

  for (const type of types) {
    const typeRecords = records.filter((r) => r.item_type === type);
    byTaskType[type] = calculateTypeEstimation(typeRecords);
  }

  // Calculate by size
  const bySize = calculateSizeEstimations(records);

  // Calculate by complexity (derived from priority + estimated size)
  const byComplexity = calculateComplexityEstimation(records);

  // Calculate global accuracy
  const globalAccuracy =
    records.reduce((sum, r) => sum + r.accuracy, 0) / records.length;

  // Generate improvement suggestions
  const suggestions = generateEstimationSuggestions(byTaskType, bySize);

  return {
    globalAccuracy,
    byTaskType,
    bySize,
    byComplexity,
    improvementSuggestions: suggestions,
  };
}

// Calculate estimation stats for a task type
function calculateTypeEstimation(
  records: Array<{
    estimated_minutes: number;
    actual_minutes: number;
    accuracy: number;
  }>
): TaskTypeEstimation {
  const accuracies = records.map((r) => r.accuracy);
  const avgAccuracy = average(accuracies);

  const errors = records.map((r) =>
    Math.abs(r.estimated_minutes - r.actual_minutes)
  );
  const avgError = average(errors);

  let bias: TaskTypeEstimation["bias"] = "accurate";
  if (avgAccuracy > 1.2) bias = "overestimate";
  else if (avgAccuracy < 0.8) bias = "underestimate";

  return {
    accuracy: avgAccuracy,
    averageError: avgError,
    sampleSize: records.length,
    bias,
    suggestedMultiplier: 1 / avgAccuracy, // To correct the bias
  };
}

// Calculate estimations by size category
function calculateSizeEstimations(
  records: Array<{
    size: string;
    estimated_minutes: number;
    actual_minutes: number;
    accuracy: number;
  }>
): Record<string, SizeEstimation> {
  const sizes = ["small", "medium", "large"];
  const result: Record<string, SizeEstimation> = {};

  for (const size of sizes) {
    const sizeRecords = records.filter((r) => r.size === size);

    if (sizeRecords.length < 3) {
      // Not enough data
      result[size] = {
        size: size as "small" | "medium" | "large",
        accuracy: 1.0,
        averageActual: size === "small" ? 20 : size === "medium" ? 60 : 180,
        sampleSize: 0,
        bias: "accurate",
      };
      continue;
    }

    const accuracies = sizeRecords.map((r) => r.accuracy);
    const avgAccuracy = average(accuracies);
    const avgActual = average(sizeRecords.map((r) => r.actual_minutes));

    let bias: SizeEstimation["bias"] = "accurate";
    if (avgAccuracy > 1.2) bias = "overestimate";
    else if (avgAccuracy < 0.8) bias = "underestimate";

    result[size] = {
      size: size as "small" | "medium" | "large",
      accuracy: avgAccuracy,
      averageActual: avgActual,
      sampleSize: sizeRecords.length,
      bias,
    };
  }

  return result;
}

// Calculate complexity-based estimation patterns
function calculateComplexityEstimation(
  records: Array<{
    priority: string;
    size: string;
    accuracy: number;
  }>
): ComplexityEstimation {
  const byComplexity: Record<string, number> = {};
  const multipliers: Record<string, number> = {};

  // Create complexity key from priority + size
  for (const record of records) {
    const key = `${record.priority}-${record.size}`;

    if (!byComplexity[key]) {
      byComplexity[key] = 0;
    }
    byComplexity[key]++;
  }

  // Calculate accuracy multipliers for each complexity level
  const complexityLevels = [...new Set(Object.keys(byComplexity))];

  for (const level of complexityLevels) {
    const levelRecords = records.filter(
      (r) => `${r.priority}-${r.size}` === level
    );
    if (levelRecords.length >= 3) {
      const avgAccuracy = average(levelRecords.map((r) => r.accuracy));
      multipliers[level] = 1 / avgAccuracy;
    }
  }

  return { byComplexity, multipliers };
}

// Generate actionable suggestions for improving estimates
function generateEstimationSuggestions(
  byType: Record<string, TaskTypeEstimation>,
  bySize: Record<string, SizeEstimation>
): string[] {
  const suggestions: string[] = [];

  // Check for consistent overestimation by type
  const overestimators = Object.entries(byType).filter(
    ([, est]) => est.bias === "overestimate" && est.sampleSize >= 3
  );

  if (overestimators.length > 0) {
    const types = overestimators.map(([type]) => type).join(", ");
    const avgMultiplier = average(
      overestimators.map(([, e]) => e.suggestedMultiplier)
    );
    const reduction = Math.round((1 - avgMultiplier) * 100);

    suggestions.push(
      `You tend to overestimate ${types} tasks. Try reducing estimates by ~${reduction}%.`
    );
  }

  // Check for consistent underestimation by type
  const underestimators = Object.entries(byType).filter(
    ([, est]) => est.bias === "underestimate" && est.sampleSize >= 3
  );

  if (underestimators.length > 0) {
    const types = underestimators.map(([type]) => type).join(", ");
    const avgMultiplier = average(
      underestimators.map(([, e]) => e.suggestedMultiplier)
    );
    const increase = Math.round((avgMultiplier - 1) * 100);

    suggestions.push(
      `You tend to underestimate ${types} tasks. Consider adding ~${increase}% buffer time.`
    );
  }

  // Check for size-based patterns
  if (bySize["large"]?.bias === "underestimate" && bySize["large"].sampleSize >= 3) {
    suggestions.push(
      "Large tasks (2+ hours) often take longer than expected. Consider breaking them into smaller pieces."
    );
  }

  if (bySize["small"]?.bias === "overestimate" && bySize["small"].sampleSize >= 3) {
    suggestions.push(
      "You're overestimating small tasks. Trust yourself - you're faster than you think on quick items!"
    );
  }

  // General accuracy feedback
  const allAccuracies = Object.values(byType).map((t) => t.accuracy);
  if (allAccuracies.length > 0) {
    const overallAccuracy = average(allAccuracies);
    if (overallAccuracy >= 0.9 && overallAccuracy <= 1.1) {
      suggestions.push(
        "Great job! Your estimates are generally accurate within 10%."
      );
    }
  }

  return suggestions;
}

// Helper: calculate average of array
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
