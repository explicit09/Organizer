import type { ToolResult, ToolExecutionContext } from "../types";
import { listItems, getItem, type Item } from "../../items";

export async function executeStartFocusSession(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const itemId = input.itemId as string | undefined;
    const duration = (input.duration as number) || 25;
    const blockNotifications = input.blockNotifications !== false;

    let focusItem: Item | null = null;
    if (itemId) {
      try {
        focusItem = getItem(itemId, { userId: ctx.userId });
      } catch {
        // Item not found, continue without focus item
      }
    }

    return {
      success: true,
      data: {
        message: focusItem
          ? `Starting ${duration} minute focus session on "${focusItem.title}"`
          : `Starting ${duration} minute focus session`,
        session: {
          duration,
          blockNotifications,
          itemId: focusItem?.id,
          itemTitle: focusItem?.title,
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + duration * 60 * 1000).toISOString(),
        },
        navigate: "/dashboard?focus=true",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start focus session",
    };
  }
}

export async function executeGetCalendarContext(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const timeframe = (input.timeframe as string) || "today";
    const findFreeSlots = input.findFreeSlots === true;
    const minSlotMinutes = (input.minSlotMinutes as number) || 30;

    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);

    // Set date range
    switch (timeframe) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "tomorrow":
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
        endDate.setHours(23, 59, 59, 999);
        break;
      case "next_week":
        startDate.setDate(startDate.getDate() + (7 - startDate.getDay()) + 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    // Get meetings in timeframe
    const items = listItems({ type: "meeting" }, { userId: ctx.userId });
    const meetings = items.filter((item) => {
      if (!item.startAt && !item.dueAt) return false;
      const itemDate = new Date(item.startAt || item.dueAt!);
      return itemDate >= startDate && itemDate <= endDate;
    });

    // Sort by start time
    meetings.sort((a, b) => {
      const aTime = new Date(a.startAt || a.dueAt!).getTime();
      const bTime = new Date(b.startAt || b.dueAt!).getTime();
      return aTime - bTime;
    });

    const result: Record<string, unknown> = {
      timeframe,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      meetingCount: meetings.length,
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        startAt: m.startAt || m.dueAt,
        endAt: m.endAt,
        duration: m.estimatedMinutes,
      })),
    };

    // Find free slots if requested
    if (findFreeSlots) {
      const freeSlots: Array<{
        start: string;
        end: string;
        durationMinutes: number;
      }> = [];

      // Working hours: 9am - 6pm
      const workStart = 9;
      const workEnd = 18;

      let currentDay = new Date(startDate);
      while (currentDay <= endDate) {
        // Skip weekends
        const dayOfWeek = currentDay.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dayStart = new Date(currentDay);
          dayStart.setHours(workStart, 0, 0, 0);
          const dayEnd = new Date(currentDay);
          dayEnd.setHours(workEnd, 0, 0, 0);

          // Get meetings for this day
          const dayMeetings = meetings.filter((m) => {
            const mDate = new Date(m.startAt || m.dueAt!);
            return mDate.toDateString() === currentDay.toDateString();
          });

          // Find gaps
          let slotStart = dayStart;
          for (const meeting of dayMeetings) {
            const meetingStart = new Date(meeting.startAt || meeting.dueAt!);
            const meetingEnd = meeting.endAt
              ? new Date(meeting.endAt)
              : new Date(meetingStart.getTime() + (meeting.estimatedMinutes || 60) * 60 * 1000);

            if (meetingStart > slotStart) {
              const duration = (meetingStart.getTime() - slotStart.getTime()) / (1000 * 60);
              if (duration >= minSlotMinutes) {
                freeSlots.push({
                  start: slotStart.toISOString(),
                  end: meetingStart.toISOString(),
                  durationMinutes: Math.round(duration),
                });
              }
            }
            slotStart = meetingEnd > slotStart ? meetingEnd : slotStart;
          }

          // Check remaining time after last meeting
          if (slotStart < dayEnd) {
            const duration = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);
            if (duration >= minSlotMinutes) {
              freeSlots.push({
                start: slotStart.toISOString(),
                end: dayEnd.toISOString(),
                durationMinutes: Math.round(duration),
              });
            }
          }
        }

        currentDay.setDate(currentDay.getDate() + 1);
      }

      result.freeSlots = freeSlots;
      result.totalFreeMinutes = freeSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get calendar context",
    };
  }
}

export async function executeNavigate(
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const to = input.to as string;

    return {
      success: true,
      data: {
        message: `Navigating to ${to}`,
        navigate: to,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to navigate",
    };
  }
}
