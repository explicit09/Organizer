// Notification Delivery System

import type {
  ProactiveMessage,
  NotificationChannel,
  NotificationPreferences,
  InAppNotification,
  NotificationType,
  TriggerPriority,
} from "./types";
import { getDb } from "../../db";
import { randomUUID } from "crypto";

// Notification manager handles delivery across channels
class NotificationManager {
  // Deliver a notification to appropriate channels
  async deliver(
    userId: string,
    message: ProactiveMessage,
    preferences: NotificationPreferences
  ): Promise<string[]> {
    const deliveredTo: string[] = [];

    // Check quiet hours
    if (this.isQuietHours(preferences) && !this.shouldOverrideQuiet(message, preferences)) {
      // Queue for later delivery
      await this.queueForLater(userId, message);
      return ["queued"];
    }

    // Check daily limit
    if (await this.hasReachedDailyLimit(userId, preferences)) {
      // Only deliver urgent notifications
      if (message.priority !== "urgent" && message.priority !== "high") {
        await this.queueForLater(userId, message);
        return ["queued_limit"];
      }
    }

    // Deliver to each enabled channel
    for (const channel of preferences.channels) {
      try {
        await this.deliverToChannel(userId, message, channel);
        deliveredTo.push(channel);
      } catch (error) {
        console.error(`Failed to deliver to ${channel}:`, error);
      }
    }

    return deliveredTo;
  }

  // Check if currently in quiet hours
  private isQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const hour = now.getHours();
    const { start, end } = preferences.quietHours;

    // Handle overnight quiet hours (e.g., 22-8)
    if (start > end) {
      return hour >= start || hour < end;
    }

