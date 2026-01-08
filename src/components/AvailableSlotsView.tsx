"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Clock, Calendar, ChevronDown, Sparkles } from "lucide-react";
import { clsx } from "clsx";

type TimeSlot = {
  start: string;
  end: string;
  durationMinutes: number;
};

export function AvailableSlotsView() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDuration, setMinDuration] = useState(30);
  const [daysAhead, setDaysAhead] = useState(3);

  const fetchSlots = () => {
    setLoading(true);
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    fetch(`/api/schedule/slots?startDate=${startDate}&endDate=${endDate}&minDuration=${minDuration}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [minDuration, daysAhead]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = slot.start.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const dates = Object.keys(slotsByDate).sort();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Available Time</h3>
            <p className="text-xs text-muted-foreground">Free slots detected</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={minDuration}
              onChange={(e) => setMinDuration(Number(e.target.value))}
              className="appearance-none h-8 bg-[#09090b] border border-white/[0.08] rounded-lg pl-3 pr-7 text-xs text-white focus:outline-none focus:border-primary/40 hover:border-white/[0.12] cursor-pointer"
            >
              <option value={15} className="bg-[#09090b]">15m+</option>
              <option value={30} className="bg-[#09090b]">30m+</option>
              <option value={60} className="bg-[#09090b]">1h+</option>
              <option value={120} className="bg-[#09090b]">2h+</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="appearance-none h-8 bg-[#09090b] border border-white/[0.08] rounded-lg pl-3 pr-7 text-xs text-white focus:outline-none focus:border-primary/40 hover:border-white/[0.12] cursor-pointer"
            >
              <option value={1} className="bg-[#09090b]">1 Day</option>
              <option value={3} className="bg-[#09090b]">3 Days</option>
              <option value={5} className="bg-[#09090b]">5 Days</option>
              <option value={7} className="bg-[#09090b]">7 Days</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-20 bg-white/[0.04] rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-lg" />)}
          </div>
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center flex flex-col items-center gap-2">
          <Calendar size={20} className="text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">No slots found</span>
        </div>
      ) : (
        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          {dates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-[#0c0c0e] py-1 z-10">
                <Sparkles size={10} className="text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-white font-medium">
                  {formatDate(slotsByDate[date][0].start)}
                </span>
              </div>

              <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {slotsByDate[date].map((slot, i) => (
                  <div
                    key={i}
                    className="group flex flex-col items-center justify-center rounded-lg border border-white/[0.04] bg-[#09090b] px-3 py-2 hover:border-emerald-500/30 hover:bg-emerald-500/[0.05] cursor-pointer transition-colors"
                  >
                    <div className="font-mono text-xs font-medium text-white group-hover:text-emerald-400 transition-colors">
                      {formatTime(slot.start)}
                    </div>
                    <div className="text-[10px] text-muted-foreground group-hover:text-emerald-400/70 transition-colors">
                      {formatDuration(slot.durationMinutes)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
