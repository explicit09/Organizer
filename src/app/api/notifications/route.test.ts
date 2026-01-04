import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { createItem } from "../../../lib/items";
import { GET } from "./route";

describe("notifications api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("returns due notifications", async () => {
    createItem({
      type: "task",
      title: "Submit assignment",
      dueAt: "2024-02-01T10:00:00.000Z",
    });
    const res = await GET(new Request("http://localhost/api/notifications"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.notifications.length).toBeGreaterThan(0);
  });
});
