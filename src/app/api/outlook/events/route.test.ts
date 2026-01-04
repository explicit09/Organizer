import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../../../lib/db";
import { saveOutlookTokens } from "../../../../lib/outlook";
import { POST } from "./route";

describe("outlook events api", () => {
  beforeEach(() => {
    resetDb();
    process.env.OUTLOOK_CLIENT_ID = "test-client-id";
    process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
    process.env.OUTLOOK_REDIRECT_URI = "http://localhost/callback";
    process.env.OUTLOOK_TENANT_ID = "common";
  });

  it("returns 400 when not connected", async () => {
    const req = new Request("http://localhost/api/outlook/events", {
      method: "POST",
      body: JSON.stringify({
        subject: "Team sync",
        start: "2024-02-01T10:00:00.000Z",
        end: "2024-02-01T10:30:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates an outlook event", async () => {
    saveOutlookTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "event-1",
          subject: "Team sync",
        }),
        { status: 201 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("http://localhost/api/outlook/events", {
      method: "POST",
      body: JSON.stringify({
        subject: "Team sync",
        start: "2024-02-01T10:00:00.000Z",
        end: "2024-02-01T10:30:00.000Z",
        attendees: ["person@example.com"],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.event.id).toBe("event-1");
    expect(fetchMock).toHaveBeenCalled();
  });
});
