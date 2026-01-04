import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { logActivity } from "./activity";
import { getDefaultUserId } from "./auth";
import { getWeeklyReport } from "./reports";

describe("weekly report", () => {
  beforeEach(() => {
    resetDb();
  });

  it("counts activity in last 7 days", () => {
    const userId = getDefaultUserId();
    const now = new Date("2024-02-08T12:00:00.000Z");

    logActivity({
      userId,
      action: "item_created",
      createdAt: "2024-02-06T10:00:00.000Z",
    });
    logActivity({
      userId,
      action: "item_updated",
      data: { status: "completed" },
      createdAt: "2024-02-07T10:00:00.000Z",
    });

    const report = getWeeklyReport({ userId, now });
    expect(report.completedCount).toBe(1);
    expect(report.createdCount).toBe(1);
  });
});
