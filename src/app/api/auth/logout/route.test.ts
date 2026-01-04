import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("auth logout api", () => {
  it("clears session cookie", async () => {
    const req = new Request("http://localhost/api/auth/logout", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});
