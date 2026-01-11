// Adaptive Notifications
// Personalizes notification delivery based on learned preferences

import type { AdaptedNotification, UserModel } from "../types";
import { adaptMessage } from "./suggestions";
import { getDb } from "../../../db";

// Adapt notification delivery for a user
export function adaptNotificationDelivery(
  notification: { type: string; priority: string; message: string },
  model: UserModel
): AdaptedNotification {
  const prefs = model.preferences.notificationPreferences;

  // Check if this notification type is valuable to user
  const typeValue = prefs.valueByType[notification.type];
  if (typeValue !== undefined && typeValue < 0.2) {
    // User rarely engages with this type
    if (notification.priority !== "urgent") {
      return {
        skip: true,
        reason: "low_engagement_type",
      };
    }
  }

  // Determine optimal channel based on preferences
  const optimalChannel = determineOptimalChannel(notification, prefs);

  // Determine optimal timing
  const optimalTime = determineOptimalTiming(notification, prefs, model);

  // Determine if should be grouped
  const shouldGroup = shouldGroupNotification(notification, prefs);

  // Adapt message to user's style
  const adaptedMessage = adaptMessage(
    notification.message,
    model.preferences.communicationStyle
  );

  return {
    skip: false,
    channel: optimalChannel,
    deliverAt: optimalTime,
    groupWith: shouldGroup ? findSimilarPending(model.userId, notification.type) : undefined,
    adaptedMessage,
  };
}

// Determine optimal notification channel
function determineOptimalChannel(
  notification: { type: string; priority: string },
  prefs: UserModel["preferences"]["notificationPreferences"]
): string {
  // Urgent always goes to most engaged channel
  if (notification.priority === "urgent") {
    const bestChannel = Object.entries(prefs.channelPreference)
      .sort(([, a], [, b]) => b - a)[0];
    return bestChannel?.[0] || "in_app";
  }

  // For other priorities, use channel with best engagement for this type
  const channelEngagement = prefs.channelPreference;

  // Default to in_app if no preference data
  if (Object.keys(channelEngagement).length === 0) {
    return "in_app";
  }

  // Return highest engagement channel
  const [bestChannel] = Object.entries(channelEngagement)
    .sort(([, a], [, b]) => b - a)[0] || ["in_app", 0];

  return bestChannel;
}

// Determine optimal notification timing
function determineOptimalTiming(
  notification: { type: string; priority: string },
  prefs: UserModel["preferences"]["notificationPreferences"],
  model: UserModel
): Date {
  const now = new Date();

  // Urgent notifications go immediately
  if (notification.priority === "urgent") {
    return now;
  }

  // Check quiet hours
  if (prefs.quietHours && isInQuietHours(now, prefs.quietHours)) {
    return getEndOfQuietHours(prefs.quietHours);
  }

  // Check user's peak engagement hour
  const peakHour = prefs.peakEngagementHour;
  if (peakHour !== null && notification.priority !== "high") {
    const currentHour = now.getHours();

    // If we're far from peak hour, schedule for it
    if (Math.abs(currentHour - peakHour) > 2) {
      const scheduledTime = new Date(now);
      scheduledTime.setHours(peakHour, 0, 0, 0);

      // If that time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      return scheduledTime;
    }
  }

  // Check productivity patterns - don't interrupt during peak productivity
  const productivityWindows = model.productivityPattern.peakProductivityWindows;
  const currentHour = now.getHours();

  for (const window of productivityWindows) {
    if (currentHour >= window.start && currentHour < window.end) {
      // User is in a productive window
      if (notification.priority === "low") {
        // Delay low priority until after productive window
        const afterWindow = new Date(now);
        afterWindow.setHours(window.end, 0, 0, 0);
        return afterWindow;
      }
    }
  }

  return now;
}

// Check if current time is in quiet hours
function isInQuietHours(
  now: Date,
  quietHours: { start: number; end: number }
): boolean {
  const hour = now.getHours();
  const { start, end } = quietHours;

  // Handle overnight quiet hours (e.g., 22-8)
  if (start > end) {
    return hour >= start || hour < end;
  }

  return hour >= start && hour < end;
}

// Get end of quiet hours
function getEndOfQuietHours(quietHours: { start: number; end: number }): Date {
  const now = new Date();
  const endTime = new Date(now);
  endTime.setHours(quietHours.end, 0, 0, 0);

  // If end time has passed, it's for tomorrow
  if (endTime <= now) {
    endTime.setDate(endTime.getDate() + 1);
  }

  return endTime;
}

