// Adaptive Time Estimates
// Provides calibrated time estimates based on learned user patterns

import type { UserModel, EstimationCalibrationModel, TimePrediction } from "../types";
import { getDb } from "../../../db";

interface TaskDetails {
  type: string;
  size: "small" | "medium" | "large";
  complexity?: "simple" | "moderate" | "complex";
  estimatedMinutes?: number;
  title?: string;
  tags?: string[];
  projectId?: string;
}

interface CalibrationFactors {
  typeMultiplier: number;
  sizeMultiplier: number;
  timeOfDayMultiplier: number;
  dayOfWeekMultiplier: number;
  complexityMultiplier: number;
  contextMultiplier: number;
}

// Get calibrated time estimate for a task
export function getCalibratedEstimate(
  task: TaskDetails,
  model: UserModel
): TimePrediction {
  const estimation = model.estimationModel;
  const baseEstimate = task.estimatedMinutes || getDefaultEstimate(task.size);

  // Get all calibration factors
  const factors = calculateCalibrationFactors(task, model);

  // Apply calibration
  const calibratedMinutes = Math.round(
    baseEstimate *
      factors.typeMultiplier *
      factors.sizeMultiplier *
      factors.timeOfDayMultiplier *
      factors.dayOfWeekMultiplier *
      factors.complexityMultiplier *
      factors.contextMultiplier
  );

  // Calculate confidence based on sample size and recent accuracy
  const confidence = calculateEstimationConfidence(task, estimation);

  // Calculate range based on historical variance
  const variance = getEstimationVariance(task, estimation);
  const lowEstimate = Math.round(calibratedMinutes * (1 - variance));
  const highEstimate = Math.round(calibratedMinutes * (1 + variance));

  return {
    estimatedMinutes: calibratedMinutes,
    confidence,
    range: {
      low: Math.max(lowEstimate, 1),
      high: highEstimate,
    },
    factors: generateFactorExplanation(factors, baseEstimate, calibratedMinutes),
  };
}

// Get default estimate based on size
function getDefaultEstimate(size: TaskDetails["size"]): number {
  switch (size) {
    case "small":
      return 15;
    case "medium":
      return 45;
    case "large":
      return 120;
    default:
      return 30;
  }
}

// Calculate all calibration factors
function calculateCalibrationFactors(
  task: TaskDetails,
  model: UserModel
): CalibrationFactors {
  const estimation = model.estimationModel;

  return {
    typeMultiplier: getTypeMultiplier(task.type, estimation),
    sizeMultiplier: getSizeMultiplier(task.size, estimation),
    timeOfDayMultiplier: getTimeOfDayMultiplier(model),
    dayOfWeekMultiplier: getDayOfWeekMultiplier(model),
    complexityMultiplier: getComplexityMultiplier(task.complexity),
    contextMultiplier: getContextMultiplier(task, model),
  };
}

// Get multiplier based on task type accuracy history
function getTypeMultiplier(
  type: string,
  estimation: EstimationCalibrationModel
): number {
  const typeData = estimation.byTaskType[type];
  if (!typeData || typeData.sampleSize < 3) {
    return 1.0; // Not enough data
  }

  // If user consistently underestimates this type, increase estimate
  // accuracy < 1 means actual > estimated (underestimate)
  // accuracy > 1 means actual < estimated (overestimate)
  if (typeData.accuracy < 0.8) {
    // Underestimates by 20%+ - increase estimate
    return 1 / typeData.accuracy;
  } else if (typeData.accuracy > 1.2) {
    // Overestimates by 20%+ - decrease estimate
    return 1 / typeData.accuracy;
  }

  return 1.0;
}

// Get multiplier based on task size accuracy history
function getSizeMultiplier(
  size: TaskDetails["size"],
  estimation: EstimationCalibrationModel
): number {
  const sizeData = estimation.bySize[size];
  if (!sizeData || sizeData.sampleSize < 3) {
    return 1.0;
  }

  // Apply inverse of accuracy to correct estimates
  if (sizeData.accuracy < 0.7 || sizeData.accuracy > 1.3) {
    return 1 / sizeData.accuracy;
  }

  return 1.0;
}

