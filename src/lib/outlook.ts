import { getDb } from "./db";
import { getDefaultUserId } from "./auth";

export type OutlookTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

type OutlookConfig = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  tenant: string;
};

function getOutlookConfig(requireSecret = false): OutlookConfig {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri =
    process.env.OUTLOOK_REDIRECT_URI ??
    "http://localhost:3000/api/outlook/callback";
  const tenant = process.env.OUTLOOK_TENANT_ID ?? "common";

  if (!clientId) {
    throw new Error("OUTLOOK_CLIENT_ID is required");
  }

  if (requireSecret && !clientSecret) {
    throw new Error("OUTLOOK_CLIENT_SECRET is required");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    tenant,
  };
}

export function buildOutlookAuthUrl(state: string) {
  const { clientId, redirectUri, tenant } = getOutlookConfig();
  const url = new URL(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set(
    "scope",
    "offline_access https://graph.microsoft.com/Calendars.ReadWrite"
  );
  url.searchParams.set("state", state);
  return url.toString();
}

export function buildOutlookEventPayload(input: {
  subject: string;
  start: string;
  end: string;
  attendees?: string[];
  timeZone?: string;
}) {
  return {
    subject: input.subject,
    start: {
      dateTime: input.start,
      timeZone: input.timeZone ?? "UTC",
    },
    end: {
      dateTime: input.end,
      timeZone: input.timeZone ?? "UTC",
    },
    attendees: (input.attendees ?? []).map((email) => ({
      emailAddress: { address: email, name: email },
      type: "required",
    })),
  };
}

function tokenEndpoint(tenant: string) {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

function computeExpiresAt(expiresInSeconds?: number) {
  if (!expiresInSeconds) {
    return undefined;
  }
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export function saveOutlookTokens(tokens: OutlookTokens, userId = getDefaultUserId()) {
  const db = getDb();
  const now = new Date().toISOString();
  const providerKey = `outlook:${userId}`;

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
        refresh_token = excluded.refresh_token,
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

export function getOutlookTokens(userId = getDefaultUserId()): OutlookTokens | null {
  const db = getDb();
  const providerKey = `outlook:${userId}`;
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

export async function exchangeCodeForTokens(code: string, userId?: string) {
  const { clientId, clientSecret, redirectUri, tenant } =
    getOutlookConfig(true);
  const response = await fetch(tokenEndpoint(tenant), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: "offline_access https://graph.microsoft.com/Calendars.ReadWrite",
    }).toString(),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error_description ?? "Outlook token exchange failed");
  }

  const tokens: OutlookTokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: computeExpiresAt(body.expires_in),
  };

  saveOutlookTokens(tokens, userId);
  return tokens;
}

export async function refreshOutlookTokens(refreshToken: string, userId?: string) {
  const { clientId, clientSecret, tenant } = getOutlookConfig(true);
  const response = await fetch(tokenEndpoint(tenant), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "offline_access https://graph.microsoft.com/Calendars.ReadWrite",
    }).toString(),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error_description ?? "Outlook refresh failed");
  }

  const tokens: OutlookTokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: computeExpiresAt(body.expires_in),
  };

  saveOutlookTokens(tokens, userId);
  return tokens;
}

export async function getValidOutlookAccessToken(userId = getDefaultUserId()) {
  const tokens = getOutlookTokens(userId);

  if (!tokens) {
    return null;
  }

  if (isExpired(tokens.expiresAt) && tokens.refreshToken) {
    const refreshed = await refreshOutlookTokens(tokens.refreshToken, userId);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}
