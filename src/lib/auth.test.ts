import { describe, expect, it, beforeEach } from "vitest";
import { resetDb } from "./db";
import {
  createUser,
  createSession,
  getSessionUserId,
  hashPassword,
  verifyPassword,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    resetDb();
  });

  it("hashes and verifies passwords", () => {
    const hash = hashPassword("password123");
    expect(verifyPassword("password123", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("creates users and sessions", () => {
    const user = createUser({
      email: "user@example.com",
      password: "secret",
      name: "Test User",
    });
    const session = createSession(user.id);

    const userId = getSessionUserId(session.token);
    expect(userId).toBe(user.id);
  });
});
