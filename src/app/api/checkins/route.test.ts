import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { POST, GET } from "./route";

describe("checkins api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists checkins", async () => {
    const req = new Request("http://localhost/api/checkins", {
      method: "POST",
      body: JSON.stringify({ date: "2024-02-03", mood: 4, focus: 4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const listRes = await GET(new Request("http://localhost/api/checkins"));
    const body = await listRes.json();
    expect(body.checkins.length).toBeGreaterThan(0);
  });
});
