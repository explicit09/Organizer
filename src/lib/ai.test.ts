import { describe, expect, it } from "vitest";
import { routeInput } from "./ai";

describe("routeInput", () => {
  it("routes meetings", () => {
    const items = routeInput("Meet John next Tuesday afternoon");

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("meeting");
  });

  it("routes school work", () => {
    const items = routeInput(
      "I have assignments: math homework, essay, coding project"
    );

    expect(items).toHaveLength(3);
    expect(items[0].type).toBe("school");
  });

  it("routes tasks by default", () => {
    const items = routeInput("Finish the landing page draft");

    expect(items[0].type).toBe("task");
  });
});
