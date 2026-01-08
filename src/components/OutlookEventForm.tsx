"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Calendar, CheckCircle2, AlertCircle, Mail } from "lucide-react";

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
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Schedule Event</h3>
            <p className="text-xs text-muted-foreground">Add to Outlook Calendar</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input
              placeholder="e.g. Team Sync"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Attendees</Label>
            <div className="relative">
              <Input
                className="pl-9"
                placeholder="teammate@example.com, boss@example.com"
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
              />
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!subject || !start || !end || isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? "Scheduling..." : "Schedule in Outlook"}
        </Button>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${status === "Scheduled in Outlook"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}>
            {status === "Scheduled in Outlook" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status}
          </div>
        )}
      </form>
    </Card>
  );
}
