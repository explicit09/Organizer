import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

type GoogleConfig = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
};

function getGoogleConfig(requireSecret = false): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/google/callback";

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required");
  }

  if (requireSecret && !clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is required");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ")
  );
  url.searchParams.set("state", state);

  return url.toString();
}

function computeExpiresAt(expiresInSeconds?: number) {
  if (!expiresInSeconds) {
    return undefined;
  }
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export function saveGoogleTokens(tokens: GoogleTokens, userId = getDefaultUserId()) {
  const db = getDb();
  const now = new Date().toISOString();
  const providerKey = `google:${userId}`;

  db.prepare(
    `
      INSERT INTO integrations (
        provider,
        user_id,
        access_token,
        refresh_token,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        @provider,
        @user_id,
        @access_token,
        @refresh_token,
        @expires_at,
        @created_at,
        @updated_at
      )
      ON CONFLICT(provider)
      DO UPDATE SET
        user_id = excluded.user_id,
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, integrations.refresh_token),
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `
  ).run({
    provider: providerKey,
    user_id: userId,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? null,
    expires_at: tokens.expiresAt ?? null,
    created_at: now,
    updated_at: now,
  });
}

export function getGoogleTokens(userId = getDefaultUserId()): GoogleTokens | null {
  const db = getDb();
  const providerKey = `google:${userId}`;
  const row = db
    .prepare(
      `
        SELECT access_token, refresh_token, expires_at
        FROM integrations
        WHERE provider = ? AND user_id = ?
      `
    )
    .get(providerKey, userId) as {
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
  } | null;

  if (!row) {
    return null;
  }

  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  };
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) {
    return false;
  }
  return Date.now() >= new Date(expiresAt).getTime() - 60_000;
}

export async function exchangeGoogleCodeForTokens(code: string, userId?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig(true);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error_description ?? "Google token exchange failed");
  }

  const tokens: GoogleTokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: computeExpiresAt(body.expires_in),
  };

  saveGoogleTokens(tokens, userId);
  return tokens;
}

export async function refreshGoogleTokens(refreshToken: string, userId?: string) {
  const { clientId, clientSecret } = getGoogleConfig(true);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error_description ?? "Google refresh failed");
  }

  const tokens: GoogleTokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: computeExpiresAt(body.expires_in),
  };

  saveGoogleTokens(tokens, userId);
  return tokens;
}

export async function getValidGoogleAccessToken(userId = getDefaultUserId()) {
  const tokens = getGoogleTokens(userId);

  if (!tokens) {
    return null;
  }

  if (isExpired(tokens.expiresAt) && tokens.refreshToken) {
    const refreshed = await refreshGoogleTokens(tokens.refreshToken, userId);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}

// ========== Calendar API Operations ==========

export type GoogleCalendarEvent = {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
};

export async function listGoogleCalendarEvents(
  userId = getDefaultUserId(),
  options?: { timeMin?: string; timeMax?: string; maxResults?: number }
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getValidGoogleAccessToken(userId);

  if (!accessToken) {
    throw new Error("Not connected to Google Calendar");
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );

  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  if (options?.timeMin) {
    url.searchParams.set("timeMin", options.timeMin);
  }
  if (options?.timeMax) {
    url.searchParams.set("timeMax", options.timeMax);
  }
  if (options?.maxResults) {
    url.searchParams.set("maxResults", String(options.maxResults));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Failed to list events");
  }

  return body.items ?? [];
}

export async function createGoogleCalendarEvent(
  event: GoogleCalendarEvent,
  userId = getDefaultUserId()
): Promise<GoogleCalendarEvent> {
  const accessToken = await getValidGoogleAccessToken(userId);

  if (!accessToken) {
    throw new Error("Not connected to Google Calendar");
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Failed to create event");
  }

  return body;
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  userId = getDefaultUserId()
): Promise<GoogleCalendarEvent> {
  const accessToken = await getValidGoogleAccessToken(userId);

  if (!accessToken) {
    throw new Error("Not connected to Google Calendar");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Failed to update event");
  }

  return body;
}

export async function deleteGoogleCalendarEvent(
  eventId: string,
  userId = getDefaultUserId()
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId);

  if (!accessToken) {
    throw new Error("Not connected to Google Calendar");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const body = await response.json();
    throw new Error(body.error?.message ?? "Failed to delete event");
  }
}

// ========== Sync Helpers ==========

export function convertItemToGoogleEvent(item: {
  title: string;
  details?: string;
  startAt?: string;
  endAt?: string;
  bufferBefore?: number;
  bufferAfter?: number;
}): GoogleCalendarEvent | null {
  if (!item.startAt || !item.endAt) {
    return null;
  }

  let startTime = new Date(item.startAt);
  let endTime = new Date(item.endAt);

  // Apply buffer times
  if (item.bufferBefore) {
    startTime = new Date(startTime.getTime() - item.bufferBefore * 60 * 1000);
  }
  if (item.bufferAfter) {
    endTime = new Date(endTime.getTime() + item.bufferAfter * 60 * 1000);
  }

  return {
    summary: item.title,
    description: item.details,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
}

export async function syncItemToGoogleCalendar(
  item: {
    title: string;
    details?: string;
    startAt?: string;
    endAt?: string;
    bufferBefore?: number;
    bufferAfter?: number;
  },
  userId = getDefaultUserId()
): Promise<GoogleCalendarEvent | null> {
  const event = convertItemToGoogleEvent(item);

  if (!event) {
    return null;
  }

  return createGoogleCalendarEvent(event, userId);
}
