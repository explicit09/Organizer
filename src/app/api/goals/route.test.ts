import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { POST, GET } from "./route";

describe("goals api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists goals", async () => {
    const req = new Request("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ title: "Finish assignments", target: 5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const listRes = await GET(new Request("http://localhost/api/goals"));
    const body = await listRes.json();
    expect(body.goals).toHaveLength(1);
  });
});
