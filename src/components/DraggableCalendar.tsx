"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import type { Item } from "../lib/items";

// ========== Types ==========

type DragState = {
  isDragging: boolean;
  itemId: string | null;
  sourceType: "unscheduled" | "calendar";
  startY: number;
  currentY: number;
};

type TimeSlot = {
  hour: number;
  minute: number;
  date: Date;
};

type CalendarViewProps = {
  items: Item[];
  unscheduledTasks: Item[];
  currentDate: Date;
  onScheduleItem: (itemId: string, startAt: Date, endAt: Date) => void;
  onRescheduleItem: (itemId: string, startAt: Date, endAt: Date) => void;
  onDateChange: (date: Date) => void;
};

// ========== Component ==========

export function DraggableCalendar({
  items,
  unscheduledTasks,
  currentDate,
  onScheduleItem,
  onRescheduleItem,
  onDateChange,
}: CalendarViewProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    itemId: null,
    sourceType: "unscheduled",
    startY: 0,
    currentY: 0,
  });
  const [dropTarget, setDropTarget] = useState<TimeSlot | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate hours for the day
  const hours = useMemo(() => {
    const h = [];
    for (let i = 6; i <= 22; i++) {
      h.push(i);
    }
    return h;
  }, []);

  // Get items for current day
  const dayItems = useMemo(() => {
    const dateStr = currentDate.toISOString().slice(0, 10);
    return items.filter((item) => item.startAt?.startsWith(dateStr));
  }, [items, currentDate]);

  // Calculate position for an item
  const getItemPosition = useCallback(
    (item: Item) => {
      if (!item.startAt || !item.endAt) return null;

      const start = new Date(item.startAt);
      const end = new Date(item.endAt);

      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;

      const top = ((startHour - 6) / 17) * 100;
      const height = ((endHour - startHour) / 17) * 100;

      return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
    },
    []
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, itemId: string, source: "unscheduled" | "calendar") => {
      e.preventDefault();
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDragState({
        isDragging: true,
        itemId,
        sourceType: source,
        startY: y,
        currentY: y,
      });
    },
    []
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragState.isDragging || !calendarRef.current) return;

      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragState((prev) => ({ ...prev, currentY: y }));

      // Calculate drop target
      const rect = calendarRef.current.getBoundingClientRect();
      const relativeY = y - rect.top;
      const percentage = relativeY / rect.height;
      const hourOffset = percentage * 17; // 17 hours (6-23)
      const hour = Math.floor(6 + hourOffset);
      const minute = Math.round(((hourOffset % 1) * 60) / 15) * 15; // Round to 15 min

      if (hour >= 6 && hour <= 22) {
        setDropTarget({
          hour,
          minute: minute % 60,
          date: currentDate,
        });
      }
    },
    [dragState.isDragging, currentDate]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragState.isDragging && dragState.itemId && dropTarget) {
      const startAt = new Date(currentDate);
      startAt.setHours(dropTarget.hour, dropTarget.minute, 0, 0);

      // Find the item to get duration
      const item =
        items.find((i) => i.id === dragState.itemId) ||
        unscheduledTasks.find((t) => t.id === dragState.itemId);

      const duration = item?.estimatedMinutes ?? 30;
      const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

      if (dragState.sourceType === "unscheduled") {
        onScheduleItem(dragState.itemId, startAt, endAt);
      } else {
        onRescheduleItem(dragState.itemId, startAt, endAt);
      }
    }

    setDragState({
      isDragging: false,
      itemId: null,
      sourceType: "unscheduled",
      startY: 0,
      currentY: 0,
    });
    setDropTarget(null);
  }, [
    dragState,
    dropTarget,
    currentDate,
    items,
    unscheduledTasks,
    onScheduleItem,
    onRescheduleItem,
  ]);

  // Navigate days
  const goToPrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className="flex h-full gap-4"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      {/* Unscheduled Tasks Sidebar */}
      <div className="w-64 flex-shrink-0 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Unscheduled Tasks
        </h3>
        <div className="space-y-2">
          {unscheduledTasks.length === 0 ? (
            <p className="text-sm text-neutral-400">No unscheduled tasks</p>
          ) : (
            unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className={`cursor-grab rounded-md border border-neutral-200 bg-white p-2 shadow-sm transition-all hover:shadow-md dark:border-neutral-600 dark:bg-neutral-700 ${
                  dragState.isDragging && dragState.itemId === task.id
                    ? "opacity-50"
                    : ""
                }`}
                onMouseDown={(e) => handleDragStart(e, task.id, "unscheduled")}
                onTouchStart={(e) => handleDragStart(e, task.id, "unscheduled")}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-neutral-400" />
                  <span className="flex-1 truncate text-sm">{task.title}</span>
                </div>
                {task.estimatedMinutes && (
                  <div className="ml-6 mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {task.estimatedMinutes}m
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevDay}
              className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNextDay}
              className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">{formatDate(currentDate)}</h2>
          </div>
          <button
            onClick={goToToday}
            className="rounded-md bg-neutral-100 px-3 py-1 text-sm hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            Today
          </button>
        </div>

        {/* Time Grid */}
        <div
          ref={calendarRef}
          className="relative h-[calc(100%-60px)] overflow-y-auto"
        >
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex h-16 border-b border-neutral-100 dark:border-neutral-700"
            >
              <div className="w-16 flex-shrink-0 pr-2 pt-1 text-right text-xs text-neutral-400">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              <div className="relative flex-1 border-l border-neutral-200 dark:border-neutral-600"></div>
            </div>
          ))}

          {/* Drop target indicator */}
          {dragState.isDragging && dropTarget && (
            <div
              className="pointer-events-none absolute left-16 right-0 h-8 rounded bg-blue-100 opacity-50 dark:bg-blue-900"
              style={{
                top: `${((dropTarget.hour - 6 + dropTarget.minute / 60) / 17) * 100}%`,
              }}
            />
          )}

          {/* Scheduled Items */}
          {dayItems.map((item) => {
            const position = getItemPosition(item);
            if (!position) return null;

            return (
              <div
                key={item.id}
                className={`absolute left-16 right-2 cursor-grab rounded-md border-l-4 bg-blue-50 p-2 shadow-sm transition-all hover:shadow-md dark:bg-blue-900/30 ${
                  item.priority === "urgent"
                    ? "border-red-500"
                    : item.priority === "high"
                    ? "border-orange-500"
                    : "border-blue-500"
                } ${
                  dragState.isDragging && dragState.itemId === item.id
                    ? "opacity-50"
                    : ""
                }`}
                style={{ top: position.top, height: position.height }}
                onMouseDown={(e) => handleDragStart(e, item.id, "calendar")}
                onTouchStart={(e) => handleDragStart(e, item.id, "calendar")}
              >
                <div className="flex h-full flex-col">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  {item.startAt && item.endAt && (
                    <span className="text-xs text-neutral-500">
                      {new Date(item.startAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(item.endAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Preview */}
      {dragState.isDragging && dragState.itemId && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-blue-500 bg-white p-2 shadow-lg dark:bg-neutral-800"
          style={{
            left: 100,
            top: dragState.currentY - 20,
          }}
        >
          {items.find((i) => i.id === dragState.itemId)?.title ||
            unscheduledTasks.find((t) => t.id === dragState.itemId)?.title}
        </div>
      )}
    </div>
  );
}
