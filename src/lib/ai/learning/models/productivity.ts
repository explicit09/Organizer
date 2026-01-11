// Productivity Time Model
// Analyzes when users are most productive

import type {
  LearningEvent,
  UserModel,
  ProductivityModel,
  HourScore,
  DayScore,
  TimeWindow,
} from "../types";
import { getDb } from "../../../db";

// Default hour score when no data
function defaultHourScore(hour: number): HourScore {
  // Assume moderate productivity during typical work hours
  const isWorkHour = hour >= 9 && hour <= 17;
  return {
    completionRate: isWorkHour ? 0.5 : 0.2,
    averageQuality: 0.5,
    focusability: isWorkHour ? 0.5 : 0.3,
    sampleSize: 0,
    trend: "stable",
  };
}

// Update productivity model from events
export async function updateProductivityModel(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<ProductivityModel> {
  const userId = currentModel.userId;
  const db = getDb();

  // Get productivity records from database
  const records = db
    .prepare(
      `SELECT * FROM productivity_records
       WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`
    )
    .all(userId) as Array<{
    record_type: string;
    hour: number;
    day_of_week: string;
    duration: number | null;
    completed_count: number | null;
    was_interrupted: number | null;
    item_type: string | null;
  }>;

  const completions = records.filter((r) => r.record_type === "completion");
  const focusSessions = records.filter((r) => r.record_type === "focus_session");

  // Calculate hourly scores
  const hourlyScores: Record<number, HourScore> = {};
  for (let hour = 0; hour < 24; hour++) {
    const hourCompletions = completions.filter((r) => r.hour === hour);
    const hourFocus = focusSessions.filter((r) => r.hour === hour);

    const sampleSize = hourCompletions.length + hourFocus.length;

    if (sampleSize < 3) {
      // Not enough data - use current or default
      hourlyScores[hour] =
        currentModel?.productivityPattern?.hourlyScores?.[hour] ||
        defaultHourScore(hour);
      continue;
    }

    // Calculate completion rate (completions per day this hour was active)
    const activeDays = new Set(
      [...hourCompletions, ...hourFocus].map((r) => r.day_of_week)
    ).size;
    const completionRate = hourCompletions.length / Math.max(activeDays, 1);

    // Calculate focusability from focus sessions
    const focusability = calculateFocusability(hourFocus);

    // Calculate average quality (based on focus session completion rates)
    const averageQuality = calculateAverageQuality(hourFocus);

    // Determine trend compared to previous model
    const previousScore = currentModel?.productivityPattern?.hourlyScores?.[hour];
    const trend = calculateTrend(completionRate, previousScore?.completionRate);

    hourlyScores[hour] = {
      completionRate,
      averageQuality,
      focusability,
      sampleSize,
      trend,
    };
  }

  // Calculate day of week scores
  const dayOfWeekScores = calculateDayScores(completions);

  // Calculate combined scores (e.g., "Monday-9")
  const combinedScores = calculateCombinedScores(hourlyScores, completions);

  // Find optimal focus duration
  const focusDurations = focusSessions
    .filter((s) => (s.completed_count || 0) > 0)
    .map((s) => s.duration || 0);
  const optimalFocusDuration = calculateOptimalDuration(focusDurations);

  // Identify peak productivity windows
  const peakWindows = identifyPeakWindows(hourlyScores);

  return {
    hourlyScores,
    dayOfWeekScores,
    combinedScores,
    optimalFocusDuration,
    optimalBreakFrequency: Math.round(optimalFocusDuration / 25) * 5, // 5 min break per 25 min focus
    peakProductivityWindows: peakWindows,
  };
}

// Calculate focusability score from focus sessions
function calculateFocusability(
  sessions: Array<{ duration: number | null; was_interrupted: number | null }>
): number {
  if (sessions.length === 0) return 0.5;

  // Score based on session completion and interruptions
  const scores = sessions.map((s) => {
    const duration = s.duration || 0;
    const interrupted = s.was_interrupted === 1;

    // Higher score for longer uninterrupted sessions
    let score = Math.min(duration / 60, 1); // Max 1 for 60+ minute sessions
    if (interrupted) score *= 0.7;

    return score;
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Calculate average quality from focus sessions
function calculateAverageQuality(
  sessions: Array<{ completed_count: number | null; duration: number | null }>
): number {
  if (sessions.length === 0) return 0.5;

  const scores = sessions.map((s) => {
    const completed = s.completed_count || 0;
    const duration = s.duration || 1;

    // Quality = items completed per hour of focus
    return Math.min(completed / (duration / 60), 2) / 2; // Normalize to 0-1
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Calculate trend between current and previous value
function calculateTrend(
  current: number,
  previous?: number
): "improving" | "stable" | "declining" {
  if (previous === undefined) return "stable";

  const change = (current - previous) / (previous || 1);
  if (change > 0.1) return "improving";
  if (change < -0.1) return "declining";
  return "stable";
}

// Calculate scores by day of week
function calculateDayScores(
  completions: Array<{ day_of_week: string }>
): Record<string, DayScore> {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const scores: Record<string, DayScore> = {};

  for (const day of days) {
    const dayCompletions = completions.filter((c) => c.day_of_week === day);
    const sampleSize = dayCompletions.length;

    // Assume roughly 4 weeks of data
    const weeksWithData = Math.ceil(sampleSize / 5); // Rough estimate
    const completionRate = sampleSize / Math.max(weeksWithData, 1) / 7;

    scores[day] = {
      completionRate,
      averageCompletions: sampleSize / Math.max(weeksWithData, 1),
      sampleSize,
    };
  }

  return scores;
}

// Calculate combined hour+day scores
function calculateCombinedScores(
  hourlyScores: Record<number, HourScore>,
  completions: Array<{ day_of_week: string; hour: number }>
): Record<string, number> {
  const combined: Record<string, number> = {};
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day.toLowerCase()}-${hour}`;
      const dayHourCompletions = completions.filter(
        (c) => c.day_of_week === day && c.hour === hour
      );

      // Combine hourly score with day-specific data
      const baseScore = hourlyScores[hour]?.completionRate || 0;
      const dayModifier = dayHourCompletions.length > 0 ? 1.2 : 0.8;

      combined[key] = baseScore * dayModifier;
    }
  }

  return combined;
}

// Calculate optimal focus duration from successful sessions
function calculateOptimalDuration(durations: number[]): number {
  if (durations.length === 0) return 25; // Default Pomodoro

  // Filter out outliers
  const sorted = [...durations].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = sorted.filter((d) => d >= q1 - 1.5 * iqr && d <= q3 + 1.5 * iqr);

  if (filtered.length === 0) return 25;

  // Return the median of successful sessions
  const median = filtered[Math.floor(filtered.length / 2)];
  return Math.round(median / 5) * 5; // Round to nearest 5 minutes
}

// Identify peak productivity windows
function identifyPeakWindows(
  hourlyScores: Record<number, HourScore>
): TimeWindow[] {
  const windows: TimeWindow[] = [];
  const scores = Object.values(hourlyScores);

  if (scores.length === 0) return windows;

  // Find max completion rate
  const maxScore = Math.max(...scores.map((s) => s.completionRate));
  const threshold = maxScore * 0.7; // Top 30%

  // Find consecutive hours above threshold
  let windowStart: number | null = null;

  for (let hour = 0; hour < 24; hour++) {
    const score = hourlyScores[hour];
    const isAboveThreshold = score && score.completionRate >= threshold;

    if (isAboveThreshold && windowStart === null) {
      windowStart = hour;
    } else if (!isAboveThreshold && windowStart !== null) {
      windows.push({
        start: windowStart,
        end: hour,
        score: calculateWindowScore(hourlyScores, windowStart, hour),
        label: labelTimeWindow(windowStart, hour),
      });
      windowStart = null;
    }
  }

  // Handle window that extends to midnight
  if (windowStart !== null) {
    windows.push({
      start: windowStart,
      end: 24,
      score: calculateWindowScore(hourlyScores, windowStart, 24),
      label: labelTimeWindow(windowStart, 24),
    });
  }

  // Sort by score and return top 3
  return windows.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Calculate aggregate score for a time window
function calculateWindowScore(
  hourlyScores: Record<number, HourScore>,
  start: number,
  end: number
): number {
  let totalScore = 0;
  let count = 0;

  for (let hour = start; hour < end; hour++) {
    const score = hourlyScores[hour];
    if (score) {
      totalScore += score.completionRate + score.focusability;
      count++;
    }
  }

  return count > 0 ? totalScore / count : 0;
}

// Generate human-readable label for time window
function labelTimeWindow(start: number, end: number): string {
  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return "12am";
    if (h === 12) return "12pm";
    return h > 12 ? `${h - 12}pm` : `${h}am`;
  };

  // Give descriptive names for common windows
  if (start >= 6 && end <= 12) return "Morning";
  if (start >= 12 && end <= 17) return "Afternoon";
  if (start >= 17 && end <= 21) return "Evening";
  if (start >= 21 || end <= 6) return "Night";

  return `${formatHour(start)} - ${formatHour(end)}`;
}
