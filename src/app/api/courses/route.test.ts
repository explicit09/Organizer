import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { GET, POST } from "./route";

describe("courses api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists courses", async () => {
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: JSON.stringify({ name: "Finance 101", term: "Spring" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const listRes = await GET(new Request("http://localhost/api/courses"));
    const body = await listRes.json();
    expect(body.courses).toHaveLength(1);
  });
});