    return hour >= start && hour < end;
  }

  // Check if message should override quiet hours
  private shouldOverrideQuiet(
    message: ProactiveMessage,
    preferences: NotificationPreferences
  ): boolean {
    return preferences.urgentOverridesQuiet && message.priority === "urgent";
  }

  // Check if daily notification limit reached
  private async hasReachedDailyLimit(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = db
      .prepare(
        `SELECT COUNT(*) as count FROM proactive_notifications
         WHERE user_id = ? AND sent_at >= ?`
      )
      .get(userId, today.toISOString()) as { count: number };

    return count.count >= preferences.maxPerDay;
  }

  // Queue notification for later delivery
  private async queueForLater(userId: string, message: ProactiveMessage): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO notification_queue
       (id, user_id, message_json, queued_at, deliver_after)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, JSON.stringify(message), now, this.getNextDeliveryTime().toISOString());
  }

  // Get next available delivery time
  private getNextDeliveryTime(): Date {
    const now = new Date();
    // Default to 8am next day
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next;
  }

  // Deliver to specific channel
  private async deliverToChannel(
    userId: string,
    message: ProactiveMessage,
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel) {
      case "in_app":
        await this.deliverInApp(userId, message);
        break;
      case "push":
        await this.deliverPush(userId, message);
        break;
      case "email":
        await this.deliverEmail(userId, message);
        break;
    }
  }

  // In-app notification delivery
  private async deliverInApp(userId: string, message: ProactiveMessage): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const notification: InAppNotification = {
      id,
      type: this.getNotificationType(message.priority),
      message,
      persistent: message.priority === "high" || message.priority === "urgent",
      dismissable: true,
      autoHideSeconds: message.priority === "low" ? 10 : null,
    };

    db.prepare(
      `INSERT INTO in_app_notifications
       (id, user_id, notification_json, created_at, shown, dismissed)
       VALUES (?, ?, ?, ?, 0, 0)`
    ).run(id, userId, JSON.stringify(notification), now);
  }

  // Push notification delivery (placeholder)
  private async deliverPush(userId: string, message: ProactiveMessage): Promise<void> {
    // TODO: Implement actual push notification delivery
    // This would integrate with a push service like Firebase, OneSignal, etc.
    console.log(`[Push] Would send to ${userId}: ${message.title}`);
  }

  // Email notification delivery (placeholder)
  private async deliverEmail(userId: string, message: ProactiveMessage): Promise<void> {
    // TODO: Implement actual email delivery
    // This would integrate with an email service
    console.log(`[Email] Would send to ${userId}: ${message.title}`);
  }

  // Get notification type based on priority
  private getNotificationType(priority: TriggerPriority): NotificationType {
    switch (priority) {
      case "urgent":
        return "modal";
      case "high":
        return "banner";
      case "medium":
        return "toast";
      case "low":
        return "sidebar";
    }
  }

  // Get pending in-app notifications for a user
  async getPendingInApp(userId: string): Promise<InAppNotification[]> {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT notification_json FROM in_app_notifications
         WHERE user_id = ? AND shown = 0 AND dismissed = 0
         ORDER BY created_at DESC
         LIMIT 10`
      )
      .all(userId) as Array<{ notification_json: string }>;

    return rows.map((r) => JSON.parse(r.notification_json));
  }

  // Mark in-app notification as shown
  async markShown(notificationId: string): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE in_app_notifications SET shown = 1 WHERE id = ?`).run(notificationId);
  }

  // Dismiss in-app notification
  async dismiss(notificationId: string): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE in_app_notifications SET dismissed = 1 WHERE id = ?`).run(notificationId);
  }

  // Process queued notifications
  async processQueue(): Promise<number> {
    const db = getDb();
    const now = new Date().toISOString();

    // Get queued notifications that are ready to deliver
    const queued = db
      .prepare(
        `SELECT id, user_id, message_json FROM notification_queue
         WHERE deliver_after <= ? AND delivered = 0
         LIMIT 50`
      )
      .all(now) as Array<{
      id: string;
      user_id: string;
      message_json: string;
    }>;

    let delivered = 0;

    for (const item of queued) {
      try {
        const message = JSON.parse(item.message_json) as ProactiveMessage;
        await this.deliverInApp(item.user_id, message);

        // Mark as delivered
        db.prepare(`UPDATE notification_queue SET delivered = 1 WHERE id = ?`).run(item.id);

        delivered++;
      } catch (error) {
        console.error(`Failed to deliver queued notification ${item.id}:`, error);
      }
    }

    return delivered;
  }

  // Group similar notifications
  async groupSimilar(
    userId: string,
    notifications: ProactiveMessage[]
  ): Promise<ProactiveMessage[]> {
    // Group by title similarity
    const groups = new Map<string, ProactiveMessage[]>();

    for (const notif of notifications) {
      // Simple grouping by title prefix
      const key = notif.title.split(" ").slice(0, 2).join(" ");
      const existing = groups.get(key) || [];
      existing.push(notif);
      groups.set(key, existing);
    }

    const result: ProactiveMessage[] = [];

    for (const [key, group] of groups) {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Create grouped notification
        result.push({
          title: `${group.length} ${key} Notifications`,
          message: `You have ${group.length} related notifications. Click to view all.`,
          suggestions: [
            {
              label: "View all",
              action: "view_grouped_notifications",
              params: { notifications: group },
            },
            { label: "Dismiss all", action: "dismiss_all" },
          ],
          priority: this.highestPriority(group.map((n) => n.priority)),
        });
      }
    }

    return result;
  }

  // Get highest priority from list
  private highestPriority(priorities: TriggerPriority[]): TriggerPriority {
    const order: TriggerPriority[] = ["urgent", "high", "medium", "low"];
    for (const p of order) {
      if (priorities.includes(p)) return p;
    }
    return "low";
  }

  // Get notification statistics
  async getStats(userId: string): Promise<NotificationStats> {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const stats = db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
           SUM(CASE WHEN action_taken IS NOT NULL THEN 1 ELSE 0 END) as actioned,
           SUM(CASE WHEN dismissed = 1 THEN 1 ELSE 0 END) as dismissed
         FROM proactive_notifications
         WHERE user_id = ? AND sent_at >= ?`
      )
      .get(userId, thisWeek.toISOString()) as {
      total: number;
      read_count: number;
      actioned: number;
      dismissed: number;
    };

    return {
      totalThisWeek: stats.total,
      readRate: stats.total > 0 ? stats.read_count / stats.total : 0,
      actionRate: stats.total > 0 ? stats.actioned / stats.total : 0,
      dismissRate: stats.total > 0 ? stats.dismissed / stats.total : 0,
    };
  }
}

export interface NotificationStats {
  totalThisWeek: number;
  readRate: number;
  actionRate: number;
  dismissRate: number;
}

// Export singleton instance
export const notificationManager = new NotificationManager();
