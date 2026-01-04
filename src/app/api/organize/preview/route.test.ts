import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../lib/db";
import { listItems } from "../../../../lib/items";
import { POST } from "./route";

describe("organize preview api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("returns routed items without creating records", async () => {
    const req = new Request("http://localhost/api/organize/preview", {
      method: "POST",
      body: JSON.stringify({ text: "Meet John next Tuesday" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(listItems()).toHaveLength(0);
  });

  it("rejects empty text", async () => {
    const req = new Request("http://localhost/api/organize/preview", {
      method: "POST",
      body: JSON.stringify({ text: "" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
