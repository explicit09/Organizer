import type { TemporalContext } from "./types";

export function getTemporalContext(timezone: string = "America/Chicago"): TemporalContext {
  const now = new Date();

  const hour = now.getHours();
  let timeOfDay: TemporalContext["timeOfDay"];
  if (hour < 6) timeOfDay = "night";
  else if (hour < 9) timeOfDay = "early_morning";
  else if (hour < 12) timeOfDay = "morning";
  else if (hour < 14) timeOfDay = "midday";
  else if (hour < 18) timeOfDay = "afternoon";
  else if (hour < 21) timeOfDay = "evening";
  else timeOfDay = "night";

  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long", timeZone: timezone });
  const dayNum = now.getDay();
  const isWeekend = dayNum === 0 || dayNum === 6;

  // Week of year
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekOfYear = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  // Days until end of week (Sunday)
  const daysUntilEndOfWeek = 7 - dayNum;

  // Days until end of month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysUntilEndOfMonth = endOfMonth.getDate() - now.getDate();

  return {
    now,
    dayOfWeek,
    timeOfDay,
    weekOfYear,
    isWeekend,
    daysUntilEndOfWeek,
    daysUntilEndOfMonth,
  };
}
