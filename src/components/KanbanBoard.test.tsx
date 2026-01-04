import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { KanbanBoard } from "./KanbanBoard";
import type { Item } from "../lib/items";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const baseItem: Omit<Item, "id" | "title"> = {
  userId: "user-1",
  type: "task",
  status: "not_started",
  priority: "medium",
  tags: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("KanbanBoard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("renders status columns and items", () => {
    const items: Item[] = [
      { ...baseItem, id: "1", title: "Write outline" },
      { ...baseItem, id: "2", title: "Draft essay", status: "in_progress" },
    ];
    render(<KanbanBoard items={items} />);

    expect(screen.getByText("Not Started")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Write outline")).toBeInTheDocument();
    expect(screen.getByText("Draft essay")).toBeInTheDocument();
  });

  it("allows inline editing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          item: { ...baseItem, id: "1", title: "Write draft" },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const items: Item[] = [{ ...baseItem, id: "1", title: "Write outline" }];
    render(<KanbanBoard items={items} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByDisplayValue("Write outline");
    await userEvent.clear(input);
    await userEvent.type(input, "Write draft");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/items/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Write draft" }),
    });
    expect(await screen.findByText("Write draft")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("updates status on drag and drop", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          item: { ...baseItem, id: "1", title: "Write outline", status: "completed" },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const items: Item[] = [{ ...baseItem, id: "1", title: "Write outline" }];
    render(<KanbanBoard items={items} />);

    const card = screen
      .getByText("Write outline")
      .closest('[draggable="true"]') as HTMLElement;
    const completedColumn = screen.getByTestId("column-completed");

    const dataTransfer = {
      data: new Map<string, string>(),
      setData(key: string, value: string) {
        this.data.set(key, value);
      },
      getData(key: string) {
        return this.data.get(key) ?? "";
      },
    };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(completedColumn, { dataTransfer });
    fireEvent.drop(completedColumn, { dataTransfer });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/items/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    });
    await waitFor(() => {
      expect(within(completedColumn).getByText("Write outline")).toBeInTheDocument();
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
