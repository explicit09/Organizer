import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { MeetingList } from "./MeetingList";
import type { Item } from "../lib/items";

const baseItem: Omit<Item, "id" | "title" | "startAt" | "endAt"> = {
  userId: "user-1",
  type: "meeting",
  status: "not_started",
  priority: "medium",
  tags: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("MeetingList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules a meeting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ event: { id: "event-1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const items: Item[] = [
      {
        ...baseItem,
        id: "1",
        title: "Team sync",
        startAt: "2024-02-01T10:00:00.000Z",
        endAt: "2024-02-01T10:30:00.000Z",
      },
    ];
    render(<MeetingList items={items} />);

    await userEvent.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/outlook/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Team sync",
          start: "2024-02-01T10:00:00.000Z",
          end: "2024-02-01T10:30:00.000Z",
        }),
      });
    });
  });
});