// Get multiplier based on current time of day productivity
function getTimeOfDayMultiplier(model: UserModel): number {
  const currentHour = new Date().getHours();
  const hourlyScores = model.productivityPattern.hourlyScores;

  const currentScore = hourlyScores[currentHour];
  const currentProductivity = currentScore?.completionRate || 0.5;

  const allScores = Object.values(hourlyScores);
  const avgProductivity = allScores.length > 0
    ? allScores.reduce((a, b) => a + b.completionRate, 0) / allScores.length
    : 0.5;

  if (avgProductivity === 0) return 1.0;

  // Higher productivity = lower estimate needed (work faster)
  // Lower productivity = higher estimate needed (work slower)
  const ratio = avgProductivity / currentProductivity;

  // Clamp to reasonable range
  return Math.max(0.7, Math.min(1.5, ratio));
}

// Get multiplier based on day of week productivity
function getDayOfWeekMultiplier(model: UserModel): number {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[new Date().getDay()];
  const dayOfWeekScores = model.productivityPattern.dayOfWeekScores;

  const todayScore = dayOfWeekScores[currentDay];
  const todayProductivity = todayScore?.completionRate || 0.5;

  const allScores = Object.values(dayOfWeekScores);
  const avgProductivity = allScores.length > 0
    ? allScores.reduce((a, b) => a + b.completionRate, 0) / allScores.length
    : 0.5;

  if (avgProductivity === 0) return 1.0;

  const ratio = avgProductivity / todayProductivity;
  return Math.max(0.8, Math.min(1.3, ratio));
}

// Get multiplier based on task complexity
function getComplexityMultiplier(
  complexity?: TaskDetails["complexity"]
): number {
  switch (complexity) {
    case "simple":
      return 0.8;
    case "complex":
      return 1.4;
    case "moderate":
    default:
      return 1.0;
  }
}

// Get context-based multiplier (project patterns, similar tasks)
function getContextMultiplier(task: TaskDetails, model: UserModel): number {
  let multiplier = 1.0;
  const db = getDb();

  // Check project-specific patterns
  if (task.projectId) {
    const projectStats = db
      .prepare(
        `SELECT AVG(CAST(actual_minutes AS FLOAT) / NULLIF(estimated_minutes, 0)) as avg_ratio
         FROM estimation_records
         WHERE user_id = ? AND project_id = ? AND actual_minutes IS NOT NULL
         AND created_at >= datetime('now', '-30 days')`
      )
      .get(model.userId, task.projectId) as { avg_ratio: number | null } | undefined;

    if (projectStats?.avg_ratio && projectStats.avg_ratio > 0) {
      // Tasks in this project tend to take X times longer/shorter
      multiplier *= Math.max(0.5, Math.min(2.0, projectStats.avg_ratio));
    }
  }

  // Check similar task patterns by keywords in title
  if (task.title) {
    const keywords = extractKeywords(task.title);
    if (keywords.length > 0) {
      const placeholders = keywords.map(() => "?").join(",");
      const similarStats = db
        .prepare(
          `SELECT AVG(CAST(actual_minutes AS FLOAT) / NULLIF(estimated_minutes, 0)) as avg_ratio
           FROM estimation_records
           WHERE user_id = ?
           AND (${keywords.map(() => "title LIKE ?").join(" OR ")})
           AND actual_minutes IS NOT NULL
           AND created_at >= datetime('now', '-60 days')`
        )
        .get(model.userId, ...keywords.map((k) => `%${k}%`)) as { avg_ratio: number | null } | undefined;

      if (similarStats?.avg_ratio && similarStats.avg_ratio > 0) {
        // Blend with existing multiplier
        multiplier = (multiplier + similarStats.avg_ratio) / 2;
      }
    }
  }

  return Math.max(0.5, Math.min(2.0, multiplier));
}

// Extract meaningful keywords from title
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "this", "that", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "what", "which", "who", "when", "where", "why", "how",
  ]);

  return title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 3); // Take top 3 keywords
}

