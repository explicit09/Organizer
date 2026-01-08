"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Organizer
        </div>
        <h1 className="mt-2 text-xl font-semibold text-white">
          Create account
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Start organizing with clarity.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Name
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            required
            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            required
            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={!email || !password || isSubmitting}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
        {error ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        ) : null}
      </form>
      <div className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <a className="font-medium text-primary hover:text-primary/80 transition-colors" href="/login">
          Sign in
        </a>
        .
      </div>
    </div>
  );
}
