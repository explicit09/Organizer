"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Target, CheckCircle2, AlertCircle } from "lucide-react";

export function GoalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          target: target ? Number(target) : undefined,
          unit: unit || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Goal creation failed");
      }
      setTitle("");
      setTarget("");
      setUnit("");
      setStatus("Goal added");
      router.refresh();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Goal creation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Add Goal</h3>
            <p className="text-xs text-muted-foreground">Set a new objective</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Title</Label>
            <Input
              placeholder="e.g. Read 12 Books"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Target Value</Label>
              <Input
                placeholder="e.g. 12"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                placeholder="e.g. books"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={!title || isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Goal"}
        </Button>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${status === "Goal added"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}>
            {status === "Goal added" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
