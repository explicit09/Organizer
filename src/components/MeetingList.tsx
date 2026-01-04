"use client";

import { useState } from "react";
import type { Item } from "../lib/items";

type MeetingListProps = {
  items: Item[];
};

export function MeetingList({ items }: MeetingListProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSchedule(item: Item) {
    if (!item.startAt || !item.endAt) {
      setStatus("Missing start/end time");
      return;
    }
    setStatus(null);
    const res = await fetch("/api/outlook/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: item.title,
        start: item.startAt,
        end: item.endAt,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStatus(body.error ?? "Outlook scheduling failed");
      return;
    }
    setStatus("Scheduled in Outlook");
  }

  return (
    <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
      <h3 className="text-base font-semibold text-stone-900">Meetings</h3>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs text-stone-500">
            No meetings scheduled.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700"
            >
              <div>
                <div className="text-base font-semibold text-stone-900">
                  {item.title}
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
                  {item.startAt ? item.startAt.slice(0, 16).replace("T", " ") : "no time"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSchedule(item)}
                className="rounded-2xl border border-stone-200/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-500"
              >
                Schedule
              </button>
            </div>
          ))
        )}
      </div>
      {status ? (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
          {status}
        </div>
      ) : null}
    </div>
  );
}
