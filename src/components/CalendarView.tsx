"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Clock } from "lucide-react";
import { clsx } from "clsx";

type CalendarItem = {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  type: string;
  status: string;
};

type ViewMode = "month" | "week" | "day" | "agenda";

type CalendarViewProps = {
  items?: CalendarItem[];
  onDateSelect?: (date: Date) => void;
  defaultView?: ViewMode;
};

const typeColors: Record<string, { bg: string; text: string; dot: string }> = {
  meeting: { bg: "bg-blue-500/15", text: "text-blue-300", dot: "bg-blue-400" },
  task: { bg: "bg-purple-500/15", text: "text-purple-300", dot: "bg-purple-400" },
  school: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400" },
};

export function CalendarView({ items = [], onDateSelect, defaultView = "month" }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (item.startAt) {
        const dateKey = item.startAt.split("T")[0];
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(item);
      }
    }
    return map;
  }, [items]);

  const navigate = (direction: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + direction);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const getHeaderText = () => {
    if (viewMode === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (viewMode === "week") {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (viewMode === "day") return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    return "Agenda";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{getHeaderText()}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Today is {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center rounded-lg bg-[#0c0c0e] border border-white/[0.06] p-0.5">
            {[
              { mode: "month" as const, icon: LayoutGrid, label: "Month" },
              { mode: "week" as const, icon: Calendar, label: "Week" },
              { mode: "day" as const, icon: Clock, label: "Day" },
              { mode: "agenda" as const, icon: List, label: "List" },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={clsx(
                  "p-2 rounded-md transition-colors",
                  viewMode === mode ? "bg-primary text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/[0.06] text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
            Today
          </button>

          <div className="flex items-center rounded-lg bg-[#0c0c0e] border border-white/[0.06]">
            <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(1)} className="p-2 text-muted-foreground hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === "month" && <MonthView currentDate={currentDate} selectedDate={selectedDate} itemsByDate={itemsByDate} onDateClick={handleDateClick} today={today} />}
      {viewMode === "week" && <WeekView currentDate={currentDate} items={items} today={today} />}
      {viewMode === "day" && <DayView currentDate={currentDate} items={items} />}
      {viewMode === "agenda" && <AgendaView items={items} today={today} />}
    </div>
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function MonthView({ currentDate, selectedDate, itemsByDate, onDateClick, today }: {
  currentDate: Date; selectedDate: Date; itemsByDate: Map<string, CalendarItem[]>; onDateClick: (d: Date) => void; today: Date;
}) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = monthStart.getDay();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#09090b] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/[0.04]">
        {weekDays.map((d) => (
          <div key={d} className="py-3 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="aspect-square border-b border-r border-white/[0.04] bg-white/[0.01]" />;
          const key = getDateKey(date);
          const dayItems = itemsByDate.get(key) || [];
          const isToday = key === getDateKey(today);
          const isSelected = key === getDateKey(selectedDate);

          return (
            <button
              key={key}
              onClick={() => onDateClick(date)}
              className={clsx(
                "aspect-square p-1.5 flex flex-col items-center border-b border-r border-white/[0.04] transition-colors",
                isToday && "bg-primary/10",
                isSelected && !isToday && "bg-white/5",
                !isToday && !isSelected && "hover:bg-white/[0.02]"
              )}
            >
              <span className={clsx(
                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                isToday && "bg-primary text-white",
                !isToday && "text-white"
              )}>{date.getDate()}</span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayItems.slice(0, 3).map((item, j) => (
                    <div key={j} className={clsx("w-1.5 h-1.5 rounded-full", typeColors[item.type]?.dot || "bg-slate-400")} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, items, today }: { currentDate: Date; items: CalendarItem[]; today: Date }) {
  const weekStart = getWeekStart(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am-8pm

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#09090b] overflow-hidden">
      <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-white/[0.04]">
        <div />
        {weekDates.map((date, i) => {
          const isToday = getDateKey(date) === getDateKey(today);
          return (
            <div key={i} className={clsx("py-3 text-center border-l border-white/[0.04]", isToday && "bg-primary/5")}>
              <div className="text-[10px] text-muted-foreground uppercase">{weekDays[i]}</div>
              <div className={clsx("text-lg font-semibold", isToday ? "text-primary" : "text-white")}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-white/[0.04]">
            <div className="p-2 text-[10px] text-muted-foreground text-right pr-2">
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            {weekDates.map((date, i) => {
              const dateKey = getDateKey(date);
              const hourItems = items.filter((it) => it.startAt && getDateKey(new Date(it.startAt)) === dateKey && new Date(it.startAt).getHours() === hour);
              return (
                <div key={i} className="min-h-[40px] border-l border-white/[0.04] p-0.5">
                  {hourItems.map((item) => (
                    <div key={item.id} className={clsx("text-[10px] px-1.5 py-0.5 rounded truncate border-l-2", typeColors[item.type]?.bg, typeColors[item.type]?.text, `border-l-${typeColors[item.type]?.dot.replace("bg-", "")}`)}>
                      {item.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ currentDate, items }: { currentDate: Date; items: CalendarItem[] }) {
  const dateKey = getDateKey(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#09090b] overflow-hidden max-h-[500px] overflow-y-auto">
      {hours.map((hour) => {
        const hourItems = items.filter((it) => it.startAt && getDateKey(new Date(it.startAt)) === dateKey && new Date(it.startAt).getHours() === hour);
        return (
          <div key={hour} className="flex border-b border-white/[0.04]">
            <div className="w-16 p-3 text-xs text-muted-foreground text-right shrink-0 border-r border-white/[0.04]">
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            <div className="flex-1 min-h-[50px] p-1.5 space-y-1">
              {hourItems.map((item) => (
                <div key={item.id} className={clsx("px-3 py-2 rounded-lg text-sm font-medium border-l-2", typeColors[item.type]?.bg, typeColors[item.type]?.text)}>
                  {item.title}
                  {item.startAt && <span className="ml-2 text-xs opacity-70">{new Date(item.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaView({ items, today }: { items: CalendarItem[]; today: Date }) {
  const upcoming = items.filter((it) => it.startAt && new Date(it.startAt) >= today).sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));
  const grouped = upcoming.reduce((acc, item) => {
    if (!item.startAt) return acc;
    const key = item.startAt.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, CalendarItem[]>);
  const dates = Object.keys(grouped).sort().slice(0, 14);

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#09090b] py-12 text-center">
        <Calendar size={24} className="mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dates.map((dateKey) => {
        const date = new Date(dateKey + "T00:00:00");
        const isToday = getDateKey(date) === getDateKey(today);
        return (
          <div key={dateKey} className="rounded-xl border border-white/[0.06] bg-[#09090b] overflow-hidden">
            <div className={clsx("px-4 py-2.5 border-b border-white/[0.04]", isToday && "bg-primary/5")}>
              <span className={clsx("text-sm font-medium", isToday ? "text-primary" : "text-white")}>
                {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" })}
              </span>
              <span className="text-xs text-muted-foreground ml-2">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {grouped[dateKey].map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={clsx("w-2 h-2 rounded-full", typeColors[item.type]?.dot || "bg-slate-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  {item.startAt && <span className="text-xs text-muted-foreground">{new Date(item.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
