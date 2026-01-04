"use client";

import { useEffect, useState } from "react";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-stone-900">Available Slots</h3>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-stone-500">Min:</label>
          <select
            value={minDuration}
            onChange={(e) => setMinDuration(Number(e.target.value))}
            className="rounded border border-stone-200 px-2 py-1 text-sm"
          >
            <option value={15}>15m</option>
            <option value={30}>30m</option>
            <option value={60}>1h</option>
            <option value={120}>2h</option>
          </select>
          <label className="text-stone-500">Days:</label>
          <select
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="rounded border border-stone-200 px-2 py-1 text-sm"
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={7}>7</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-stone-100" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          No available slots found. Your schedule looks full!
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date}>
              <div className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                {formatDate(slotsByDate[date][0].start)}
              </div>
              <div className="space-y-2">
                {slotsByDate[date].slice(0, 5).map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">●</span>
                      <span className="text-stone-700">
                        {formatTime(slot.start)} – {formatTime(slot.end)}
                      </span>
                    </div>
                    <span className="text-stone-500">
                      {formatDuration(slot.durationMinutes)}
                    </span>
                  </div>
                ))}
                {slotsByDate[date].length > 5 && (
                  <div className="text-xs text-stone-500 text-center">
                    +{slotsByDate[date].length - 5} more slots
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
