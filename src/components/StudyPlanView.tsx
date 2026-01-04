"use client";

import { useEffect, useState } from "react";

type StudySession = {
  date: string;
  itemId: string;
  itemTitle: string;
  courseId?: string;
  suggestedMinutes: number;
  priority: "urgent" | "high" | "medium" | "low";
};

type StudyPlan = {
  sessions: StudySession[];
  totalMinutes: number;
  itemsCovered: number;
};

export function StudyPlanView() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const fetchPlan = () => {
    setLoading(true);
    fetch(`/api/schedule/study-plan?hoursPerDay=${hoursPerDay}&daysAhead=7`)
      .then((res) => res.json())
      .then((data) => {
        setPlan(data.studyPlan);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlan();
  }, [hoursPerDay]);

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const priorityColor = (p: string) => {
    if (p === "urgent") return "bg-rose-100 text-rose-700 border-rose-200";
    if (p === "high") return "bg-amber-100 text-amber-700 border-amber-200";
    if (p === "medium") return "bg-teal-100 text-teal-700 border-teal-200";
    return "bg-stone-100 text-stone-600 border-stone-200";
  };

  // Group sessions by date
  const sessionsByDate = plan?.sessions.reduce((acc, session) => {
    const date = session.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, StudySession[]>) ?? {};

  const dates = Object.keys(sessionsByDate).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-stone-900">Study Plan</h3>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-stone-500">Hours/day:</label>
          <select
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="rounded border border-stone-200 px-2 py-1 text-sm"
          >
            <option value={1}>1h</option>
            <option value={2}>2h</option>
            <option value={3}>3h</option>
            <option value={4}>4h</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-stone-100" />
          ))}
        </div>
      ) : !plan || plan.sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          No study sessions to schedule. Add school items with due dates.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 text-sm text-stone-500">
            <span>📚 {plan.itemsCovered} items</span>
            <span>⏱️ {formatMinutes(plan.totalMinutes)} total</span>
          </div>

          <div className="space-y-4">
            {dates.map((date) => {
              const sessions = sessionsByDate[date];
              const dayName = new Date(date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const dayMinutes = sessions.reduce((sum, s) => sum + s.suggestedMinutes, 0);

              return (
                <div key={date}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-stone-700">{dayName}</span>
                    <span className="text-stone-400">{formatMinutes(dayMinutes)}</span>
                  </div>
                  <div className="space-y-2">
                    {sessions.map((session, i) => (
                      <div
                        key={`${session.itemId}-${i}`}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${priorityColor(session.priority)}`}
                      >
                        <span className="truncate flex-1">{session.itemTitle}</span>
                        <span className="ml-2 font-medium">
                          {formatMinutes(session.suggestedMinutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
