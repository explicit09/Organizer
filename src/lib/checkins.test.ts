import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createCheckin, getCheckinStreak } from "./checkins";

describe("checkins", () => {
  beforeEach(() => {
    resetDb();
  });

  it("calculates streaks", () => {
    createCheckin({ date: "2024-02-03", mood: 4, focus: 4 });
    createCheckin({ date: "2024-02-02", mood: 3, focus: 3 });
    createCheckin({ date: "2024-02-01", mood: 5, focus: 5 });

    const streak = getCheckinStreak();
    expect(streak).toBeGreaterThan(0);
  });
});
