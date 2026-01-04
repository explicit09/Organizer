import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../lib/db";
import { POST, GET } from "./route";

describe("notes api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates a note", async () => {
    const req = new Request("http://localhost/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Reflection", content: "Focus" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.note.title).toBe("Reflection");
  });

  it("lists notes", async () => {
    const createReq = new Request("http://localhost/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Reflection", content: "Focus" }),
    });
    await POST(createReq);

    const res = await GET(new Request("http://localhost/api/notes"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notes).toHaveLength(1);
  });
});
