"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, GraduationCap, Clock, ChevronDown, Sparkles } from "lucide-react";

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

  const priorityStyles = (p: string) => {
    if (p === "urgent") return "bg-rose-500/10 border-rose-500/20 text-rose-200 group-hover:bg-rose-500/20";
    if (p === "high") return "bg-amber-500/10 border-amber-500/20 text-amber-200 group-hover:bg-amber-500/20";
    if (p === "medium") return "bg-teal-500/10 border-teal-500/20 text-teal-200 group-hover:bg-teal-500/20";
    return "bg-white/5 border-white/10 text-muted-foreground group-hover:bg-white/10";
  };

  const priorityGlow = (p: string) => {
    if (p === "urgent") return "bg-rose-500";
    if (p === "high") return "bg-amber-500";
    if (p === "medium") return "bg-teal-500";
    return "bg-zinc-500";
  }

  // Group sessions by date
  const sessionsByDate = (plan?.sessions ?? []).reduce((acc, session) => {
    const date = session.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, StudySession[]>);

  const dates = Object.keys(sessionsByDate).sort();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/10 text-violet-400">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Study Plan</h3>
            <p className="text-xs text-muted-foreground">AI Generated</p>
          </div>
        </div>

        <div className="relative">
          <select
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="appearance-none h-8 bg-[#09090b] border border-white/[0.08] rounded-lg pl-3 pr-7 text-xs text-white focus:outline-none focus:border-primary/40 hover:border-white/[0.12] cursor-pointer"
          >
            <option value={1} className="bg-[#09090b]">1h/day</option>
            <option value={2} className="bg-[#09090b]">2h/day</option>
            <option value={3} className="bg-[#09090b]">3h/day</option>
            <option value={4} className="bg-[#09090b]">4h/day</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 bg-white/[0.04] rounded-lg" />
            <div className="h-14 bg-white/[0.04] rounded-lg" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded-lg" />)}
          </div>
        </div>
      ) : !plan || !plan.sessions || plan.sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center flex flex-col items-center gap-2">
          <GraduationCap size={20} className="text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Add school items with due dates</span>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap size={14} className="text-primary" />
                {plan.itemsCovered}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                {formatMinutes(plan.totalMinutes)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative border-l border-white/[0.06] ml-2 space-y-5 pl-4">
            {dates.map((date) => {
              const sessions = sessionsByDate[date];
              const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const dayMinutes = sessions.reduce((sum, s) => sum + s.suggestedMinutes, 0);

              return (
                <div key={date} className="relative">
                  <div className="absolute -left-[19px] top-0.5 h-2 w-2 rounded-full bg-primary" />

                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-white">{dayName}</span>
                    <span className="text-muted-foreground">{formatMinutes(dayMinutes)}</span>
                  </div>

                  <div className="space-y-1.5">
                    {sessions.map((session, i) => (
                      <div
                        key={`${session.itemId}-${i}`}
                        className={`group flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${priorityStyles(session.priority)}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${priorityGlow(session.priority)}`} />
                          <span className="truncate text-sm">{session.itemTitle}</span>
                        </div>
                        <span className="ml-2 text-[10px] tabular-nums opacity-70 shrink-0">
                          {formatMinutes(session.suggestedMinutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
