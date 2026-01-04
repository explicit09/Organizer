import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
import { createItem } from "./items";
import { listDueNotifications, upsertNotificationForItem } from "./notifications";

describe("notifications", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates notifications for items with due dates", () => {
    const item = createItem({
      type: "task",
      title: "Submit assignment",
      dueAt: "2024-02-01T10:00:00.000Z",
    });

    upsertNotificationForItem(item);

    const due = listDueNotifications({
      until: "2024-02-01T12:00:00.000Z",
    });

    expect(due).toHaveLength(1);
    expect(due[0].title).toBe("Submit assignment");
  });
});
