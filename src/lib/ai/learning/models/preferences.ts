// Preference Learning Model
// Learns user communication and work preferences

import type {
  LearningEvent,
  UserModel,
  PreferenceModel,
  CommunicationPreference,
  SuggestionPreferenceModel,
  NotificationPreferenceModel,
  WorkStylePreference,
  ImplicitPreference,
} from "../types";
import { getDb } from "../../../db";

// Update preference model from events
export async function updatePreferenceModel(
  events: LearningEvent[],
  currentModel: UserModel
): Promise<PreferenceModel> {
  const userId = currentModel.userId;
  const db = getDb();

  // Get behavior records from database
  const records = db
    .prepare(
      `SELECT * FROM behavior_records
       WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`
    )
    .all(userId) as Array<{
    record_type: string;
    suggestion_type: string | null;
    notification_type: string | null;
    outcome: string | null;
    reason: string | null;
    hour: number | null;
    channel: string | null;
    word_count: number | null;
    has_emoji: number | null;
    is_brief: number | null;
    is_detailed: number | null;
    is_technical: number | null;
    feedback: string | null;
    rating: number | null;
  }>;

  // Analyze suggestion interactions
  const suggestionRecords = records.filter((r) => r.record_type === "suggestion");
  const suggestionPreferences = analyzeSuggestionPreferences(suggestionRecords);

  // Analyze notification interactions
  const notificationRecords = records.filter((r) => r.record_type === "notification");
  const notificationPreferences = analyzeNotificationPreferences(notificationRecords);

  // Infer communication preferences from message style records
  const messageRecords = records.filter((r) => r.record_type === "message_style");
  const communicationStyle = inferCommunicationStyle(messageRecords, currentModel);

  // Infer work style from patterns
  const productivityRecords = db
    .prepare(
      `SELECT hour, day_of_week FROM productivity_records
       WHERE user_id = ? AND record_type = 'completion'
       AND created_at >= datetime('now', '-30 days')`
    )
    .all(userId) as Array<{ hour: number; day_of_week: string }>;
  const workStyle = inferWorkStyle(productivityRecords);

  // Extract implicit preferences
  const implicitPreferences = extractImplicitPreferences(
    events,
    productivityRecords,
    currentModel
  );

  return {
    communicationStyle,
    notificationPreferences,
    suggestionPreferences,
    workStyle,
    implicitPreferences,
  };
}

// Analyze suggestion acceptance patterns
function analyzeSuggestionPreferences(
  records: Array<{
    suggestion_type: string | null;
    outcome: string | null;
    reason: string | null;
    hour: number | null;
  }>
): SuggestionPreferenceModel {
  // Calculate acceptance rates by type
  const acceptanceByType: Record<string, { accepted: number; total: number }> = {};

  for (const record of records) {
    const type = record.suggestion_type || "unknown";
    if (!acceptanceByType[type]) {
      acceptanceByType[type] = { accepted: 0, total: 0 };
    }
    acceptanceByType[type].total++;
    if (record.outcome === "accepted") {
      acceptanceByType[type].accepted++;
    }
  }

  const acceptanceRateByType: Record<string, number> = {};
  for (const [type, data] of Object.entries(acceptanceByType)) {
    acceptanceRateByType[type] = data.total > 0 ? data.accepted / data.total : 0.5;
  }

  // Analyze preferred timing
  const preferredTimingByType: Record<string, string> = {};
  for (const type of Object.keys(acceptanceByType)) {
    const acceptedAtHour = records
      .filter((r) => r.suggestion_type === type && r.outcome === "accepted" && r.hour !== null)
      .map((r) => r.hour as number);

    if (acceptedAtHour.length >= 3) {
      const avgHour = Math.round(
        acceptedAtHour.reduce((a, b) => a + b, 0) / acceptedAtHour.length
      );
      preferredTimingByType[type] = `${avgHour.toString().padStart(2, "0")}:00`;
    }
  }

  // Aggregate dismissal reasons
  const dismissalReasons: Record<string, number> = {};
  for (const record of records) {
    if (record.outcome === "dismissed" && record.reason) {
      dismissalReasons[record.reason] = (dismissalReasons[record.reason] || 0) + 1;
    }
  }

  // Identify most/least valuable suggestions
  const sortedByAcceptance = Object.entries(acceptanceRateByType).sort(
    ([, a], [, b]) => b - a
  );
  const mostValuable = sortedByAcceptance
    .filter(([, rate]) => rate >= 0.5)
    .slice(0, 3)
    .map(([type]) => type);
  const leastValuable = sortedByAcceptance
    .filter(([, rate]) => rate < 0.3)
    .slice(0, 3)
    .map(([type]) => type);

  return {
    acceptanceRateByType,
    preferredTimingByType,
    dismissalReasons,
    mostValuableSuggestions: mostValuable,
    leastValuableSuggestions: leastValuable,
  };
}

