"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Smile, Frown, Zap, BrainCircuit } from "lucide-react";

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
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Daily Check-in</h3>
            <p className="text-xs text-muted-foreground">How are you feeling today?</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 mb-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Mood</Label>
              <div className="flex gap-1">
                {mood <= 2 ? <Frown size={14} className="text-rose-400" /> : <Smile size={14} className={mood >= 4 ? "text-emerald-400" : "text-muted-foreground"} />}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={mood}
              onChange={(event) => setMood(Number(event.target.value))}
              className="w-full accent-primary h-1.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/60 uppercase tracking-wider">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Focus</Label>
              <Zap size={14} className={focus >= 4 ? "text-amber-400" : "text-muted-foreground"} />
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={focus}
              onChange={(event) => setFocus(Number(event.target.value))}
              className="w-full accent-primary h-1.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/60 uppercase tracking-wider">
              <span>Scattered</span>
              <span>Laser</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <Label>Notes</Label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-white/[0.08] bg-[#09090b] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 outline-none hover:border-white/[0.12] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            placeholder="What went well? What needs attention?"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Saving..." : "Save Check-in"}
        </Button>

        {status && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 text-center">
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
