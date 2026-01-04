import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CheckinForm } from "./CheckinForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("CheckinForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("submits a check-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ checkin: { id: "1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckinForm />);

    await userEvent.type(
      screen.getByPlaceholderText("What went well? What needs attention?"),
      "Solid focus"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"notes":"Solid focus"'),
      });
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