// Analyze notification engagement patterns
function analyzeNotificationPreferences(
  records: Array<{
    notification_type: string | null;
    outcome: string | null;
    channel: string | null;
    hour: number | null;
  }>
): NotificationPreferenceModel {
  // Calculate engagement by type
  const valueByType: Record<string, number> = {};
  const typeEngagement: Record<string, { clicked: number; total: number }> = {};

  for (const record of records) {
    const type = record.notification_type || "unknown";
    if (!typeEngagement[type]) {
      typeEngagement[type] = { clicked: 0, total: 0 };
    }
    typeEngagement[type].total++;
    if (record.outcome === "clicked") {
      typeEngagement[type].clicked++;
    }
  }

  for (const [type, data] of Object.entries(typeEngagement)) {
    valueByType[type] = data.total > 0 ? data.clicked / data.total : 0.5;
  }

  // Find peak engagement hour
  const clickedHours = records
    .filter((r) => r.outcome === "clicked" && r.hour !== null)
    .map((r) => r.hour as number);

  let peakEngagementHour: number | null = null;
  if (clickedHours.length >= 5) {
    // Find most common hour for engagement
    const hourCounts: Record<number, number> = {};
    for (const hour of clickedHours) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const [peakHour] = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0] || [];
    peakEngagementHour = peakHour ? parseInt(peakHour) : null;
  }

  // Analyze channel preferences
  const channelPreference: Record<string, number> = {};
  const channelEngagement: Record<string, { clicked: number; total: number }> = {};

  for (const record of records) {
    const channel = record.channel || "in_app";
    if (!channelEngagement[channel]) {
      channelEngagement[channel] = { clicked: 0, total: 0 };
    }
    channelEngagement[channel].total++;
    if (record.outcome === "clicked") {
      channelEngagement[channel].clicked++;
    }
  }

  for (const [channel, data] of Object.entries(channelEngagement)) {
    channelPreference[channel] = data.total > 0 ? data.clicked / data.total : 0.5;
  }

  // Determine grouping preference based on engagement patterns
  const totalNotifications = records.length;
  const avgEngagement = Object.values(valueByType).reduce((a, b) => a + b, 0) /
    Math.max(Object.values(valueByType).length, 1);

  let groupingPreference: NotificationPreferenceModel["groupingPreference"] = "moderate";
  if (avgEngagement < 0.2 && totalNotifications > 20) {
    groupingPreference = "aggressive"; // User ignores most - group heavily
  } else if (avgEngagement > 0.6) {
    groupingPreference = "none"; // User engages - don't hide
  }

  return {
    valueByType,
    peakEngagementHour,
    groupingPreference,
    quietHours: null, // Would need separate tracking
    channelPreference,
  };
}

// Infer communication style from message patterns
function inferCommunicationStyle(
  records: Array<{
    word_count: number | null;
    has_emoji: number | null;
    is_brief: number | null;
    is_detailed: number | null;
    is_technical: number | null;
  }>,
  currentModel: UserModel
): CommunicationPreference {
  if (records.length < 5) {
    return (
      currentModel?.preferences?.communicationStyle || {
        preferredLength: "moderate",
        tonePreference: "professional",
        emojiUsage: "sometimes",
        technicalLevel: "moderate",
        confidence: 0,
      }
    );
  }

  // Analyze length preference
  const briefCount = records.filter((r) => r.is_brief === 1).length;
  const detailedCount = records.filter((r) => r.is_detailed === 1).length;
  let preferredLength: CommunicationPreference["preferredLength"] = "moderate";
  if (briefCount > records.length * 0.6) {
    preferredLength = "brief";
  } else if (detailedCount > records.length * 0.4) {
    preferredLength = "detailed";
  }

  // Analyze emoji usage
  const emojiCount = records.filter((r) => r.has_emoji === 1).length;
  let emojiUsage: CommunicationPreference["emojiUsage"] = "sometimes";
  if (emojiCount === 0) {
    emojiUsage = "never";
  } else if (emojiCount > records.length * 0.5) {
    emojiUsage = "often";
  }

  // Analyze technical level
  const technicalCount = records.filter((r) => r.is_technical === 1).length;
  let technicalLevel: CommunicationPreference["technicalLevel"] = "moderate";
  if (technicalCount > records.length * 0.5) {
    technicalLevel = "technical";
  } else if (technicalCount < records.length * 0.1) {
    technicalLevel = "simple";
  }

  // Calculate confidence based on sample size
  const confidence = Math.min(records.length / 20, 1);

  return {
    preferredLength,
    tonePreference: "professional", // Would need feedback to determine
    emojiUsage,
    technicalLevel,
    confidence,
  };
}

