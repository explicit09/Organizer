// Productivity Pattern Observer
// Tracks when and how users complete work

import type { PatternObserver, UserEvent, LearningEventType } from "../types";
import { getDb } from "../../../db";
import { randomUUID } from "crypto";

export class ProductivityObserver implements PatternObserver {
  name = "ProductivityObserver";

  interestedIn(eventType: LearningEventType): boolean {
    return [
      "item_completed",
      "focus_session_ended",
      "item_started",
      "focus_session_started",
    ].includes(eventType);
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, type, data, timestamp } = event;
    const hour = timestamp.getHours();
    const dayOfWeek = this.getDayOfWeek(timestamp);

    // Cast item to proper shape
    const item = data.item as { type?: string; id?: string; estimatedMinutes?: number } | undefined;

    switch (type) {
      case "item_completed":
        await this.recordCompletion(userId, {
          hour,
          dayOfWeek,
          itemType: item?.type || "unknown",
          itemId: item?.id || "",
          duration: data.actualDuration as number | undefined,
          estimatedDuration: item?.estimatedMinutes,
          timestamp,
        });
        break;

      case "focus_session_ended":
        await this.recordFocusSession(userId, {
          hour,
          dayOfWeek,
          duration: data.duration as number,
          completedItems: data.completedItems as number,
          wasInterrupted: data.wasInterrupted as boolean,
          timestamp,
        });
        break;

      case "item_started":
        await this.recordWorkStart(userId, {
          hour,
          dayOfWeek,
          itemType: item?.type || "unknown",
          timestamp,
        });
        break;
    }
  }

  private getDayOfWeek(date: Date): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  }

  private async recordCompletion(
    userId: string,
    data: {
      hour: number;
      dayOfWeek: string;
      itemType: string;
      itemId: string;
      duration?: number;
      estimatedDuration?: number;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    // Record to productivity_records table
    db.prepare(
      `INSERT INTO productivity_records
       (id, user_id, record_type, hour, day_of_week, item_type, duration, estimated_duration, created_at)
       VALUES (?, ?, 'completion', ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.hour,
      data.dayOfWeek,
      data.itemType || "task",
      data.duration || null,
      data.estimatedDuration || null,
      now
    );
  }

  private async recordFocusSession(
    userId: string,
    data: {
      hour: number;
      dayOfWeek: string;
      duration: number;
      completedItems: number;
      wasInterrupted: boolean;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO productivity_records
       (id, user_id, record_type, hour, day_of_week, duration, completed_count, was_interrupted, created_at)
       VALUES (?, ?, 'focus_session', ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.hour,
      data.dayOfWeek,
      data.duration,
      data.completedItems,
      data.wasInterrupted ? 1 : 0,
      now
    );
  }

  private async recordWorkStart(
    userId: string,
    data: {
      hour: number;
      dayOfWeek: string;
      itemType: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO productivity_records
       (id, user_id, record_type, hour, day_of_week, item_type, created_at)
       VALUES (?, ?, 'work_start', ?, ?, ?, ?)`
    ).run(id, userId, data.hour, data.dayOfWeek, data.itemType || "task", now);
  }
}

export const productivityObserver = new ProductivityObserver();
