/**
 * Extracts date from a title string in format "elizaos Eliza (2025-01-12)"
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
  const date = new Date(year, month - 1, day);

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
  return new Date(date).toISOString().split("T")[0];
}

export type IntervalType = "day" | "week" | "month";

export interface TimeInterval {
  intervalStart: Date;
  intervalEnd: Date;
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
        "0"
      )}`;
    default:
      throw new Error(`Invalid interval type: ${interval.intervalType}`);
  }
}
