import { UTCDate } from "@date-fns/utc";
import {
  addDays,
  subDays,
  formatDate,
  addMonths,
  differenceInDays,
} from "date-fns";

/**
 * Extracts date from a title string in format "owner repo (2025-01-12)"
 * First tries to extract from parentheses, then falls back to direct date pattern matching
 */
export function extractDateFromTitle(title: string): string | null {
  // First try to extract from parentheses (current format)
  const parenthesesMatch = title.match(/\(([^)]+)\)/);
  if (parenthesesMatch && isValidDateString(parenthesesMatch[1])) {
    return parenthesesMatch[1];
  }

  // Fall back to direct date pattern matching
  const dateMatch = title.match(/\d{4}-\d{2}-\d{2}/);
  return dateMatch ? dateMatch[0] : null;
}

/**
 * Validates if a string is in YYYY-MM-DD format
 */
export function isValidDateString(dateStr: string): boolean {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateStr)) return false;

  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new UTCDate(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Normalizes date string by replacing hyphens with underscores
 * e.g., "2025-01-12" -> "2025_01_12"
 */
export function normalizeDate(date: string): string {
  return date.replace(/-/g, "_");
}

/**
 * Denormalizes date string by replacing underscores with hyphens
 * e.g., "2025_01_12" -> "2025-01-12"
 */
export function denormalizeDate(date: string): string {
  return date.replace(/_/g, "-");
}

/**
 * Extracts date from any filename containing a date pattern YYYY-MM-DD or YYYY_MM_DD
 */
export function extractDateFromFilename(filename: string): string | null {
  const dateMatch = filename.match(/\d{4}[-_]\d{2}[-_]\d{2}/);
  return dateMatch ? denormalizeDate(dateMatch[0]) : null;
}

/**
 * Converts a date to YYYY-MM-DD format string
 * @param date - Date object, timestamp, or date string that can be parsed by new Date()
 * @returns string in YYYY-MM-DD format
 */
export function toDateString(date: string | number | Date): string {
  return new UTCDate(date).toISOString().split("T")[0];
}

/**
 * Converts a date to UTC midnight (00:00:00.000Z)
 * @param date - Date object, timestamp, or date string that can be parsed by new Date()
 * @returns Date object set to UTC midnight
 */
export function toUTCMidnight(date: string | number | Date): UTCDate {
  return new UTCDate(
    new UTCDate(date).toISOString().split("T")[0] + "T00:00:00.000Z",
  );
}
export type IntervalType = "day" | "week" | "month";

export interface TimeInterval {
  intervalStart: UTCDate;
  intervalEnd: UTCDate;
  intervalType: IntervalType;
}

/**
 * Generates a formatted name for a time interval
 * @param interval - The time interval object
 * @returns Formatted name for the interval
 */
export function generateIntervalName(interval: TimeInterval): string {
  switch (interval.intervalType) {
    case "day":
      return toDateString(interval.intervalStart);
    case "week":
      return toDateString(interval.intervalStart);
    case "month":
      const date = interval.intervalStart;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
    default:
      throw new Error(`Invalid interval type: ${interval.intervalType}`);
  }
}
/**
 * Get time period text based on interval type
 */
export function getTimePeriodText(intervalType: IntervalType): {
  timeFrame: string;
  timeFrameShort: string;
  sentenceCount: number;
} {
  switch (intervalType) {
    case "day":
      return {
        timeFrame: "today",
        timeFrameShort: "today",
        sentenceCount: 2,
      };
    case "week":
      return {
        timeFrame: "this week",
        timeFrameShort: "this week",
        sentenceCount: 3,
      };
    case "month":
      return {
        timeFrame: "this month",
        timeFrameShort: "this month",
        sentenceCount: 4,
      };
    default:
      return {
        timeFrame: "today",
        timeFrameShort: "today",
        sentenceCount: 2,
      };
  }
}

export interface DateRangeOptions {
  after?: string;
  before?: string;
  days?: string | number;
  defaultStartDate?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Calculates a date range based on command line options
 * @param options - Object containing after, before, and days options
 * @returns Object with startDate (optional) and endDate as strings in YYYY-MM-DD format
 */
export function calculateDateRange(options: DateRangeOptions): DateRange {
  const { after, before, days, defaultStartDate } = options;

  // Calculate end date (defaults to now)
  const endDate = before ? new UTCDate(before) : new UTCDate();

  const numDays = typeof days === "string" ? parseInt(days) : days;
  // Calculate start date based on priority: after > days
  let startDate: UTCDate | undefined;
  if (after) {
    startDate = new UTCDate(after);
  } else if (numDays) {
    startDate = subDays(endDate, numDays);
  } else {
    startDate = defaultStartDate
      ? new UTCDate(defaultStartDate)
      : subDays(endDate, 7);
  }

  return {
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  };
}

/**
 * Generates a date range from a start date to end date (today by default)
 * @param startDate - The start date for the range
 * @param endDate - The end date for the range (defaults to current date)
 * @param descending - Whether to sort dates in descending order (newest first)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateDaysInRange(
  startDate: UTCDate | string,
  endDate: UTCDate | string = new UTCDate(),
  descending: boolean = false,
): string[] {
  const start = new UTCDate(startDate);
  const end = new UTCDate(endDate);
  const dates: string[] = [];

  // Create date objects for each day between start and end
  const current = new Date(start);
  while (current <= end) {
    // Format date as YYYY-MM-DD
    const formattedDate = toDateString(current);
    dates.push(formattedDate);

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  // Sort dates if needed
  if (descending) {
    dates.sort((a, b) => b.localeCompare(a));
  }

  return dates;
}

export function formatReadableDate(date: string | Date) {
  const dateObj = new UTCDate(date);
  const readableDate = formatDate(dateObj, "MMMM d, yyyy");
  return readableDate;
}

/**
 * Formats a date into a human-readable timeframe title based on interval type
 * @param date - The date to format
 * @param intervalType - The type of interval (day, week, month)
 * @returns Formatted timeframe title
 */
export function formatTimeframeTitle(
  date: UTCDate | Date | string,
  intervalType: IntervalType,
  formatOptions?: {
    compact?: boolean;
  },
): string {
  const utcDate = date instanceof UTCDate ? date : new UTCDate(date);

  if (intervalType === "month") {
    const monthName = utcDate.toLocaleString("default", {
      month: formatOptions?.compact ? "short" : "long",
    });
    const year = utcDate.getFullYear();
    return `${monthName} ${year}`;
  } else if (intervalType === "week") {
    const endOfWeek = addDays(utcDate, 6);
    // Format as Week of Month Day, Year
    return `${utcDate.toLocaleString("default", {
      month: "short",
      day: "numeric",
    })} - ${endOfWeek.toLocaleString("default", {
      day: "numeric",
    })}, ${utcDate.toLocaleString("default", { year: "numeric" })}`;
  } else {
    // Daily format: Month Day, Year
    return utcDate.toLocaleString("default", {
      month: "short",
      day: "numeric",
      ...(!formatOptions?.compact && { year: "numeric" }),
    });
  }
}

/**
 * Converts interval type to a title form
 * @param intervalType - The type of interval (day, week, month)
 * @returns Title form of the interval type
 */
export function getIntervalTypeTitle(intervalType: IntervalType): string {
  switch (intervalType) {
    case "month":
      return "Monthly";
    case "week":
      return "Weekly";
    case "day":
      return "Daily";
    default:
      return intervalType;
  }
}

/**
 * Calculates the precise start and end boundaries for a given interval type and date.
 * This ensures consistent interval definitions across the application.
 *
 * @param date - The reference date for the interval.
 * @param intervalType - The type of interval (day, week, month).
 * @returns An object containing the intervalStart and intervalEnd as UTCDate objects.
 */
export function calculateIntervalBoundaries(
  date: UTCDate,
  intervalType: IntervalType,
): { intervalStart: UTCDate; intervalEnd: UTCDate } {
  let intervalStart: UTCDate;
  let intervalEnd: UTCDate;

  switch (intervalType) {
    case "day":
      intervalStart = toUTCMidnight(date);
      intervalEnd = addDays(intervalStart, 1);
      break;

    case "week":
      // Ensure we start from the Sunday of the week containing the date
      const startOfWeek = toUTCMidnight(date);
      intervalStart = addDays(startOfWeek, -startOfWeek.getUTCDay());
      intervalEnd = addDays(intervalStart, 7);
      break;

    case "month":
      // Ensure we start from the first day of the month
      const firstOfMonth = new UTCDate(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
      );
      intervalStart = firstOfMonth;
      intervalEnd = addMonths(intervalStart, 1);
      break;

    default:
      // Exhaustive check
      throw new Error(`Unsupported interval type: ${intervalType}`);
  }

  return { intervalStart, intervalEnd };
}

/**
 * Generates time intervals for a given date range and interval type
 * Can be used for both pipeline steps and generating static params for routes
 */
export function generateTimeIntervalsForDateRange(
  intervalType: IntervalType,
  dateRange: { startDate: string; endDate?: string },
  now = new UTCDate(),
): TimeInterval[] {
  const intervals: TimeInterval[] = [];

  // Convert dates to UTC midnight and adjust based on interval type
  let start: UTCDate;
  let end: UTCDate;

  switch (intervalType) {
    case "day":
      start = toUTCMidnight(dateRange.startDate || subDays(now, 7));
      end = dateRange.endDate
        ? addDays(toUTCMidnight(new UTCDate(dateRange.endDate)), 1)
        : addDays(toUTCMidnight(now), 1);
      break;

    case "week": {
      // Get start of week (Sunday) for the start date
      const startDate = toUTCMidnight(dateRange.startDate || subDays(now, 7));
      start = addDays(startDate, -startDate.getUTCDay());

      // Get first day of next week after the end date
      const rawEnd = dateRange.endDate
        ? toUTCMidnight(new UTCDate(dateRange.endDate))
        : toUTCMidnight(now);
      const daysUntilNextWeek = 7 - rawEnd.getUTCDay();
      end = addDays(rawEnd, daysUntilNextWeek);
      break;
    }

    case "month": {
      // Start from first day of the start month
      const startDate = new UTCDate(dateRange.startDate || subDays(now, 30));
      start = new UTCDate(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
      );

      // End at the first day of the month after the end date
      const rawEnd = dateRange.endDate ? new UTCDate(dateRange.endDate) : now;
      end = addMonths(
        new UTCDate(Date.UTC(rawEnd.getUTCFullYear(), rawEnd.getUTCMonth(), 1)),
        1,
      );
      break;
    }

    default:
      throw new Error(`Unsupported interval type: ${intervalType}`);
  }

  let currentStart = new UTCDate(start);

  // Handle single-day case
  if (currentStart.getTime() === end.getTime()) {
    const interval: TimeInterval = {
      intervalStart: currentStart,
      intervalEnd: end,
      intervalType,
    };
    intervals.push(interval);
    return intervals;
  }

  while (currentStart < end) {
    // Use the helper function to determine the precise boundaries for the current interval start
    const { intervalStart: preciseStart, intervalEnd: preciseEnd } =
      calculateIntervalBoundaries(currentStart, intervalType);

    const interval: TimeInterval = {
      intervalStart: preciseStart,
      intervalEnd: preciseEnd,
      intervalType,
    };
    intervals.push(interval);

    // Move to next interval start using the calculated end
    currentStart = preciseEnd;
  }

  return intervals;
}

/**
 * Formats interval date for URL path segments
 * @param interval - The time interval
 * @returns Formatted date string or array based on interval type
 */
export function formatIntervalForPath(interval: TimeInterval): string[] {
  switch (interval.intervalType) {
    case "day":
      return [toDateString(interval.intervalStart)];
    case "week":
      return [toDateString(interval.intervalStart)];
    case "month":
      const date = interval.intervalStart;
      return [
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      ];
    default:
      throw new Error(`Invalid interval type: ${interval.intervalType}`);
  }
} /**
 * Find adjacent intervals using the same logic as generateTimeIntervalsForDateRange
 */
export function findAdjacentIntervals(
  currentInterval: TimeInterval,
  latestDate: string,
): {
  prevDate: string | null;
  nextDate: string | null;
} {
  const { intervalType, intervalStart } = currentInterval;

  // Generate a range of intervals spanning before and after the current date
  // We'll use a wider date range around the current interval
  const lookbackPeriod = 60; // Look back 60 days to ensure we capture previous intervals
  const startDate = toDateString(subDays(intervalStart, lookbackPeriod));

  const intervals = generateTimeIntervalsForDateRange(intervalType, {
    startDate,
    endDate: latestDate,
  });

  // Find the current interval's index
  const currentIntervalStartStr = toDateString(intervalStart);
  const currentIndex = intervals.findIndex(
    (interval) =>
      toDateString(interval.intervalStart) === currentIntervalStartStr,
  );

  if (currentIndex === -1) {
    // Should never happen but handle the case anyway
    return { prevDate: null, nextDate: null };
  }

  // Determine previous interval (if any)
  const prevInterval = currentIndex > 0 ? intervals[currentIndex - 1] : null;

  // Determine next interval (if any)
  const nextInterval =
    currentIndex < intervals.length - 1 ? intervals[currentIndex + 1] : null;

  // Format interval dates for the URL
  const prevDate = prevInterval ? formatIntervalForPath(prevInterval)[0] : null;
  const nextDate = nextInterval ? formatIntervalForPath(nextInterval)[0] : null;

  return { prevDate, nextDate };
}

export function getIntervalTypeFromDateRange(dateRange: {
  startDate: string;
  endDate: string;
}): IntervalType {
  const startDate = new UTCDate(dateRange.startDate);
  const endDate = new UTCDate(dateRange.endDate);

  const diffInDays = differenceInDays(endDate, startDate);

  if (diffInDays <= 2) {
    return "day";
  } else if (diffInDays <= 8) {
    return "week";
  } else {
    return "month";
  }
} /**
 * Parse date string based on interval type format
 * @param dateStr - Date string to parse
 * @param intervalType - Interval type (day, week, month)
 * @returns TimeInterval object or null if invalid
 */

export function parseIntervalDate(
  dateStr: string,
  intervalType: IntervalType,
): TimeInterval | null {
  let referenceDate: UTCDate;

  if (intervalType === "day") {
    if (!isValidDateString(dateStr)) return null;
    referenceDate = new UTCDate(dateStr);
  } else if (intervalType === "week") {
    if (!isValidDateString(dateStr)) return null;
    referenceDate = new UTCDate(dateStr);
  } else if (intervalType === "month") {
    const monthPattern = /^\d{4}-\d{2}(-\d{2})?$/;
    if (!monthPattern.test(dateStr)) return null;
    const [yearStr, monthStr] = dateStr.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // Month is 0-indexed for UTCDate constructor

    // For month, we use the 1st day of the month as the reference to align with calculateIntervalBoundaries
    referenceDate = new UTCDate(Date.UTC(year, month, 1));
  } else {
    return null; // Should not happen with IntervalType
  }

  // Use the centralized helper function to get interval boundaries
  const { intervalStart, intervalEnd } = calculateIntervalBoundaries(
    referenceDate,
    intervalType,
  );

  return {
    intervalStart,
    intervalEnd,
    intervalType,
  };
}
