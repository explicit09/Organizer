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
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <h2 className="text-lg font-semibold text-stone-900">Integrations</h2>
        <p className="mt-2 text-sm text-stone-500">
          Connect calendars and tools to schedule meetings automatically.
        </p>
        {status ? (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
            Status: {status}
            {reason ? ` (${reason})` : ""}
          </div>
        ) : null}
        {connected === "google" ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            Successfully connected to Google Calendar!
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            Error: {error}
          </div>
        ) : null}
      </section>

      {/* Google Calendar */}
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-green-500 text-white text-lg">
              G
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Google Calendar
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Sync events and find available slots.
              </p>
            </div>
          </div>
          <div className={`text-xs uppercase tracking-[0.3em] ${googleTokens ? "text-emerald-600" : "text-stone-400"}`}>
            {googleTokens ? "Connected" : "Not connected"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="/api/google/connect"
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            {googleTokens ? "Reconnect Google" : "Connect Google Calendar"}
          </a>
          <div className="text-xs text-stone-500">
            Requires Google Cloud OAuth setup.
          </div>
        </div>
      </section>

      {/* Outlook Calendar */}
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white text-lg">
              O
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Outlook Calendar
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Two-way sync for scheduling meetings and focus blocks.
              </p>
            </div>
          </div>
          <div className={`text-xs uppercase tracking-[0.3em] ${outlookTokens ? "text-emerald-600" : "text-stone-400"}`}>
            {outlookTokens ? "Connected" : "Not connected"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="/api/outlook/connect"
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            {outlookTokens ? "Reconnect Outlook" : "Connect Outlook"}
          </a>
          <div className="text-xs text-stone-500">
            Needs Microsoft Graph API access.
          </div>
        </div>
      </section>

      {/* Email Notifications */}
      <section className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-lg">
              ✉
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Email Notifications
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Get reminder emails for upcoming tasks and meetings.
              </p>
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
            {process.env.RESEND_API_KEY ? "Configured" : "Not configured"}
          </div>
        </div>

        <div className="mt-6 text-xs text-stone-500">
          Set <code className="rounded bg-stone-100 px-1 py-0.5">RESEND_API_KEY</code> environment variable to enable.
        </div>
      </section>
    </div>
  );
}
