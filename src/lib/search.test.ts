import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createItem, searchItems } from "./items";

describe("searchItems", () => {
  beforeEach(() => {
    resetDb();
  });

  it("finds items by title", () => {
    createItem({ type: "task", title: "Write finance essay" });
    createItem({ type: "task", title: "Plan meeting" });

    const results = searchItems("finance");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Write finance essay");
  });
});