// Calculate estimation confidence
function calculateEstimationConfidence(
  task: TaskDetails,
  estimation: EstimationCalibrationModel
): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence with sample size
  const typeData = estimation.byTaskType[task.type];
  if (typeData) {
    confidence += Math.min(typeData.sampleSize / 20, 0.2); // Up to +0.2 from type samples
  }

  const sizeData = estimation.bySize[task.size];
  if (sizeData) {
    confidence += Math.min(sizeData.sampleSize / 20, 0.15); // Up to +0.15 from size samples
  }

  // Reduce confidence if high variance (use averageError as proxy)
  if (typeData?.averageError && typeData.averageError > 30) {
    confidence *= 0.8;
  }

  // Factor in overall model accuracy
  confidence *= estimation.globalAccuracy;

  return Math.max(0.1, Math.min(0.95, confidence));
}

// Get estimation variance for range calculation
function getEstimationVariance(
  task: TaskDetails,
  estimation: EstimationCalibrationModel
): number {
  const typeData = estimation.byTaskType[task.type];
  const sizeData = estimation.bySize[task.size];

  // Use averageError from type data as variance proxy
  if (typeData?.averageError !== undefined && typeData.averageError > 0) {
    // Normalize error to a variance-like value (0-1 range)
    return Math.min(typeData.averageError / 60, 0.5);
  }

  // Fall back to size-based default variance
  switch (task.size) {
    case "small":
      return 0.3;
    case "medium":
      return 0.4;
    case "large":
      return 0.5;
    default:
      return 0.35;
  }
}

// Generate human-readable explanation of factors
function generateFactorExplanation(
  factors: CalibrationFactors,
  baseEstimate: number,
  finalEstimate: number
): string[] {
  const explanations: string[] = [];

  if (factors.typeMultiplier !== 1.0) {
    const direction = factors.typeMultiplier > 1 ? "longer" : "shorter";
    explanations.push(
      `Tasks of this type typically take ${direction} than estimated`
    );
  }

  if (factors.sizeMultiplier !== 1.0) {
    const direction = factors.sizeMultiplier > 1 ? "longer" : "shorter";
    explanations.push(
      `${factors.sizeMultiplier > 1 ? "Large" : "Small"} tasks tend to take ${direction}`
    );
  }

  if (factors.timeOfDayMultiplier > 1.1) {
    explanations.push("Adjusted for lower productivity at this time of day");
  } else if (factors.timeOfDayMultiplier < 0.9) {
    explanations.push("Adjusted for higher productivity at this time of day");
  }

  if (factors.dayOfWeekMultiplier > 1.1) {
    explanations.push("Adjusted for typically slower day of week");
  } else if (factors.dayOfWeekMultiplier < 0.9) {
    explanations.push("Adjusted for typically productive day of week");
  }

  if (factors.complexityMultiplier !== 1.0) {
    explanations.push(
      `Adjusted for ${factors.complexityMultiplier > 1 ? "high" : "low"} complexity`
    );
  }

  if (factors.contextMultiplier !== 1.0) {
    explanations.push("Adjusted based on similar task history");
  }

  if (explanations.length === 0 && finalEstimate !== baseEstimate) {
    explanations.push("Calibrated based on historical accuracy");
  }

  return explanations;
}

// Batch estimate multiple tasks
export function getCalibratedEstimates(
  tasks: TaskDetails[],
  model: UserModel
): Map<number, TimePrediction> {
  const estimates = new Map<number, TimePrediction>();

  for (let i = 0; i < tasks.length; i++) {
    estimates.set(i, getCalibratedEstimate(tasks[i], model));
  }

  return estimates;
}

// Calculate total time for a list of tasks
export function calculateTotalTime(
  tasks: TaskDetails[],
  model: UserModel
): {
  total: number;
  range: { low: number; high: number };
  confidence: number;
  breakdown: Array<{ task: TaskDetails; estimate: TimePrediction }>;
} {
  const breakdown: Array<{ task: TaskDetails; estimate: TimePrediction }> = [];
  let totalMinutes = 0;
  let totalLow = 0;
  let totalHigh = 0;
  let confidenceSum = 0;

  for (const task of tasks) {
    const estimate = getCalibratedEstimate(task, model);
    breakdown.push({ task, estimate });

    totalMinutes += estimate.estimatedMinutes;
    totalLow += estimate.range.low;
    totalHigh += estimate.range.high;
    confidenceSum += estimate.confidence;
  }

  const avgConfidence = tasks.length > 0 ? confidenceSum / tasks.length : 0;

  // Reduce confidence for larger task sets (more uncertainty)
  const setConfidencePenalty = Math.max(0.7, 1 - tasks.length * 0.02);

  return {
    total: totalMinutes,
    range: {
      low: totalLow,
      high: totalHigh,
    },
    confidence: avgConfidence * setConfidencePenalty,
    breakdown,
  };
}

