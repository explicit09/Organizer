import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from "./items";

describe("items", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates an item with defaults", () => {
    const item = createItem({ type: "task", title: "Finish essay" });

    expect(item.id).toBeTruthy();
    expect(item.status).toBe("not_started");
    expect(item.priority).toBe("medium");
    expect(item.tags).toEqual([]);
  });

  it("lists items by type", () => {
    createItem({ type: "task", title: "Task 1" });
    createItem({ type: "meeting", title: "Meet John" });
    createItem({ type: "task", title: "Task 2" });

    const tasks = listItems({ type: "task" });
    const meetings = listItems({ type: "meeting" });

    expect(tasks).toHaveLength(2);
    expect(meetings).toHaveLength(1);
    expect(meetings[0].title).toBe("Meet John");
  });

  it("updates an item", () => {
    const item = createItem({ type: "school", title: "Math homework" });

    const updated = updateItem(item.id, {
      status: "in_progress",
      priority: "high",
      tags: ["school"],
    });

    expect(updated.status).toBe("in_progress");
    expect(updated.priority).toBe("high");
    expect(updated.tags).toEqual(["school"]);
  });

  it("deletes an item", () => {
    const item = createItem({ type: "task", title: "Delete me" });

    expect(deleteItem(item.id)).toBe(true);
    expect(() => getItem(item.id)).toThrow("Item not found");
  });
});
