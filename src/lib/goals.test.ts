import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createGoal, listGoals, updateGoal } from "./goals";

describe("goals", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and updates goals", () => {
    const goal = createGoal({ title: "Complete assignments", target: 10, unit: "tasks" });
    const updated = updateGoal(goal.id, { current: 3 });

    expect(updated.current).toBe(3);
    expect(listGoals()).toHaveLength(1);
  });
});
