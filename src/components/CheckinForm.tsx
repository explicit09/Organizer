"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CheckinForm() {
  const router = useRouter();
  const [mood, setMood] = useState(3);
  const [focus, setFocus] = useState(3);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          mood,
          focus,
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Check-in failed");
      }
      setStatus("Check-in saved");
      setNotes("");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-[0_16px_40px_-30px_rgba(20,20,20,0.5)] backdrop-blur"
    >
      <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
        Daily check-in
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-stone-600">
          Mood
          <input
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(event) => setMood(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <label className="text-sm text-stone-600">
          Focus
          <input
            type="range"
            min={1}
            max={5}
            value={focus}
            onChange={(event) => setFocus(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
      </div>
      <textarea
        className="mt-4 min-h-[100px] w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
        placeholder="What went well? What needs attention?"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save check-in"}
      </button>
      {status ? (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
          {status}
        </div>
      ) : null}
    </form>
  );
}
