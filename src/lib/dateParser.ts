/**
 * Natural language date parsing utility
 * Parses phrases like "tomorrow", "next week", "in 3 days", "Friday", etc.
 */

type ParsedDate = {
  date: Date;
  hasTime: boolean;
};

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function getNextDayOfWeek(dayName: string, fromDate: Date = new Date()): Date {
  const targetDay = DAYS_OF_WEEK.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return fromDate;

  const result = new Date(fromDate);
  const currentDay = result.getDay();
  let daysToAdd = targetDay - currentDay;

  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

function parseTimeFromText(text: string): { hours: number; minutes: number } | null {
  // Match patterns like "3pm", "3:30pm", "15:00", "3 pm"
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] && !match[2].match(/am|pm/i) ? parseInt(match[2], 10) : 0;
      const meridiem = (match[3] || match[2] || "").toLowerCase();

      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;

      return { hours, minutes };
    }
  }

  return null;
}

export function parseDateFromText(text: string): ParsedDate | null {
  const normalized = text.toLowerCase().trim();
  const now = new Date();
  let result: Date | null = null;
  let hasTime = false;

  // Check for time in the text
  const timeInfo = parseTimeFromText(text);
  if (timeInfo) {
    hasTime = true;
  }

  // Today
  if (/\btoday\b/.test(normalized)) {
    result = new Date(now);
  }

  // Tomorrow
  if (/\btomorrow\b/.test(normalized)) {
    result = new Date(now);
    result.setDate(result.getDate() + 1);
  }

  // Yesterday (for reference)
  if (/\byesterday\b/.test(normalized)) {
    result = new Date(now);
    result.setDate(result.getDate() - 1);
  }

  // Next week
  if (/\bnext\s+week\b/.test(normalized)) {
    result = new Date(now);
    result.setDate(result.getDate() + 7);
  }

  // This week (end of week - Friday)
  if (/\bthis\s+week\b/.test(normalized)) {
    result = getNextDayOfWeek("friday", now);
    if (result <= now) {
      result = new Date(now);
    }
  }

  // In X days/weeks/months
  const inPattern = /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/;
  const inMatch = normalized.match(inPattern);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2].replace(/s$/, "");
    result = new Date(now);

    if (unit === "day") {
      result.setDate(result.getDate() + amount);
    } else if (unit === "week") {
      result.setDate(result.getDate() + amount * 7);
    } else if (unit === "month") {
      result.setMonth(result.getMonth() + amount);
    }
  }

  // X days/weeks from now
  const fromNowPattern = /(\d+)\s+(day|days|week|weeks)\s+from\s+now/;
  const fromNowMatch = normalized.match(fromNowPattern);
  if (fromNowMatch) {
    const amount = parseInt(fromNowMatch[1], 10);
    const unit = fromNowMatch[2].replace(/s$/, "");
    result = new Date(now);

    if (unit === "day") {
      result.setDate(result.getDate() + amount);
    } else if (unit === "week") {
      result.setDate(result.getDate() + amount * 7);
    }
  }

  // Day of week (e.g., "Friday", "next Monday")
  for (const day of DAYS_OF_WEEK) {
    const nextPattern = new RegExp(`\\bnext\\s+${day}\\b`);
    const thisPattern = new RegExp(`\\bthis\\s+${day}\\b`);
    const justDayPattern = new RegExp(`\\b${day}\\b`);

    if (nextPattern.test(normalized)) {
      result = getNextDayOfWeek(day, now);
      // If "next" is specified, always go to next week's occurrence
      if (result.getDay() === now.getDay()) {
        result.setDate(result.getDate() + 7);
      }
      break;
    }

    if (thisPattern.test(normalized) || justDayPattern.test(normalized)) {
      result = getNextDayOfWeek(day, now);
      break;
    }
  }

  // End of month
  if (/\bend\s+of\s+(the\s+)?month\b/.test(normalized)) {
    result = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // End of week
  if (/\bend\s+of\s+(the\s+)?week\b/.test(normalized)) {
    result = getNextDayOfWeek("sunday", now);
  }

  // By Friday, by tomorrow, etc. (extract the date part)
  const byPattern = /\bby\s+(\w+)/;
  const byMatch = normalized.match(byPattern);
  if (byMatch && !result) {
    const byDate = parseDateFromText(byMatch[1]);
    if (byDate) {
      result = byDate.date;
    }
  }

  // Specific date formats: "Jan 15", "January 15", "1/15", "15th"
  const monthDayPattern = new RegExp(
    `\\b(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`,
    "i"
  );
  const monthDayMatch = normalized.match(monthDayPattern);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    let monthIndex = MONTHS.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = MONTHS.findIndex((m) => m.startsWith(monthStr));
    }
    if (monthIndex !== -1) {
      result = new Date(now.getFullYear(), monthIndex, day);
      // If the date has passed this year, use next year
      if (result < now) {
        result.setFullYear(result.getFullYear() + 1);
      }
    }
  }

  // Numeric date: MM/DD or MM/DD/YYYY
  const numericPattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  const numericMatch = normalized.match(numericPattern);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    result = new Date(year, month, day);
  }

  if (!result) {
    return null;
  }

  // Apply time if found
  if (timeInfo) {
    result.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
  } else {
    // Default to end of day for due dates
    result.setHours(23, 59, 59, 999);
  }

  return { date: result, hasTime };
}

export function extractDueDateFromText(text: string): {
  dueAt: string | null;
  cleanedText: string;
} {
  const parsed = parseDateFromText(text);

  if (!parsed) {
    return { dueAt: null, cleanedText: text };
  }

  // Remove date-related phrases from the text
  const datePatterns = [
    /\bby\s+(tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next\s+\w+|end\s+of\s+(the\s+)?\w+|\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/gi,
    /\bdue\s+(tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next\s+\w+)\b/gi,
    /\b(tomorrow|today)\b/gi,
    /\bnext\s+(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\bin\s+\d+\s+(day|days|week|weeks|month|months)\b/gi,
    /\b\d+\s+(day|days|week|weeks)\s+from\s+now\b/gi,
    /\bend\s+of\s+(the\s+)?(week|month)\b/gi,
    /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi,
  ];

  let cleanedText = text;
  for (const pattern of datePatterns) {
    cleanedText = cleanedText.replace(pattern, "").trim();
  }

  // Clean up extra spaces and punctuation
  cleanedText = cleanedText.replace(/\s+/g, " ").replace(/^[,\s]+|[,\s]+$/g, "").trim();

  return {
    dueAt: parsed.date.toISOString(),
    cleanedText,
  };
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) {
    return DAYS_OF_WEEK[d.getDay()].charAt(0).toUpperCase() + DAYS_OF_WEEK[d.getDay()].slice(1);
  }
  if (diffDays < 0 && diffDays >= -7) {
    return `${Math.abs(diffDays)} days ago`;
  }
  if (diffDays > 7 && diffDays <= 14) {
    return "Next week";
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
