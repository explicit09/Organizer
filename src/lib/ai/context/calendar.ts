import type { CalendarContext, CalendarEvent, TimeBlock } from "./types";
import { listItems } from "../../items";

export function getCalendarContext(userId: string): CalendarContext {
  const now = new Date();
  const items = listItems({ type: "meeting" }, { userId });

  // Today's boundaries
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Week boundaries
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);

  // Convert items to calendar events
  const toEvent = (item: typeof items[0]): CalendarEvent | null => {
    const startTime = item.startAt || item.dueAt;
    if (!startTime) return null;

    const start = new Date(startTime);
    const durationMins = item.estimatedMinutes || 60;
    const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + durationMins * 60 * 1000);

    return {
      id: item.id,
      title: item.title,
      start,
      end,
      type: item.type,
    };
  };

  // Get today's meetings
  const meetingsToday = items
    .map(toEvent)
    .filter((e): e is CalendarEvent => {
      if (!e) return false;
      return e.start >= todayStart && e.start <= todayEnd;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Get this week's meetings
  const meetingsThisWeek = items
    .map(toEvent)
    .filter((e): e is CalendarEvent => {
      if (!e) return false;
      return e.start >= now && e.start <= weekEnd;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Find next meeting
  const upcomingMeetings = meetingsToday.filter((m) => m.start > now);
  const nextMeeting = upcomingMeetings[0] || null;
  const minutesUntilNextMeeting = nextMeeting
    ? Math.round((nextMeeting.start.getTime() - now.getTime()) / (1000 * 60))
    : null;

  // Calculate total meeting hours this week
  const totalMeetingHoursThisWeek = meetingsThisWeek.reduce((sum, m) => {
    const duration = (m.end.getTime() - m.start.getTime()) / (1000 * 60 * 60);
    return sum + duration;
  }, 0);

  // Calculate free blocks for today
  const freeBlocksToday = calculateFreeBlocks(now, todayEnd, meetingsToday);

  // Calculate free blocks for the week
  const freeBlocksThisWeek = calculateFreeBlocksWeek(now, weekEnd, meetingsThisWeek);

  // Find longest free block
  const allFreeBlocks = [...freeBlocksToday, ...freeBlocksThisWeek];
  const longestFreeBlock = allFreeBlocks.length > 0
    ? allFreeBlocks.reduce((longest, block) =>
        block.durationMinutes > longest.durationMinutes ? block : longest
      )
    : null;

  return {
    meetingsToday,
    meetingsThisWeek,
    freeBlocksToday,
    freeBlocksThisWeek,
    nextMeeting,
    minutesUntilNextMeeting,
    totalMeetingHoursThisWeek,
    longestFreeBlock,
  };
}

function calculateFreeBlocks(
  start: Date,
  end: Date,
  meetings: CalendarEvent[]
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const workStart = 9; // 9 AM
  const workEnd = 18; // 6 PM

  // Adjust start to work hours
  const effectiveStart = new Date(start);
  if (effectiveStart.getHours() < workStart) {
    effectiveStart.setHours(workStart, 0, 0, 0);
  }

  const effectiveEnd = new Date(end);
  if (effectiveEnd.getHours() > workEnd) {
    effectiveEnd.setHours(workEnd, 0, 0, 0);
  }

  if (effectiveStart >= effectiveEnd) return blocks;

  // Sort meetings by start time
  const sorted = [...meetings].sort((a, b) => a.start.getTime() - b.start.getTime());

  let currentTime = effectiveStart;

  for (const meeting of sorted) {
    if (meeting.start > currentTime && meeting.start <= effectiveEnd) {
      const blockEnd = meeting.start < effectiveEnd ? meeting.start : effectiveEnd;
      const durationMinutes = Math.round(
        (blockEnd.getTime() - currentTime.getTime()) / (1000 * 60)
      );

      if (durationMinutes >= 30) {
        blocks.push({
          start: new Date(currentTime),
          end: blockEnd,
          durationMinutes,
        });
      }
    }

    if (meeting.end > currentTime) {
      currentTime = new Date(meeting.end);
    }
  }

  // Check for remaining time after last meeting
  if (currentTime < effectiveEnd) {
    const durationMinutes = Math.round(
      (effectiveEnd.getTime() - currentTime.getTime()) / (1000 * 60)
    );

    if (durationMinutes >= 30) {
      blocks.push({
        start: currentTime,
        end: effectiveEnd,
        durationMinutes,
      });
    }
  }

  return blocks;
}

function calculateFreeBlocksWeek(
  start: Date,
  end: Date,
  meetings: CalendarEvent[]
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    // Skip weekends
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayStart = new Date(current);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(18, 0, 0, 0);

      // Only process future days or current day
      if (dayEnd > start) {
        const dayMeetings = meetings.filter((m) => {
          return m.start >= dayStart && m.start < dayEnd;
        });

        const effectiveStart = dayStart > start ? dayStart : start;
        const dayBlocks = calculateFreeBlocks(effectiveStart, dayEnd, dayMeetings);
        blocks.push(...dayBlocks);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return blocks;
}