// Suggest better estimate for a task
export function suggestBetterEstimate(
  task: TaskDetails,
  model: UserModel
): {
  suggestedMinutes: number;
  currentMinutes: number;
  reason: string;
  confidence: number;
} {
  const calibrated = getCalibratedEstimate(task, model);
  const currentMinutes = task.estimatedMinutes || getDefaultEstimate(task.size);

  const diff = Math.abs(calibrated.estimatedMinutes - currentMinutes);
  const percentDiff = diff / currentMinutes;

  let reason: string;
  if (calibrated.estimatedMinutes > currentMinutes) {
    if (percentDiff > 0.5) {
      reason = `Based on your history, this task will likely take significantly longer. Consider ${calibrated.estimatedMinutes} minutes.`;
    } else {
      reason = `You tend to slightly underestimate tasks like this. ${calibrated.estimatedMinutes} minutes may be more realistic.`;
    }
  } else if (calibrated.estimatedMinutes < currentMinutes) {
    if (percentDiff > 0.3) {
      reason = `You're usually faster with tasks like this. ${calibrated.estimatedMinutes} minutes should be sufficient.`;
    } else {
      reason = `Your estimate looks reasonable, though you might finish a bit earlier.`;
    }
  } else {
    reason = "Your estimate aligns well with your historical performance.";
  }

  return {
    suggestedMinutes: calibrated.estimatedMinutes,
    currentMinutes,
    reason,
    confidence: calibrated.confidence,
  };
}

// Get estimation improvement tips
export function getEstimationTips(model: UserModel): string[] {
  const tips: string[] = [];
  const estimation = model.estimationModel;

  // Check for systematic biases
  for (const [type, data] of Object.entries(estimation.byTaskType)) {
    if (data.sampleSize >= 5) {
      if (data.accuracy < 0.6) {
        tips.push(
          `You consistently underestimate "${type}" tasks. Try adding 50% buffer to your estimates.`
        );
      } else if (data.accuracy > 1.5) {
        tips.push(
          `You often overestimate "${type}" tasks. Your estimates can be more aggressive.`
        );
      }
    }
  }

  // Size-based tips
  for (const [size, data] of Object.entries(estimation.bySize)) {
    if (data.sampleSize >= 5 && data.accuracy < 0.7) {
      tips.push(
        `${size.charAt(0).toUpperCase() + size.slice(1)} tasks often take longer than expected. Break them into smaller pieces.`
      );
    }
  }

  // General tips based on patterns
  if (estimation.globalAccuracy < 0.5) {
    tips.push(
      "Your estimation accuracy varies. Try tracking actual time spent to improve calibration."
    );
  }

  // Productivity-based tips
  const peakWindows = model.productivityPattern.peakProductivityWindows;
  if (peakWindows.length > 0) {
    const peakHours = peakWindows.map((w) => `${w.start}:00-${w.end}:00`).join(", ");
    tips.push(
      `Schedule complex tasks during your peak hours (${peakHours}) for better accuracy.`
    );
  }

  return tips;
}

// Record actual completion for future calibration
export async function recordActualCompletion(
  userId: string,
  taskId: string,
  estimatedMinutes: number,
  actualMinutes: number,
  taskDetails: TaskDetails
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO estimation_records
     (id, user_id, task_id, task_type, task_size, estimated_minutes, actual_minutes,
      title, project_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    userId,
    taskId,
    taskDetails.type,
    taskDetails.size,
    estimatedMinutes,
    actualMinutes,
    taskDetails.title || null,
    taskDetails.projectId || null,
    now
  );
}
