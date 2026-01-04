import { describe, expect, it } from "vitest";
import { generateAiPlan } from "./aiProvider";

describe("generateAiPlan", () => {
  it("falls back when no api key", async () => {
    const plan = await generateAiPlan("Study for finance exam");
    expect(plan.items[0].type).toBe("school");
    expect(plan.items[0].subtasks?.length).toBeGreaterThan(0);
  });
});
