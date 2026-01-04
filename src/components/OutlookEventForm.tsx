"use client";

import { useState, type FormEvent } from "react";

function toUtcIso(value: string) {
  if (!value) {
    return "";
  }
  return new Date(`${value}:00Z`).toISOString();
}

function parseAttendees(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function OutlookEventForm() {
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [attendees, setAttendees] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/outlook/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          start: toUtcIso(start),
          end: toUtcIso(end),
          attendees: parseAttendees(attendees),
          timeZone: "UTC",
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Scheduling failed");
      }

      setStatus("Scheduled in Outlook");
      setSubject("");
      setStart("");
      setEnd("");
      setAttendees("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
    >
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-stone-500">
          Subject
        </label>
        <input
          aria-label="Subject"
          className="mt-2 w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="LEARN-X roadmap sync"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Start time
          </label>
          <input
            aria-label="Start time"
            type="datetime-local"
            className="mt-2 w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-stone-500">
            End time
          </label>
          <input
            aria-label="End time"
            type="datetime-local"
            className="mt-2 w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-stone-500">
          Attendees
        </label>
        <input
          aria-label="Attendees"
          className="mt-2 w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          value={attendees}
          onChange={(event) => setAttendees(event.target.value)}
          placeholder="person@example.com, teammate@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={!subject || !start || !end || isSubmitting}
        className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Scheduling..." : "Schedule in Outlook"}
      </button>
      {status ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
          {status}
        </div>
      ) : null}
    </form>
  );
}
