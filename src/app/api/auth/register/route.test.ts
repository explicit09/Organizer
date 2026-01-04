import { describe, expect, it, beforeEach } from "vitest";
import { resetDb } from "../../../../lib/db";
import { POST } from "./route";

describe("auth register api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("registers a user", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "secret",
        name: "Test User",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.email).toBe("user@example.com");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});
