import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateProjectForm } from "./CreateProjectForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("CreateProjectForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("submits a project", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ project: { id: "1" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateProjectForm />);

    await userEvent.type(screen.getByPlaceholderText("Project name"), "LEARN-X");
    await userEvent.click(screen.getByRole("button", { name: "Add project" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls[0][1] as RequestInit;
      expect(call.method).toBe("POST");
      expect(call.headers).toEqual({ "Content-Type": "application/json" });
      expect(call.body).toContain('"name":"LEARN-X"');
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
