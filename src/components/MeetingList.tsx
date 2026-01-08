"use client";

import { useState } from "react";
import type { Item } from "../lib/items";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, CheckCircle2, AlertCircle, Clock, Video, Loader2 } from "lucide-react";

type MeetingListProps = {
  items: Item[];
};

export function MeetingList({ items }: MeetingListProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  async function handleSchedule(item: Item) {
    if (!item.startAt || !item.endAt) {
      setStatus("Missing start/end time");
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setSchedulingId(item.id);
    setStatus(null);

    try {
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
      } else {
        setStatus("Scheduled in Outlook");
      }
    } catch {
      setStatus("Network error");
    } finally {
      setSchedulingId(null);
      setTimeout(() => setStatus(null), 3000);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400">
            <Video size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Meetings</h3>
            <p className="text-xs text-muted-foreground">Sync with Outlook</p>
          </div>
        </div>
        {status && (
          <span className={`text-[10px] px-2 py-1 rounded-md animate-in fade-in ${status.includes("Scheduled")
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-rose-500/10 text-rose-400"
            }`}>
            {status}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center flex flex-col items-center gap-2">
            <Calendar size={20} className="text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">No meetings scheduled</span>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-[#09090b] p-3 transition-colors hover:border-white/[0.08]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-0.5 h-8 rounded-full bg-blue-500/50 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <Clock size={10} />
                    {item.startAt ? new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No time"}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleSchedule(item)}
                disabled={schedulingId === item.id}
                className="h-7 text-xs px-2.5 shrink-0"
              >
                {schedulingId === item.id ? <Loader2 className="animate-spin" size={12} /> : <Calendar size={12} />}
                <span className="hidden sm:inline ml-1.5">{schedulingId === item.id ? "Syncing" : "Sync"}</span>
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
