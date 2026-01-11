import { cookies } from "next/headers";
import Link from "next/link";
import { StatCard, FocusCard } from "@/components/StatCard";
import { getSessionUserId } from "../../../lib/auth";
import { listItems } from "../../../lib/items";
import { listDueNotifications } from "../../../lib/notifications";
import { ensureSampleData } from "../../../lib/seed";
import { DashboardClient } from "../../../components/DashboardClient";
import { DonutChart, BarChart, Legend } from "../../../components/ui/Charts";
import { formatRelativeDate, formatTime } from "../../../lib/dateParser";
import {
  Clock,
  ArrowRight,
  Calendar,
  AlertCircle,
  Inbox,
  Target,
  TrendingUp,
  Sparkles,
  Zap,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    return null;
  }

  ensureSampleData(userId);
  const items = listItems(undefined, { userId });
  const notifications = listDueNotifications({ userId });
  
  // Calculate stats
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const inProgress = items.filter((item) => item.status === "in_progress").length;
  const notStarted = items.filter((item) => item.status === "not_started").length;
  const tasks = items.filter((item) => item.type === "task" && item.status !== "completed").length;
  const meetings = items.filter((item) => item.type === "meeting").length;
  const school = items.filter((item) => item.type === "school").length;
  const overdue = items.filter(
    (item) => item.dueAt && new Date(item.dueAt) < new Date() && item.status !== "completed"
  ).length;

  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  // Get upcoming items (next 5)
  const upcoming = items
    .filter((item) => item.dueAt && item.status !== "completed")
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5);

  // Get today's items
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const todayItems = items.filter((item) => {
    if (!item.dueAt || item.status === "completed") return false;
    const due = new Date(item.dueAt);
    return due >= todayStart && due <= todayEnd;
  });

  // Calculate weekly data
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = weekDays.map((day) => ({
    label: day,
    value: Math.floor(Math.random() * 8) + 1, // Placeholder - would be real data
    color: 'hsl(238 65% 62%)',
  }));

  // Status distribution for donut chart
  const statusSegments = [
    { value: completed, color: 'hsl(142 65% 48%)', label: 'Completed' },
    { value: inProgress, color: 'hsl(45 95% 55%)', label: 'In Progress' },
    { value: notStarted, color: 'hsl(228 5% 50%)', label: 'Not Started' },
  ].filter(s => s.value > 0);

  // Type distribution
  const typeData = [
    { label: 'Tasks', value: tasks, color: 'hsl(238 65% 62%)' },
    { label: 'Meetings', value: meetings, color: 'hsl(200 80% 55%)' },
    { label: 'School', value: school, color: 'hsl(45 95% 55%)' },
  ];

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle">
          <Clock size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric"
            })}
          </span>
        </div>
      </div>

      {/* Daily Briefing & AI Insights */}
      <DashboardClient />

      {/* Focus Cards - Top row with key actionable metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FocusCard
          label="Due Today"
          value={todayItems.length}
          description={todayItems.length === 0 ? "All clear" : `${todayItems.length} item${todayItems.length !== 1 ? "s" : ""} to complete`}
          icon={<Target size={20} />}
          variant={todayItems.length > 0 ? "primary" : "default"}
        />
        <FocusCard
          label="In Progress"
          value={inProgress}
          description={`${notStarted} not started`}
          icon={<TrendingUp size={20} />}
          variant={inProgress > 0 ? "warning" : "default"}
        />
        <FocusCard
          label="Overdue"
          value={overdue}
          description={overdue > 0 ? "Needs attention" : "All on track"}
          icon={<AlertCircle size={20} />}
          variant={overdue > 0 ? "danger" : "default"}
        />
      </div>

      {/* Main Grid - Balanced layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                Upcoming
              </h2>
              <Link 
                href="/schedule" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="rounded-xl border border-border overflow-hidden glass-card">
              {upcoming.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Calendar size={20} className="opacity-50" />
                  No upcoming items
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {upcoming.map((item, index) => {
                    const due = item.dueAt ? new Date(item.dueAt) : null;
                    const isOverdue = due && due < new Date();
                    
                    return (
                      <Link
                        key={item.id}
                        href={`/tasks?highlight=${item.id}`}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-all group",
                          index === 0 && "bg-gradient-to-r from-primary/5 to-transparent"
                        )}
                      >
                        {/* Priority indicator */}
                        <div className={clsx(
                          "w-1 h-8 rounded-full shrink-0",
                          item.priority === "urgent" && "bg-destructive",
                          item.priority === "high" && "bg-[hsl(25_95%_55%)]",
                          item.priority === "medium" && "bg-primary",
                          item.priority === "low" && "bg-muted-foreground/50",
                        )} />
                        
                        {/* Status dot */}
                        <span className={clsx(
                          "w-2 h-2 rounded-full shrink-0",
                          item.status === "in_progress" && "bg-[hsl(45_95%_55%)]",
                          item.status === "not_started" && "bg-muted-foreground",
                          item.status === "blocked" && "bg-[hsl(25_95%_55%)]",
                        )} />
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.type} · {item.status.replace("_", " ")}
                          </p>
                        </div>
                        
                        {/* Due date */}
                        {due && (
                          <span className={clsx(
                            "text-xs px-2 py-1 rounded-md shrink-0",
                            isOverdue 
                              ? "text-destructive bg-destructive/10" 
                              : "text-muted-foreground bg-muted/50"
                          )}>
                            {formatRelativeDate(due)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Notifications */}
          {notifications.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Inbox size={14} className="text-primary" />
                  Reminders
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full gradient-primary-subtle text-primary font-medium">
                  {notifications.length}
                </span>
              </div>
              
              <div className="rounded-xl border border-border overflow-hidden glass-card">
                <div className="divide-y divide-border/50">
                  {notifications.slice(0, 4).map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 glow-primary" />
                      <span className="text-sm text-foreground flex-1 truncate">
                        {note.title}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(new Date(note.dueAt))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Stats & Charts */}
        <div className="space-y-4">
          {/* Status Distribution */}
          <div className="rounded-xl border border-border p-4 glass-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={12} />
              Status Overview
            </h3>
            <div className="flex items-center justify-center mb-4">
              <DonutChart
                data={statusSegments}
                size={100}
                strokeWidth={10}
                centerValue={total}
                centerLabel="Total"
              />
            </div>
            <Legend items={statusSegments} className="justify-center" />
          </div>

          {/* Weekly Activity */}
          <div className="rounded-xl border border-border p-4 glass-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={12} />
              Weekly Activity
            </h3>
            <BarChart data={weeklyData} height={64} showValues={false} />
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <StatCard
              label="This Week"
              value={items.filter(i => {
                if (!i.createdAt) return false;
                const week = new Date();
                week.setDate(week.getDate() - 7);
                return new Date(i.createdAt) > week;
              }).length}
              helper="Items created"
              icon={<Calendar size={16} />}
              variant="info"
              compact
            />
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/inbox?new=task"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium btn-neon"
              >
                <Sparkles size={14} />
                Add Task
              </Link>
              <Link
                href="/today"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-border glass-card hover:bg-accent/50 transition-colors"
              >
                <Target size={14} />
                Plan Today
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
