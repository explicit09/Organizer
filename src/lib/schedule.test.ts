import { describe, expect, it } from "vitest";
import { detectConflicts, suggestTaskBlocks } from "./schedule";
import type { Item } from "./items";

const baseItem: Omit<Item, "id" | "title" | "startAt" | "endAt"> = {
  userId: "user-1",
  type: "meeting",
  status: "not_started",
  priority: "medium",
  tags: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("schedule helpers", () => {
  it("detects conflicts", () => {
    const items: Item[] = [
      {
        ...baseItem,
        id: "1",
        title: "Meeting 1",
        startAt: "2024-02-01T10:00:00.000Z",
        endAt: "2024-02-01T11:00:00.000Z",
      },
      {
        ...baseItem,
        id: "2",
        title: "Meeting 2",
        startAt: "2024-02-01T10:30:00.000Z",
        endAt: "2024-02-01T11:15:00.000Z",
      },
    ];
    const conflicts = detectConflicts(items);

    expect(conflicts).toHaveLength(1);
  });

  it("suggests task blocks", () => {
    const tasks: Item[] = [
      {
        ...baseItem,
        id: "task-1",
        type: "task",
        title: "Write essay",
        estimatedMinutes: 60,
      },
    ];
    const suggestions = suggestTaskBlocks(tasks, []);

    expect(suggestions).toHaveLength(1);
  });
});
