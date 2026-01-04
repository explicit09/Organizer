import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createItem, deleteItem, updateItem } from "./items";
import { listActivity, logActivity } from "./activity";

describe("activity log", () => {
  beforeEach(() => {
    resetDb();
  });

  it("logs manual activity entries", () => {
    const entry = logActivity({
      action: "manual_note",
      data: { note: "Captured quick thought" },
    });

    expect(entry.id).toBeTruthy();
    expect(listActivity()).toHaveLength(1);
  });

  it("logs item lifecycle events", () => {
    const item = createItem({ type: "task", title: "Write outline" });
    updateItem(item.id, { status: "in_progress" });
    deleteItem(item.id);

    const activity = listActivity({ itemId: item.id });
    const actions = activity.map((entry) => entry.action);

    expect(actions).toEqual(["item_created", "item_updated", "item_deleted"]);
  });
});