// Infer work style from productivity patterns
function inferWorkStyle(
  records: Array<{ hour: number; day_of_week: string }>
): WorkStylePreference {
  if (records.length < 10) {
    return {
      chronotype: "flexible",
      batchVsSwitch: "mixed",
      planningStyle: "balanced",
      focusStyle: "varied",
    };
  }

  // Determine chronotype
  const hours = records.map((r) => r.hour);
  const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
  let chronotype: WorkStylePreference["chronotype"] = "flexible";
  if (avgHour < 11) {
    chronotype = "morning_person";
  } else if (avgHour > 16) {
    chronotype = "evening_person";
  }

  // Analyze batch vs switch (consecutive completions)
  // This would need more sophisticated analysis of time between completions
  const batchVsSwitch: WorkStylePreference["batchVsSwitch"] = "mixed";

  // Analyze planning style (consistency of work days)
  const dayDistribution = new Map<string, number>();
  for (const record of records) {
    dayDistribution.set(
      record.day_of_week,
      (dayDistribution.get(record.day_of_week) || 0) + 1
    );
  }
  const dayVariance = calculateVariance(Array.from(dayDistribution.values()));
  let planningStyle: WorkStylePreference["planningStyle"] = "balanced";
  if (dayVariance < 2) {
    planningStyle = "detailed"; // Consistent across days
  } else if (dayVariance > 10) {
    planningStyle = "spontaneous"; // Highly variable
  }

  return {
    chronotype,
    batchVsSwitch,
    planningStyle,
    focusStyle: "varied",
  };
}

// Extract implicit preferences from patterns
function extractImplicitPreferences(
  events: LearningEvent[],
  productivityRecords: Array<{ hour: number; day_of_week: string }>,
  currentModel: UserModel
): ImplicitPreference[] {
  const preferences: ImplicitPreference[] = [];

  // Time-based patterns
  if (productivityRecords.length >= 10) {
    const hours = productivityRecords.map((r) => r.hour);
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;

    if (avgHour < 10) {
      preferences.push({
        category: "work_style",
        key: "chronotype",
        value: "morning_person",
        confidence: Math.min(productivityRecords.length / 30, 0.9),
        source: "observed",
      });
    } else if (avgHour > 18) {
      preferences.push({
        category: "work_style",
        key: "chronotype",
        value: "evening_person",
        confidence: Math.min(productivityRecords.length / 30, 0.9),
        source: "observed",
      });
    }
  }

  // Task type preferences from creation patterns
  const taskCreations = events.filter((e) => e.type === "item_created");
  if (taskCreations.length >= 10) {
    const types = taskCreations.map((e) => (e.data.item as { type: string })?.type);
    const typeCounts = countBy(types);
    const [dominantType, count] = Object.entries(typeCounts).sort(
      ([, a], [, b]) => b - a
    )[0] || ["task", 0];

    if (count > taskCreations.length * 0.5) {
      preferences.push({
        category: "task_preferences",
        key: "dominant_type",
        value: dominantType,
        confidence: count / taskCreations.length,
        source: "observed",
      });
    }
  }

  // Weekend work preference
  const weekendWork = productivityRecords.filter((r) =>
    ["Saturday", "Sunday"].includes(r.day_of_week)
  );
  if (weekendWork.length > productivityRecords.length * 0.2) {
    preferences.push({
      category: "work_style",
      key: "works_weekends",
      value: "true",
      confidence: 0.7,
      source: "observed",
    });
  }

  return preferences;
}

// Helper: calculate variance of array
function calculateVariance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

// Helper: count occurrences by value
function countBy<T extends string | number>(arr: (T | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    if (item !== undefined) {
      counts[String(item)] = (counts[String(item)] || 0) + 1;
    }
  }
  return counts;
}