// Determine if notification should be grouped
function shouldGroupNotification(
  notification: { type: string; priority: string },
  prefs: UserModel["preferences"]["notificationPreferences"]
): boolean {
  // Never group urgent
  if (notification.priority === "urgent") {
    return false;
  }

  // Check user's grouping preference
  switch (prefs.groupingPreference) {
    case "aggressive":
      return true;
    case "moderate":
      return notification.priority === "low";
    case "none":
      return false;
    default:
      return notification.priority === "low";
  }
}

// Find similar pending notifications for grouping
function findSimilarPending(userId: string, notificationType: string): string[] {
  const db = getDb();

  // Find pending notifications of similar type from last hour
  const pending = db
    .prepare(
      `SELECT id FROM in_app_notifications
       WHERE user_id = ? AND dismissed = 0 AND shown = 0
       AND json_extract(notification_json, '$.message.type') = ?
       AND created_at >= datetime('now', '-1 hour')`
    )
    .all(userId, notificationType) as Array<{ id: string }>;

  return pending.map((p) => p.id);
}

// Batch multiple notifications into a digest
export function createNotificationDigest(
  notifications: Array<{ type: string; priority: string; message: string }>,
  model: UserModel
): { message: string; count: number; types: string[] } {
  const types = [...new Set(notifications.map((n) => n.type))];
  const highPriorityCount = notifications.filter(
    (n) => n.priority === "high" || n.priority === "urgent"
  ).length;

  let message: string;

  if (types.length === 1) {
    message = `You have ${notifications.length} ${types[0]} notifications.`;
  } else if (highPriorityCount > 0) {
    message = `You have ${notifications.length} notifications, including ${highPriorityCount} high priority.`;
  } else {
    message = `You have ${notifications.length} notifications across ${types.length} categories.`;
  }

  // Adapt to user's style
  const adaptedMessage = adaptMessage(message, model.preferences.communicationStyle);

  return {
    message: adaptedMessage,
    count: notifications.length,
    types,
  };
}

// Calculate optimal notification frequency for a user
export function calculateOptimalFrequency(model: UserModel): {
  maxPerHour: number;
  maxPerDay: number;
  batchingInterval: number; // minutes
} {
  const prefs = model.preferences.notificationPreferences;

  // Start with defaults
  let maxPerHour = 5;
  let maxPerDay = 20;
  let batchingInterval = 30;

  // Adjust based on engagement patterns
  const avgEngagement = Object.values(prefs.valueByType).reduce((a, b) => a + b, 0) /
    Math.max(Object.values(prefs.valueByType).length, 1);

  if (avgEngagement < 0.3) {
    // Low engagement - reduce frequency significantly
    maxPerHour = 2;
    maxPerDay = 8;
    batchingInterval = 60;
  } else if (avgEngagement > 0.7) {
    // High engagement - can send more
    maxPerHour = 8;
    maxPerDay = 30;
    batchingInterval = 15;
  }

  // Adjust based on grouping preference
  switch (prefs.groupingPreference) {
    case "aggressive":
      maxPerHour = Math.ceil(maxPerHour * 0.5);
      maxPerDay = Math.ceil(maxPerDay * 0.5);
      batchingInterval = Math.ceil(batchingInterval * 1.5);
      break;
    case "none":
      batchingInterval = 5; // Minimal batching
      break;
  }

  return { maxPerHour, maxPerDay, batchingInterval };
}

// Check if user has reached notification limit
export async function hasReachedLimit(
  userId: string,
  model: UserModel
): Promise<{ hourlyLimitReached: boolean; dailyLimitReached: boolean }> {
  const db = getDb();
  const limits = calculateOptimalFrequency(model);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hourlyCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM proactive_notifications
       WHERE user_id = ? AND sent_at >= ?`
    )
    .get(userId, oneHourAgo) as { count: number };

  const dailyCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM proactive_notifications
       WHERE user_id = ? AND sent_at >= ?`
    )
    .get(userId, today.toISOString()) as { count: number };

  return {
    hourlyLimitReached: hourlyCount.count >= limits.maxPerHour,
    dailyLimitReached: dailyCount.count >= limits.maxPerDay,
  };
}
