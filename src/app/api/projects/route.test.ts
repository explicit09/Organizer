import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { GET, POST } from "./route";

describe("projects api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists projects", async () => {
    const req = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "LEARN-X", area: "Product" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const listRes = await GET(new Request("http://localhost/api/projects"));
    const body = await listRes.json();
    expect(body.projects).toHaveLength(1);
  });
});
