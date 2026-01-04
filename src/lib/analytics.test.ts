import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { logActivity } from "./activity";
import { getCompletionSeries } from "./analytics";
import { getDefaultUserId } from "./auth";

describe("completion series", () => {
  beforeEach(() => {
    resetDb();
  });

  it("builds a 7-day series with completion counts", () => {
    const now = new Date("2024-02-08T12:00:00.000Z");
    const twoDaysAgo = new Date("2024-02-06T09:00:00.000Z");
    const yesterday = new Date("2024-02-07T11:30:00.000Z");
    const userId = getDefaultUserId();

    logActivity({
      userId,
      action: "item_updated",
      data: { status: "completed" },
      createdAt: twoDaysAgo.toISOString(),
    });
    logActivity({
      userId,
      action: "item_updated",
      data: { status: "completed" },
      createdAt: yesterday.toISOString(),
    });
    logActivity({
      userId,
      action: "item_updated",
      data: { status: "completed" },
      createdAt: yesterday.toISOString(),
    });

    const series = getCompletionSeries(7, now, { userId });

    expect(series).toHaveLength(7);
    expect(series[4].count).toBe(1);
    expect(series[5].count).toBe(2);
  });
});
