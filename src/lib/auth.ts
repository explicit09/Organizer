import { randomBytes, pbkdf2Sync, timingSafeEqual, randomUUID } from "node:crypto";
import { getDb } from "./db";

const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = "sha512";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString(
    "hex"
  );
  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");
  if (parts.length !== 4) {
    return false;
  }
  const [, iterStr, salt, hash] = parts;
  const iterations = Number(iterStr);
  if (!iterations || !salt || !hash) {
    return false;
  }
  const computed = pbkdf2Sync(password, salt, iterations, HASH_KEYLEN, HASH_DIGEST).toString(
    "hex"
  );
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

export function createUser(input: { email: string; password: string; name?: string }): User {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const email = normalizeEmail(input.email);

  const passwordHash = hashPassword(input.password);

  db.prepare(
    `
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (@id, @email, @password_hash, @name, @created_at, @updated_at)
    `
  ).run({
    id,
    email,
    password_hash: passwordHash,
    name: input.name ?? null,
    created_at: now,
    updated_at: now,
  });

  return { id, email, name: input.name, createdAt: now, updatedAt: now };
}

export function getUserByEmail(email: string) {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT id, email, name, created_at, updated_at, password_hash
        FROM users
        WHERE email = ?
      `
    )
    .get(normalizeEmail(email)) as
    | {
        id: string;
        email: string;
        name: string | null;
        created_at: string;
        updated_at: string;
        password_hash: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    passwordHash: row.password_hash,
  };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT id, email, name, created_at, updated_at
        FROM users
        WHERE id = ?
      `
    )
    .get(id) as
    | {
        id: string;
        email: string;
        name: string | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSession(userId: string) {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + SESSION_DAYS);

  db.prepare(
    `
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (@token, @user_id, @expires_at, @created_at)
    `
  ).run({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export function getSessionUserId(token: string) {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT user_id, expires_at
        FROM sessions
        WHERE token = ?
      `
    )
    .get(token) as { user_id: string; expires_at: string } | undefined;

  if (!row) {
    return null;
  }

  if (Date.now() > new Date(row.expires_at).getTime()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return row.user_id;
}

export function deleteSession(token: string) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function ensureDefaultUser() {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;

  if (row) {
    return row.id;
  }

  const user = createUser({
    email: "demo@organizer.local",
    password: "password",
    name: "Demo User",
  });

  db.prepare(
    `
      UPDATE items SET user_id = ? WHERE user_id IS NULL
    `
  ).run(user.id);
  db.prepare(`UPDATE notes SET user_id = ? WHERE user_id IS NULL`).run(user.id);
  db.prepare(`UPDATE goals SET user_id = ? WHERE user_id IS NULL`).run(user.id);
  db.prepare(`UPDATE checkins SET user_id = ? WHERE user_id IS NULL`).run(user.id);
  db.prepare(`UPDATE activity_log SET user_id = ? WHERE user_id IS NULL`).run(
    user.id
  );
  db.prepare(`UPDATE integrations SET user_id = ? WHERE user_id IS NULL`).run(
    user.id
  );

  return user.id;
}

export function getDefaultUserId() {
  return ensureDefaultUser();
}

export function parseSessionToken(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith("session=")) {
      return part.replace("session=", "");
    }
  }
  return null;
}

export function getRequestUserId(req: Request) {
  const devHeader = req.headers.get("x-user-id");
  if (process.env.NODE_ENV === "test" && devHeader) {
    return devHeader;
  }

  const token = parseSessionToken(req.headers.get("cookie"));
  if (!token) {
    if (process.env.NODE_ENV === "test") {
      return getDefaultUserId();
    }
    return null;
  }
  return getSessionUserId(token);
}

export function getServerUserId(cookieHeader: string | null) {
  const token = parseSessionToken(cookieHeader);
  if (!token) {
    return null;
  }
  return getSessionUserId(token);
}
