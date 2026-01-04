"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CreateNoteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create note");
      }

      setTitle("");
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
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
        New note
      </div>
      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Note title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className="min-h-[120px] w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Capture thoughts, plans, summaries..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <button
          type="submit"
          disabled={!title || isSubmitting}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save note"}
        </button>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </form>
  );
}
