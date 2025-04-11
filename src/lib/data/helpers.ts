import { SQL, gte, lte, sql } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DateRange } from "./types";
import { toDateString } from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";

/**
 * Build a date range condition for a specific column
 *
 * @param column - The date column to filter on
 * @param startDate - Optional start date string (YYYY-MM-DD)
 * @param endDate - Optional end date string (YYYY-MM-DD)
 * @returns Array of SQL conditions to be used in a where clause
 *
 * @example
 * ```typescript
 * const conditions = [
 *   ...buildDateRangeCondition(userDailyScores.date, startDate, endDate)
 * ];
 * ```
 */
export function buildDateRangeCondition(
  column: SQLiteColumn,
  startDate?: string,
  endDate?: string,
): SQL[] {
  const conditions: SQL[] = [];

  if (startDate) {
    conditions.push(gte(column, startDate));
  }

  if (endDate) {
    conditions.push(lte(column, endDate));
  }

  return conditions;
}

/**
 * Build a date range condition for a specific date column based on a DateRange object
 *
 * @param column - The date column to filter on
 * @param dateRange - A DateRange object with optional startDate and endDate
 * @returns Array of SQL conditions to be used in a where clause
 *
 * @example
 * ```typescript
 * const conditions = [
 *   ...buildDateRangeFromObject(userDailyScores.date, dateRange)
 * ];
 * ```
 */
export function buildDateRangeFromObject(
  column: SQLiteColumn,
  dateRange?: DateRange,
): SQL[] {
  if (!dateRange) return [];
  return buildDateRangeCondition(
    column,
    dateRange.startDate,
    dateRange.endDate,
  );
}

/**
 * Get a date range for common time periods
 *
 * @param period - Time period identifier ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all')
 * @returns DateRange object with startDate and endDate strings
 *
 * @example
 * ```typescript
 * const { startDate, endDate } = getDateRangeForPeriod('weekly');
 * ```
 */
export function getDateRangeForPeriod(
  period: "all" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
): DateRange {
  if (period === "all") {
    return {};
  }

  const now = new UTCDate();
  const endDate = toDateString(now);
  let startDate: UTCDate;

  switch (period) {
    case "daily":
      // Just today
      startDate = now;
      break;
    case "weekly":
      // Start of current week (considering Sunday as first day)
      const day = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
      startDate = new UTCDate(now);
      startDate.setDate(now.getDate() - day);
      break;
    case "monthly":
      // Start of current month
      startDate = new UTCDate(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarterly":
      // Start of current quarter
      const month = now.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      startDate = new UTCDate(now.getFullYear(), quarterStartMonth, 1);
      break;
    case "yearly":
      // Start of current year
      startDate = new UTCDate(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = now;
  }

  return {
    startDate: toDateString(startDate),
    endDate,
  };
}

/**
 * Generate SQL expressions for common score aggregation fields
 *
 * @param table - The table object containing score columns
 * @returns Object with SQL expressions for each score type
 *
 * @example
 * ```typescript
 * const scoreFields = generateScoreSelectFields(userDailyScores);
 * const results = await db
 *   .select({
 *     ...scoreFields,
 *     username: userDailyScores.username,
 *   })
 *   .from(userDailyScores);
 * ```
 */
export function generateScoreSelectFields<
  T extends {
    score: SQLiteColumn;
    prScore?: SQLiteColumn;
    issueScore?: SQLiteColumn;
    reviewScore?: SQLiteColumn;
    commentScore?: SQLiteColumn;
  },
>(table: T) {
  return {
    totalScore: sql<number>`COALESCE(SUM(${table.score}), 0)`,
    ...(table.prScore
      ? { prScore: sql<number>`COALESCE(SUM(${table.prScore}), 0)` }
      : {}),
    ...(table.issueScore
      ? { issueScore: sql<number>`COALESCE(SUM(${table.issueScore}), 0)` }
      : {}),
    ...(table.reviewScore
      ? { reviewScore: sql<number>`COALESCE(SUM(${table.reviewScore}), 0)` }
      : {}),
    ...(table.commentScore
      ? { commentScore: sql<number>`COALESCE(SUM(${table.commentScore}), 0)` }
      : {}),
  };
}

/**
 * Format a period identifier for time-based aggregations
 *
 * @param date - Date string to format
 * @param period - Aggregation period type
 * @returns SQL expression for the formatted period
 *
 * @example
 * ```typescript
 * const periodLabel = formatPeriodLabel(userDailyScores.date, 'monthly');
 * ```
 */
export function formatPeriodLabel(
  dateColumn: SQLiteColumn,
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
): SQL<string> {
  switch (period) {
    case "daily":
      // Cast the column to SQL directly for the daily case
      return sql<string>`${dateColumn}`;
    case "weekly":
      return sql<string>`strftime('%Y-W%W', ${dateColumn})`;
    case "monthly":
      return sql<string>`substr(${dateColumn}, 1, 7)`;
    case "quarterly":
      return sql<string>`
        substr(${dateColumn}, 1, 4) || '-Q' || 
        (cast(substr(${dateColumn}, 6, 2) as integer) + 2) / 3
      `;
    case "yearly":
      return sql<string>`substr(${dateColumn}, 1, 4)`;
    default:
      return sql<string>`${dateColumn}`;
  }
}
