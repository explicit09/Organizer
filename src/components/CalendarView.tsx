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

const typeColors: Record<string, { dot: string; bg: string; text: string }> = {
  meeting: { dot: "bg-[hsl(200_80%_55%)]", bg: "bg-[hsl(200_80%_55%/0.1)]", text: "text-[hsl(200_80%_55%)]" },
  task: { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
  school: { dot: "bg-[hsl(142_65%_48%)]", bg: "bg-[hsl(142_65%_48%/0.1)]", text: "text-[hsl(142_65%_48%)]" },
};

export function CalendarView({ items = [], onDateSelect, defaultView = "week" }: CalendarViewProps) {
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
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (viewMode === "day") return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    return "Upcoming";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{getHeaderText()}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center rounded-md bg-accent border border-border p-0.5">
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
                  "p-1.5 rounded transition-colors",
                  viewMode === mode 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button 
            onClick={goToToday} 
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Today
          </button>

          <div className="flex items-center rounded-md border border-border bg-card">
            <button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === "month" && (
        <MonthView 
          currentDate={currentDate} 
          selectedDate={selectedDate} 
          itemsByDate={itemsByDate} 
          onDateClick={handleDateClick} 
          today={today} 
        />
      )}
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="aspect-square border-b border-r border-border bg-muted/30" />;
          const key = getDateKey(date);
          const dayItems = itemsByDate.get(key) || [];
          const isToday = key === getDateKey(today);
          const isSelected = key === getDateKey(selectedDate);

          return (
            <button
              key={key}
              onClick={() => onDateClick(date)}
              className={clsx(
                "aspect-square p-1 flex flex-col items-center border-b border-r border-border transition-colors",
                isToday && "bg-primary/5",
                isSelected && !isToday && "bg-accent",
                !isToday && !isSelected && "hover:bg-accent/50"
              )}
            >
              <span className={clsx(
                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                isToday && "bg-primary text-primary-foreground",
                !isToday && "text-foreground"
              )}>
                {date.getDate()}
              </span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayItems.slice(0, 3).map((item, j) => (
                    <div key={j} className={clsx("w-1 h-1 rounded-full", typeColors[item.type]?.dot || "bg-muted-foreground")} />
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
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am-7pm

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border">
        <div />
        {weekDates.map((date, i) => {
          const isToday = getDateKey(date) === getDateKey(today);
          return (
            <div key={i} className={clsx("py-2 text-center border-l border-border", isToday && "bg-primary/5")}>
              <div className="text-[10px] text-muted-foreground uppercase">{weekDays[i]}</div>
              <div className={clsx("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border">
            <div className="p-1.5 text-[10px] text-muted-foreground text-right pr-2">
              {hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`}
            </div>
            {weekDates.map((date, i) => {
              const dateKey = getDateKey(date);
              const hourItems = items.filter((it) => it.startAt && getDateKey(new Date(it.startAt)) === dateKey && new Date(it.startAt).getHours() === hour);
              return (
                <div key={i} className="min-h-[32px] border-l border-border p-0.5">
                  {hourItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={clsx(
                        "text-[10px] px-1 py-0.5 rounded truncate",
                        typeColors[item.type]?.bg,
                        typeColors[item.type]?.text
                      )}
                    >
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
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden max-h-[400px] overflow-y-auto">
      {hours.map((hour) => {
        const hourItems = items.filter((it) => it.startAt && getDateKey(new Date(it.startAt)) === dateKey && new Date(it.startAt).getHours() === hour);
        return (
          <div key={hour} className="flex border-b border-border">
            <div className="w-14 p-2 text-xs text-muted-foreground text-right shrink-0 border-r border-border">
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            <div className="flex-1 min-h-[40px] p-1 space-y-1">
              {hourItems.map((item) => (
                <div 
                  key={item.id} 
                  className={clsx(
                    "px-2 py-1.5 rounded text-sm font-medium",
                    typeColors[item.type]?.bg,
                    typeColors[item.type]?.text
                  )}
                >
                  {item.title}
                  {item.startAt && (
                    <span className="ml-2 text-xs opacity-70">
                      {new Date(item.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
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
      <div className="rounded-lg border border-dashed border-border bg-card py-10 text-center">
        <Calendar size={20} className="mx-auto text-muted-foreground/40 mb-2" />
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
          <div key={dateKey} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className={clsx("px-3 py-2 border-b border-border", isToday && "bg-primary/5")}>
              <span className={clsx("text-sm font-medium", isToday ? "text-primary" : "text-foreground")}>
                {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" })}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="divide-y divide-border">
              {grouped[dateKey].map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors">
                  <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", typeColors[item.type]?.dot || "bg-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  {item.startAt && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(item.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
