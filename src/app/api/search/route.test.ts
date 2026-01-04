import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { createItem } from "../../../lib/items";
import { GET } from "./route";

describe("search api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("returns matching items", async () => {
    createItem({ type: "task", title: "Write finance essay" });
    const req = new Request("http://localhost/api/search?q=finance");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});
