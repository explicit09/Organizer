import type { AgentContext } from "./types";
import { listItems } from "../items";

interface BuildContextOptions {
  userId: string;
  timezone?: string;
}

export function buildAgentContext(options: BuildContextOptions): AgentContext {
  const { userId, timezone = "America/Chicago" } = options;
  const now = new Date();

  // Get all items
  const items = listItems(undefined, { userId });
  const notCompleted = items.filter((i) => i.status !== "completed");

  // Calculate overdue items
  const overdue = notCompleted.filter((i) => {
    if (!i.dueAt) return false;
    return new Date(i.dueAt) < now;
  });

  // Calculate today's items
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueToday = notCompleted.filter((i) => {
    if (!i.dueAt) return false;
    const due = new Date(i.dueAt);
    return due >= todayStart && due <= todayEnd;
  });

  // Get today's meetings
  const todayMeetings = items.filter((i) => {
    if (i.type !== "meeting") return false;
    const meetingDate = i.startAt || i.dueAt;
    if (!meetingDate) return false;
    const date = new Date(meetingDate);
    return date >= todayStart && date <= todayEnd;
  });

  // Find next meeting
  let nextMeeting: AgentContext["nextMeeting"] = undefined;
  const upcomingMeetings = todayMeetings
    .filter((m) => {
      const meetingDate = new Date(m.startAt || m.dueAt!);
      return meetingDate > now;
    })
    .sort((a, b) => {
      const aTime = new Date(a.startAt || a.dueAt!).getTime();
      const bTime = new Date(b.startAt || b.dueAt!).getTime();
      return aTime - bTime;
    });

  if (upcomingMeetings.length > 0) {
    const next = upcomingMeetings[0];
    const nextTime = new Date(next.startAt || next.dueAt!);
    nextMeeting = {
      title: next.title,
      startsAt: nextTime.toISOString(),
      minutesUntil: Math.round((nextTime.getTime() - now.getTime()) / (1000 * 60)),
    };
  }

  // Get upcoming items (not overdue, not completed, due in next 7 days)
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const upcoming = notCompleted
    .filter((i) => {
      if (!i.dueAt) return false;
      const due = new Date(i.dueAt);
      return due > now && due <= weekEnd;
    })
    .sort((a, b) => {
      const aTime = new Date(a.dueAt!).getTime();
      const bTime = new Date(b.dueAt!).getTime();
      return aTime - bTime;
    })
    .slice(0, 10);

  // Map overdue items with days overdue
  const overdueItems = overdue
    .map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      priority: i.priority,
      dueAt: i.dueAt!,
      daysOverdue: Math.floor((now.getTime() - new Date(i.dueAt!).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 10);

  // Get day of week
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[now.getDay()];

  // Format current time
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });

  return {
    currentTime: timeStr,
    currentDate: dateStr,
    dayOfWeek,
    timezone,

    openTaskCount: notCompleted.length,
    overdueCount: overdue.length,
    todayDueCount: dueToday.length,
    inProgressCount: notCompleted.filter((i) => i.status === "in_progress").length,

    todayMeetings: todayMeetings.length,
    nextMeeting,
    freeTimeSlots: undefined, // TODO: Calculate from calendar

    currentFocus: undefined, // TODO: Get from user state
    activeGoals: [], // TODO: Get from goals table

    preferences: [], // TODO: Get from user_preferences table
    patterns: [], // TODO: Get from user_patterns table

    upcomingItems: upcoming.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      priority: i.priority,
      dueAt: i.dueAt,
    })),

    overdueItems,
  };
}
