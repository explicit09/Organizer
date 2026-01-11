// Estimation Pattern Observer
// Tracks how accurate user estimates are

import type { PatternObserver, UserEvent, LearningEventType } from "../types";
import { getDb } from "../../../db";
import { randomUUID } from "crypto";

export class EstimationObserver implements PatternObserver {
  name = "EstimationObserver";

  interestedIn(eventType: LearningEventType): boolean {
    return eventType === "item_completed";
  }

  async observe(event: UserEvent): Promise<void> {
    const { userId, data, timestamp } = event;
    const item = data.item as {
      id: string;
      type: string;
      priority: string;
      estimatedMinutes?: number;
    } | undefined;
    const actualDuration = data.actualDuration as number | undefined;

    if (!item?.estimatedMinutes || !actualDuration) {
      return; // Can't track accuracy without both values
    }

    // Calculate accuracy ratio (estimated / actual)
    // > 1 means overestimate, < 1 means underestimate
    const accuracy = item.estimatedMinutes / actualDuration;

    // Determine size category
    const size = this.categorizeSize(item.estimatedMinutes);

    await this.recordEstimationAccuracy(userId, {
      itemId: item.id,
      itemType: item.type,
      priority: item.priority,
      estimated: item.estimatedMinutes,
      actual: actualDuration,
      accuracy,
      size,
      overUnder: accuracy > 1.1 ? "over" : accuracy < 0.9 ? "under" : "accurate",
      timestamp,
    });
  }

  private categorizeSize(minutes: number): "small" | "medium" | "large" {
    if (minutes < 30) return "small";
    if (minutes <= 120) return "medium";
    return "large";
  }

  private async recordEstimationAccuracy(
    userId: string,
    data: {
      itemId: string;
      itemType: string;
      priority: string;
      estimated: number;
      actual: number;
      accuracy: number;
      size: string;
      overUnder: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const db = getDb();
    const id = randomUUID();
    const now = data.timestamp.toISOString();

    db.prepare(
      `INSERT INTO estimation_records
       (id, user_id, item_id, item_type, priority, estimated_minutes, actual_minutes, accuracy, size, bias, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      data.itemId,
      data.itemType,
      data.priority,
      data.estimated,
      data.actual,
      data.accuracy,
      data.size,
      data.overUnder,
      now
    );
  }
}

export const estimationObserver = new EstimationObserver();
