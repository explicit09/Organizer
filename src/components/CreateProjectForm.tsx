"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area: area || undefined,
          goal: goal || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Project creation failed");
      }
      setName("");
      setArea("");
      setGoal("");
      setStatus("Project added");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Project creation failed");
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
        Add project
      </div>
      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Area"
          value={area}
          onChange={(event) => setArea(event.target.value)}
        />
        <input
          className="w-full rounded-2xl border border-stone-200/70 bg-white px-4 py-3 text-sm text-stone-700 outline-none"
          placeholder="Goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
        />
        <button
          type="submit"
          disabled={!name || isSubmitting}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add project"}
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
