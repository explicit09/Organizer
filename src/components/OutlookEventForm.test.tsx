import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { OutlookEventForm } from "./OutlookEventForm";

describe("OutlookEventForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits an outlook event", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ event: { id: "event-1" } }), {
        status: 201,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<OutlookEventForm />);

    await userEvent.type(
      screen.getByLabelText("Subject"),
      "Team sync"
    );
    await userEvent.type(
      screen.getByLabelText("Start time"),
      "2024-02-01T10:00"
    );
    await userEvent.type(
      screen.getByLabelText("End time"),
      "2024-02-01T10:30"
    );
    await userEvent.type(
      screen.getByLabelText("Attendees"),
      "person@example.com"
    );

    await userEvent.click(screen.getByRole("button", { name: "Schedule in Outlook" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/outlook/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Team sync",
          start: "2024-02-01T10:00:00.000Z",
          end: "2024-02-01T10:30:00.000Z",
          attendees: ["person@example.com"],
          timeZone: "UTC",
        }),
      });
    });
  });
});
