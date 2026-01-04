import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { createItem } from "../../../lib/items";
import { GET, POST } from "./route";

describe("items api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates an item via POST", async () => {
    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ type: "task", title: "Write spec" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.item.title).toBe("Write spec");
  });

  it("lists items via GET with type filter", async () => {
    createItem({ type: "task", title: "Task 1" });
    createItem({ type: "meeting", title: "Meet John" });

    const req = new Request("http://localhost/api/items?type=meeting");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Meet John");
  });

  it("rejects invalid filters", async () => {
    const req = new Request("http://localhost/api/items?type=bad");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});
