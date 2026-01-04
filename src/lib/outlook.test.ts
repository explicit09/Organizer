import { describe, expect, it, beforeEach } from "vitest";
import { buildOutlookAuthUrl, buildOutlookEventPayload } from "./outlook";

describe("outlook helpers", () => {
  beforeEach(() => {
    process.env.OUTLOOK_CLIENT_ID = "test-client-id";
    process.env.OUTLOOK_REDIRECT_URI = "http://localhost/callback";
    process.env.OUTLOOK_TENANT_ID = "common";
  });

  it("builds an auth url", () => {
    const url = buildOutlookAuthUrl("state-token");

    expect(url).toContain("test-client-id");
    expect(url).toContain(encodeURIComponent("http://localhost/callback"));
    expect(url).toContain("state-token");
  });

  it("builds event payload", () => {
    const payload = buildOutlookEventPayload({
      subject: "Team sync",
      start: "2024-02-01T10:00:00.000Z",
      end: "2024-02-01T10:30:00.000Z",
      attendees: ["person@example.com"],
      timeZone: "UTC",
    });

    expect(payload.subject).toBe("Team sync");
    expect(payload.attendees).toHaveLength(1);
    expect(payload.start.dateTime).toBe("2024-02-01T10:00:00.000Z");
  });
});
