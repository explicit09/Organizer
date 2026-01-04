import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { POST, GET } from "./route";

describe("attachments api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates and lists attachments", async () => {
    const createReq = new Request("http://localhost/api/attachments", {
      method: "POST",
      body: JSON.stringify({
        name: "Syllabus.pdf",
        url: "https://example.com/syllabus.pdf",
      }),
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);

    const res = await GET(new Request("http://localhost/api/attachments"));
    const body = await res.json();
    expect(body.attachments).toHaveLength(1);
  });
});
