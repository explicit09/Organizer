import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemTable } from "./ItemTable";
import type { Item } from "../lib/items";

describe("ItemTable", () => {
  it("renders items and empty state", () => {
    const items: Item[] = [
      {
        id: "1",
        userId: "user-1",
        type: "task",
        title: "Write essay",
        status: "not_started",
        priority: "high",
        tags: ["school"],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    render(<ItemTable title="Tasks" items={items} emptyLabel="No tasks yet" />);

    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Write essay")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<ItemTable title="Tasks" items={[]} emptyLabel="No tasks yet" />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });
});
