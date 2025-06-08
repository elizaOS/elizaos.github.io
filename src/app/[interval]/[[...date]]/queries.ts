import {
  getProjectMetrics,
  getTopIssues,
  getTopPullRequests,
} from "@/lib/pipelines/export/queries";
import { getContributorSummariesForInterval } from "@/lib/pipelines/summarize/queries";
import {
  IntervalType,
  TimeInterval,
  toDateString,
  isValidDateString,
  calculateIntervalBoundaries,
} from "@/lib/date-utils";
import { db } from "@/lib/data/db";
import { desc } from "drizzle-orm";
import { rawPullRequests } from "@/lib/data/schema";
import { UTCDate } from "@date-fns/utc";
import fs from "fs/promises";
import { getRepoFilePath } from "@/lib/fsHelpers";

export async function getLatestAvailableDate() {
  const date = await db
    .select({
      max: rawPullRequests.updatedAt,
    })
    .from(rawPullRequests)
    .orderBy(desc(rawPullRequests.updatedAt))
    .limit(1);

  return toDateString(date[0].max);
}

/**
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
    const monthPattern = /^\d{4}-\d{2}$/;
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

/**
 * Get metrics for repositories for a specific interval
 * @param date - Date string in format based on interval type
 * @param intervalType - Type of interval (day, week, month)
 * @returns Object with metrics for the specified interval
 */
export async function getMetricsForInterval(
  date: string,
  intervalType: IntervalType,
) {
  // Parse date based on interval type
  const interval = parseIntervalDate(date, intervalType);
  if (!interval) {
    throw new Error(
      `Invalid date format for ${intervalType} interval. Expected ${intervalType === "month" ? "YYYY-MM" : "YYYY-MM-DD"}`,
    );
  }

  const startDate = toDateString(interval.intervalStart);
  const endDate = toDateString(interval.intervalEnd);

  const repoMetrics = await getProjectMetrics({
    dateRange: {
      startDate,
      endDate,
    },
  });

  const topIssues = await getTopIssues(
    {
      dateRange: {
        startDate,
        endDate,
      },
    },
    100,
  );

  const topPullRequests = await getTopPullRequests(
    {
      dateRange: {
        startDate,
        endDate,
      },
    },
    100,
  );

  // deduplicate PRs that are both merged and new
  const totalPrs = [
    ...repoMetrics.pullRequests.mergedPRs,
    ...repoMetrics.pullRequests.newPRs,
  ];
  const uniquePrs = [...new Set(totalPrs.map((pr) => pr.id))];
  const totalIssues = [
    ...repoMetrics.issues.newIssues,
    ...repoMetrics.issues.closedIssues,
  ];
  const uniqueIssues = [...new Set(totalIssues.map((issue) => issue.id))];

  // Initialize detailed contributor summaries
  let detailedContributorSummaries: Record<string, string | null> = {};

  // Fetch contributor summaries if top contributors exist
  if (repoMetrics.topContributors && repoMetrics.topContributors.length > 0) {
    const usernames = repoMetrics.topContributors.map((c) => c.username);
    console.log(
      `[getMetricsForInterval] Attempting to fetch contributor summaries for ${usernames.length} users: ${usernames.join(", ")}`,
    );
    if (usernames.length > 0) {
      const summariesMap = await getContributorSummariesForInterval(
        usernames,
        interval,
      );
      detailedContributorSummaries = Object.fromEntries(summariesMap);
      console.log(
        `[getMetricsForInterval] Successfully fetched and processed ${summariesMap.size} contributor summaries.`,
      );
    } else {
      console.log(
        "[getMetricsForInterval] No usernames to fetch summaries for after mapping top contributors.",
      );
    }
  } else {
    console.log(
      "[getMetricsForInterval] No top contributors found, skipping fetch for detailed contributor summaries.",
    );
  }

  // Return all collected metrics
  return {
    date,
    interval,
    pullRequests: {
      new: repoMetrics.pullRequests.newPRs.length,
      merged: repoMetrics.pullRequests.mergedPRs.length,
      total: uniquePrs.length,
    },
    issues: {
      new: repoMetrics.issues.newIssues.length,
      closed: repoMetrics.issues.closedIssues.length,
      total: uniqueIssues.length,
    },
    activeContributors: repoMetrics.uniqueContributors,
    codeChanges: repoMetrics.codeChanges,
    topContributors: repoMetrics.topContributors,
    focusAreas: repoMetrics.focusAreas,
    topFilesChanged: repoMetrics.topFilesChanged,
    topIssues,
    topPullRequests,
    detailedContributorSummaries, // Add the new field here
  };
}

/**
 * Get daily metrics (backward compatibility)
 * @deprecated Use getMetricsForInterval with 'day' interval instead
 */
export async function getDailyMetrics(date: string) {
  return getMetricsForInterval(date, "day");
}

/**
 * Type definition for the interval metrics result
 */
export type IntervalMetrics = Awaited<ReturnType<typeof getMetricsForInterval>>;

/**
 * Type definition for the daily metrics result (backward compatibility)
 */
export type DailyMetrics = Awaited<ReturnType<typeof getDailyMetrics>>;

/**
 * Retrieves the content of a markdown summary file for a given date and interval type.
 * @param dateStr - The date string, formatted as YYYY-MM-DD for day/week, YYYY-MM for month.
 * @param intervalType - The type of interval (day, week, month).
 * @returns The markdown content as a string, or null if the file is not found or an error occurs.
 */
export async function getIntervalSummaryContent(
  dateStr: string,
  intervalType: IntervalType,
): Promise<string | null> {
  try {
    let actualDateForFileName: string;

    if (intervalType === "month") {
      // dateStr is YYYY-MM, summaries are saved as YYYY-MM-01.md
      actualDateForFileName = `${dateStr}-01`;
    } else {
      // For day and week, dateStr is already YYYY-MM-DD
      actualDateForFileName = dateStr;
    }

    const fileName = `${actualDateForFileName}.md`;
    const repoId = "elizaos_eliza"; // As per existing hardcoded path
    const outputDir = "data"; // Root directory for summaries relative to project

    const filePath = getRepoFilePath(
      outputDir,
      repoId,
      "summaries",
      intervalType,
      fileName,
    );

    // getRepoFilePath returns a path like 'data/elizaos_eliza/summaries/month/2023-01-01.md'
    // which fs.readFile can use relative to process.cwd()
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    // Check if error is an object and has a code property before accessing it
    if (error && typeof error === "object" && "code" in error) {
      if (error.code !== "ENOENT") {
        // File not found is expected, don't log error
        console.warn(
          `Error reading summary file for ${intervalType} ${dateStr}:`,
          error,
        );
      }
    } else {
      // Log unexpected error types
      console.warn(
        `Unexpected error reading summary file for ${intervalType} ${dateStr}:`,
        error,
      );
    }
    return null;
  }
}
