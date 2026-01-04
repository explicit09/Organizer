import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { GoalForm } from "./GoalForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("GoalForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("submits a goal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ goal: { id: "1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<GoalForm />);

    await userEvent.type(screen.getByPlaceholderText("Goal title"), "Finish tasks");
    await userEvent.click(screen.getByRole("button", { name: "Add goal" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls[0][1] as RequestInit;
      expect(call.method).toBe("POST");
      expect(call.headers).toEqual({ "Content-Type": "application/json" });
      expect(call.body).toContain('"title":"Finish tasks"');
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
