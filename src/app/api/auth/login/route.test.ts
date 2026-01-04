import { describe, expect, it, beforeEach } from "vitest";
import { resetDb } from "../../../../lib/db";
import { createUser } from "../../../../lib/auth";
import { POST } from "./route";

describe("auth login api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("logs in a user", async () => {
    createUser({
      email: "user@example.com",
      password: "secret",
      name: "Test User",
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "secret" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe("user@example.com");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});
