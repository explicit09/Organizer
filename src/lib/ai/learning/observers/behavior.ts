// Behavior Pattern Observer
// Tracks user interactions with suggestions, notifications, and the UI

import type { PatternObserver, UserEvent, LearningEventType } from "../types";
import { getDb } from "../../../db";
import { randomUUID } from "crypto";

export class BehaviorObserver implements PatternObserver {
  name = "BehaviorObserver";

  interestedIn(eventType: LearningEventType): boolean {
    return [
      "suggestion_accepted",
      "suggestion_dismissed",
      "notification_clicked",
      "notification_ignored",
      "item_rescheduled",
      "priority_changed",
      "user_message",
      "message_feedback",
    ].includes(eventType);
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;

    switch (type) {
      case "suggestion_accepted":
        await this.recordSuggestionOutcome(userId, {
          suggestionType: data.suggestionType as string,
          accepted: true,
          timeToAction: data.timeToAction as number | undefined,
          context: data.context as Record<string, unknown> | undefined,
          timestamp,
        });
        break;

      case "suggestion_dismissed":
        await this.recordSuggestionOutcome(userId, {
          suggestionType: data.suggestionType as string,
          accepted: false,
          reason: data.reason as string | undefined,
          context: data.context as Record<string, unknown> | undefined,
          timestamp,
        });
        break;

      case "notification_clicked":
        await this.recordNotificationInteraction(userId, {
          notificationType: data.notificationType as string,
          clicked: true,
          channel: data.channel as string | undefined,
          timestamp,
        });
        break;

      case "notification_ignored":
        await this.recordNotificationInteraction(userId, {
          notificationType: data.notificationType as string,
          clicked: false,
          channel: data.channel as string | undefined,
          timestamp,
        });
        break;

      case "item_rescheduled":
        await this.recordReschedulePattern(userId, {
          itemId: data.itemId as string,
          originalDue: data.originalDue as string,
          newDue: data.newDue as string,
          daysShifted: data.daysShifted as number,
          reason: data.reason as string | undefined,
          wasOverdue: data.wasOverdue as boolean,
          timestamp,
        });
        break;

      case "priority_changed":
        await this.recordPriorityChange(userId, {
          itemId: data.itemId as string,
          oldPriority: data.oldPriority as string,
          newPriority: data.newPriority as string,
          timestamp,
        });
        break;

      case "user_message":
        await this.recordMessageStyle(userId, {
          content: data.content as string,
          wordCount: (data.content as string)?.split(/\s+/).length || 0,
          timestamp,
        });
        break;

      case "message_feedback":
        await this.recordMessageFeedback(userId, {
          messageId: data.messageId as string,
          feedback: data.feedback as string,
          rating: data.rating as number | undefined,
          timestamp,
        });
        break;
    }
  }

  private async recordSuggestionOutcome(
    userId: string,
    data: {
      suggestionType: string;
      accepted: boolean;
      timeToAction?: number;
      reason?: string;
      context?: Record<string, unknown>;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();
    const hour = data.timestamp.getHours();

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, suggestion_type, outcome, reason, hour, context_json, created_at)
       VALUES (?, ?, 'suggestion', ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.suggestionType,
      data.accepted ? "accepted" : "dismissed",
      data.reason || null,
      hour,
      data.context ? JSON.stringify(data.context) : null,
      now
    );
  }

  private async recordNotificationInteraction(
    userId: string,
    data: {
      notificationType: string;
      clicked: boolean;
      channel?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();
    const hour = data.timestamp.getHours();

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, notification_type, outcome, channel, hour, created_at)
       VALUES (?, ?, 'notification', ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.notificationType,
      data.clicked ? "clicked" : "ignored",
      data.channel || null,
      hour,
      now
    );
  }

  private async recordReschedulePattern(
    userId: string,
    data: {
      itemId: string;
      originalDue: string;
      newDue: string;
      daysShifted: number;
      reason?: string;
      wasOverdue: boolean;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, item_id, original_value, new_value, shift_amount, reason, was_overdue, created_at)
       VALUES (?, ?, 'reschedule', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.itemId,
      data.originalDue,
      data.newDue,
      data.daysShifted,
      data.reason || null,
      data.wasOverdue ? 1 : 0,
      now
    );
  }

  private async recordPriorityChange(
    userId: string,
    data: {
      itemId: string;
      oldPriority: string;
      newPriority: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, item_id, original_value, new_value, created_at)
       VALUES (?, ?, 'priority_change', ?, ?, ?, ?)`
    ).run(id, userId, data.itemId, data.oldPriority, data.newPriority, now);
  }

  private async recordMessageStyle(
    userId: string,
    data: {
      content: string;
      wordCount: number;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    // Analyze message characteristics
    const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(data.content);
    const isBrief = data.wordCount < 10;
    const isDetailed = data.wordCount > 50;
    const isTechnical = /\b(api|code|function|debug|error)\b/i.test(data.content);

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, word_count, has_emoji, is_brief, is_detailed, is_technical, created_at)
       VALUES (?, ?, 'message_style', ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.wordCount,
      hasEmoji ? 1 : 0,
      isBrief ? 1 : 0,
      isDetailed ? 1 : 0,
      isTechnical ? 1 : 0,
      now
    );
  }

  private async recordMessageFeedback(
    userId: string,
    data: {
      messageId: string;
      feedback: string;
      rating?: number;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO behavior_records
       (id, user_id, record_type, message_id, feedback, rating, created_at)
       VALUES (?, ?, 'message_feedback', ?, ?, ?, ?)`
    ).run(id, userId, data.messageId, data.feedback, data.rating || null, now);
  }
}

export const behaviorObserver = new BehaviorObserver();
