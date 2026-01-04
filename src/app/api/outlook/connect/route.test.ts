import { describe, expect, it, beforeEach } from "vitest";
import { GET } from "./route";

describe("outlook connect api", () => {
  beforeEach(() => {
    process.env.OUTLOOK_CLIENT_ID = "test-client-id";
    process.env.OUTLOOK_REDIRECT_URI = "http://localhost/callback";
    process.env.OUTLOOK_TENANT_ID = "common";
  });

  it("redirects to auth url", async () => {
    const res = await GET(new Request("http://localhost/api/outlook/connect"));
    const location = res.headers.get("location");

    expect(res.status).toBe(307);
    expect(location).toContain("test-client-id");
  });
});
