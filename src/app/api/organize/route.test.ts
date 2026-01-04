import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { listItems } from "../../../lib/items";
import { POST } from "./route";

describe("organize api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("routes and creates items", async () => {
    const req = new Request("http://localhost/api/organize", {
      method: "POST",
      body: JSON.stringify({ text: "Meet John next Tuesday" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.items).toHaveLength(1);
    expect(listItems({ type: "meeting" })).toHaveLength(1);
  });

  it("splits multiple items", async () => {
    const req = new Request("http://localhost/api/organize", {
      method: "POST",
      body: JSON.stringify({
        text: "Assignments: math homework, essay, coding project",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.items.length).toBeGreaterThanOrEqual(3);
  });
});
