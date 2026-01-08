import { cookies } from "next/headers";
import { getSessionUserId } from "../../../lib/auth";
import { getOutlookTokens } from "../../../lib/outlook";
import { getGoogleTokens } from "../../../lib/googleCalendar";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; reason?: string; connected?: string; error?: string }>;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;
  const outlookTokens = userId ? getOutlookTokens(userId) : null;
  const googleTokens = userId ? getGoogleTokens(userId) : null;
  const params = await searchParams;
  const status = params?.status;
  const reason = params?.reason;
  const connected = params?.connected;
  const error = params?.error;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <h2 className="text-sm font-semibold text-white">Integrations</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Connect calendars and tools to schedule meetings automatically.
        </p>
        {status ? (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-muted-foreground">
            Status: {status}
            {reason ? ` (${reason})` : ""}
          </div>
        ) : null}
        {connected === "google" ? (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
            Successfully connected to Google Calendar!
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
            Error: {error}
          </div>
        ) : null}
      </section>

      {/* Google Calendar */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-green-500 text-white text-sm font-semibold">
              G
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Google Calendar
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sync events and find available slots.
              </p>
            </div>
          </div>
          <div className={`text-[10px] uppercase tracking-wider ${googleTokens ? "text-emerald-400" : "text-muted-foreground"}`}>
            {googleTokens ? "Connected" : "Not connected"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/api/google/connect"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {googleTokens ? "Reconnect Google" : "Connect Google Calendar"}
          </a>
          <div className="text-xs text-muted-foreground">
            Requires Google Cloud OAuth setup.
          </div>
        </div>
      </section>

      {/* Outlook Calendar */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-white text-sm font-semibold">
              O
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Outlook Calendar
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Two-way sync for scheduling meetings and focus blocks.
              </p>
            </div>
          </div>
          <div className={`text-[10px] uppercase tracking-wider ${outlookTokens ? "text-emerald-400" : "text-muted-foreground"}`}>
            {outlookTokens ? "Connected" : "Not connected"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/api/outlook/connect"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {outlookTokens ? "Reconnect Outlook" : "Connect Outlook"}
          </a>
          <div className="text-xs text-muted-foreground">
            Needs Microsoft Graph API access.
          </div>
        </div>
      </section>

      {/* Email Notifications */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm">
              ✉
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Email Notifications
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get reminder emails for upcoming tasks and meetings.
              </p>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {process.env.RESEND_API_KEY ? "Configured" : "Not configured"}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Set <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-white/70">RESEND_API_KEY</code> environment variable to enable.
        </div>
      </section>
    </div>
  );
}
