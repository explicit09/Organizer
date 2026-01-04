import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CreateCourseForm } from "./CreateCourseForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("CreateCourseForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("submits a course", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ course: { id: "1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateCourseForm />);

    await userEvent.type(screen.getByPlaceholderText("Course name"), "Finance 101");
    await userEvent.click(screen.getByRole("button", { name: "Add course" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls[0][1] as RequestInit;
      expect(call.method).toBe("POST");
      expect(call.headers).toEqual({ "Content-Type": "application/json" });
      expect(call.body).toContain('"name":"Finance 101"');
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
