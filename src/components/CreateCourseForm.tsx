"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CreateCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [instructor, setInstructor] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          term: term || undefined,
          instructor: instructor || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Course creation failed");
      }
      setName("");
      setTerm("");
      setInstructor("");
      setStatus("Course added");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Course creation failed");
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
        Add course
      </div>
      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Course name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
            placeholder="Term"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
            placeholder="Instructor"
            value={instructor}
            onChange={(event) => setInstructor(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={!name || isSubmitting}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add course"}
        </button>
        {status ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
            {status}
          </div>
        ) : null}
      </div>
    </form>
  );
}
