import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CreateNoteForm } from "./CreateNoteForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("CreateNoteForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("submits note creation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ note: { id: "1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateNoteForm />);

    await userEvent.type(screen.getByPlaceholderText("Note title"), "Daily note");
    await userEvent.type(
      screen.getByPlaceholderText("Capture thoughts, plans, summaries..."),
      "Focus on study blocks"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Daily note", content: "Focus on study blocks" }),
      });
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
