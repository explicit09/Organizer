import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CreateItemForm } from "./CreateItemForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("CreateItemForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("previews routed items", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ type: "task", title: "Write essay" }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateItemForm />);

    await userEvent.type(
      screen.getByPlaceholderText("Example: Prep for finance exam next week"),
      "Write essay"
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/organize/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Write essay" }),
    });

    expect(await screen.findByText("Write essay")).toBeInTheDocument();
  });

  it("creates items after confirmation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ type: "task", title: "Write essay" }],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "1",
                type: "task",
                title: "Write essay",
                status: "not_started",
                priority: "medium",
                tags: [],
                createdAt: "2024-01-01T00:00:00.000Z",
                updatedAt: "2024-01-01T00:00:00.000Z",
              },
            ],
          }),
          { status: 201 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateItemForm />);

    await userEvent.type(
      screen.getByPlaceholderText("Example: Prep for finance exam next week"),
      "Write essay"
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Confirm & Create" })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Write essay" }),
      });
    });

    const createdSection = await screen.findByText("Created items");
    const container = createdSection.parentElement as HTMLElement;

    expect(createdSection).toBeInTheDocument();
    expect(within(container).getByText("Write essay")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });
});
