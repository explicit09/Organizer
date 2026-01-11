// Phase 3: Proactive Engine

import type {
  Trigger,
  TriggerType,
  TriggerState,
  SystemEvent,
  ProactiveMessage,
  UserTriggerPreferences,
  NotificationPreferences,
} from "./types";
import { assembleFullContext } from "../context/assembler";
import { getDb } from "../../db";
import { randomUUID } from "crypto";

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: ["in_app"],
  quietHours: { start: 22, end: 8 }, // 10pm to 8am
  urgentOverridesQuiet: true,
  maxPerDay: 10,
  groupSimilar: true,
};

class ProactiveEngine {
  private triggers: Map<TriggerType, Trigger> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Register a trigger
  registerTrigger(trigger: Trigger): void {
    this.triggers.set(trigger.type, trigger);
  }

  // Register multiple triggers
  registerTriggers(triggers: Trigger[]): void {
    for (const trigger of triggers) {
      this.registerTrigger(trigger);
    }
  }

  // Start the proactive engine
  start(pollIntervalMs: number = 5 * 60 * 1000): void {
    if (this.isRunning) {
      console.log("[Proactive Engine] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[Proactive Engine] Started");

    // Start polling for time-based triggers
    this.pollInterval = setInterval(() => {
      this.pollTriggers().catch((error) => {
        console.error("[Proactive Engine] Poll error:", error);
      });
    }, pollIntervalMs);

    // Do an initial poll
    this.pollTriggers().catch((error) => {
      console.error("[Proactive Engine] Initial poll error:", error);
    });
  }

  // Stop the engine
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log("[Proactive Engine] Stopped");
  }

  // Poll all triggers for all active users
  private async pollTriggers(): Promise<void> {
    const activeUsers = await this.getActiveUsers(24); // Users active in last 24h

    for (const userId of activeUsers) {
      try {
        await this.checkTriggersForUser(userId);
      } catch (error) {
        console.error(`[Proactive Engine] Error checking triggers for user ${userId}:`, error);
      }
    }
  }

  // Check all triggers for a specific user
  async checkTriggersForUser(userId: string, event?: SystemEvent): Promise<ProactiveMessage[]> {
    const context = assembleFullContext({ userId });
    const messages: ProactiveMessage[] = [];
    const userPrefs = await this.getUserPreferences(userId);
    const disabledTriggers = new Set(userPrefs.disabledTriggers);

    for (const [type, trigger] of this.triggers) {
      // Skip if user disabled this trigger
      if (disabledTriggers.has(type) && trigger.userCanDisable) {
        continue;
      }

      // Check cooldown
      const cooldownMinutes = userPrefs.customCooldowns[type] ?? trigger.cooldown;
      if (await this.isOnCooldown(userId, type, cooldownMinutes)) {
        continue;
      }

      try {
        // Evaluate trigger condition
        const shouldTrigger = await trigger.condition.evaluate(context, event);

        if (shouldTrigger) {
          const details = await trigger.condition.getDetails(context, event);
          const message = trigger.action.content(details);

          // Record the trigger
          await this.recordTrigger(userId, type);

          // Log the proactive message
          await this.logProactiveMessage(userId, type, message);

          // Execute auto-actions if any
          if (trigger.action.autoActions) {
            for (const autoAction of trigger.action.autoActions) {
              await this.executeAutoAction(autoAction.type, autoAction.params || {}, userId);
            }
          }

          messages.push(message);
        }
      } catch (error) {
        console.error(`[Proactive Engine] Error evaluating trigger ${type}:`, error);
      }
    }

    return messages;
  }

  // Handle a system event
  async onEvent(event: SystemEvent): Promise<ProactiveMessage[]> {
    return this.checkTriggersForUser(event.userId, event);
  }

  // Manual check for a user (called from API)
  async checkNow(userId: string): Promise<ProactiveMessage[]> {
    return this.checkTriggersForUser(userId);
  }

  // Get list of available trigger types
  getAvailableTriggers(): TriggerType[] {
    return Array.from(this.triggers.keys());
  }

  // Check if trigger is on cooldown
  private async isOnCooldown(
    userId: string,
    triggerType: TriggerType,
    cooldownMinutes: number
  ): Promise<boolean> {
    if (cooldownMinutes === 0) return false;

    const db = getDb();
    const state = db
      .prepare(
        `SELECT last_triggered FROM trigger_state
         WHERE user_id = ? AND trigger_type = ?`
      )
      .get(userId, triggerType) as { last_triggered: string } | undefined;

    if (!state) return false;

    const lastTriggered = new Date(state.last_triggered);
    const cooldownEnd = new Date(lastTriggered.getTime() + cooldownMinutes * 60 * 1000);

    return new Date() < cooldownEnd;
  }

  // Record that a trigger fired
  private async recordTrigger(userId: string, triggerType: TriggerType): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO trigger_state (id, user_id, trigger_type, last_triggered, trigger_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (user_id, trigger_type) DO UPDATE SET
         last_triggered = excluded.last_triggered,
         trigger_count = trigger_count + 1`
    ).run(randomUUID(), userId, triggerType, now);
  }

  // Log a proactive message
  private async logProactiveMessage(
    userId: string,
    triggerType: TriggerType,
    message: ProactiveMessage
  ): Promise<string> {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO proactive_notifications
       (id, user_id, trigger_type, message_json, channels_json, sent_at, read_at, action_taken, dismissed)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0)`
    ).run(id, userId, triggerType, JSON.stringify(message), JSON.stringify(["in_app"]), now);

    return id;
  }

  // Execute an auto-action
  private async executeAutoAction(
    actionType: string,
    params: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    // This will be implemented in the auto-actions module
    console.log(`[Proactive Engine] Auto-action: ${actionType}`, params);
  }

  // Get active users (users with activity in last N hours)
  private async getActiveUsers(hoursAgo: number): Promise<string[]> {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursAgo);

    const rows = db
      .prepare(
        `SELECT DISTINCT user_id FROM activity_log
         WHERE created_at >= ?
         UNION
         SELECT DISTINCT user_id FROM items
         WHERE updated_at >= ?`
      )
      .all(cutoff.toISOString(), cutoff.toISOString()) as Array<{ user_id: string }>;

    return rows.map((r) => r.user_id).filter(Boolean);
  }

  // Get user's trigger preferences
  private async getUserPreferences(userId: string): Promise<UserTriggerPreferences> {
    const db = getDb();

    const row = db
      .prepare(
        `SELECT disabled_triggers_json, custom_cooldowns_json, notification_prefs_json
         FROM user_trigger_preferences
         WHERE user_id = ?`
      )
      .get(userId) as {
      disabled_triggers_json: string | null;
      custom_cooldowns_json: string | null;
      notification_prefs_json: string | null;
    } | undefined;

    if (!row) {
      return {
        userId,
        disabledTriggers: [],
        customCooldowns: {} as Record<TriggerType, number>,
        preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      };
    }

    return {
      userId,
      disabledTriggers: row.disabled_triggers_json
        ? JSON.parse(row.disabled_triggers_json)
        : [],
      customCooldowns: row.custom_cooldowns_json
        ? JSON.parse(row.custom_cooldowns_json)
        : {},
      preferences: row.notification_prefs_json
        ? JSON.parse(row.notification_prefs_json)
        : DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  // Enable/disable a trigger for a user
  async setTriggerEnabled(
    userId: string,
    triggerType: TriggerType,
    enabled: boolean
  ): Promise<void> {
    const db = getDb();
    const prefs = await this.getUserPreferences(userId);

    if (enabled) {
      prefs.disabledTriggers = prefs.disabledTriggers.filter((t) => t !== triggerType);
    } else {
      if (!prefs.disabledTriggers.includes(triggerType)) {
        prefs.disabledTriggers.push(triggerType);
      }
    }

    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO user_trigger_preferences
       (user_id, disabled_triggers_json, custom_cooldowns_json, notification_prefs_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         disabled_triggers_json = excluded.disabled_triggers_json,
         updated_at = excluded.updated_at`
    ).run(
      userId,
      JSON.stringify(prefs.disabledTriggers),
      JSON.stringify(prefs.customCooldowns),
      JSON.stringify(prefs.preferences),
      now
    );
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const db = getDb();
    const prefs = await this.getUserPreferences(userId);
    const updatedPrefs = { ...prefs.preferences, ...preferences };
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO user_trigger_preferences
       (user_id, disabled_triggers_json, custom_cooldowns_json, notification_prefs_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         notification_prefs_json = excluded.notification_prefs_json,
         updated_at = excluded.updated_at`
    ).run(
      userId,
      JSON.stringify(prefs.disabledTriggers),
      JSON.stringify(prefs.customCooldowns),
      JSON.stringify(updatedPrefs),
      now
    );
  }

  // Get pending notifications for a user
  async getPendingNotifications(userId: string): Promise<ProactiveMessage[]> {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT message_json FROM proactive_notifications
         WHERE user_id = ? AND read_at IS NULL AND dismissed = 0
         ORDER BY sent_at DESC
         LIMIT 10`
      )
      .all(userId) as Array<{ message_json: string }>;

    return rows.map((r) => JSON.parse(r.message_json));
  }

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE proactive_notifications SET read_at = ? WHERE id = ?`
    ).run(now, notificationId);
  }

  // Mark notification as actioned
  async markNotificationActioned(notificationId: string, action: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE proactive_notifications SET action_taken = ?, read_at = COALESCE(read_at, ?) WHERE id = ?`
    ).run(action, now, notificationId);
  }

  // Dismiss notification
  async dismissNotification(notificationId: string): Promise<void> {
    const db = getDb();

    db.prepare(
      `UPDATE proactive_notifications SET dismissed = 1 WHERE id = ?`
    ).run(notificationId);
  }
}

// Singleton instance
export const proactiveEngine = new ProactiveEngine();

// Helper to create and register the engine with all triggers
export function initializeProactiveEngine(): ProactiveEngine {
  // Import triggers (will be done after triggers are created)
  // proactiveEngine.registerTriggers(allTriggers);
  return proactiveEngine;
}
