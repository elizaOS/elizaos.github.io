import {
  getRepoMetrics,
  getTopIssues,
  getTopPullRequests,
} from "@/lib/pipelines/export/queries";
import { getContributorSummariesForInterval } from "@/lib/pipelines/summarize/queries";
import {
  IntervalType,
  parseIntervalDate,
  toDateString,
} from "@/lib/date-utils";
import { db } from "@/lib/data/db";
import { desc } from "drizzle-orm";
import { rawPullRequests } from "@/lib/data/schema";
import { and, eq } from "drizzle-orm";
import { overallSummaries } from "@/lib/data/schema";

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

  const repoMetrics = await getRepoMetrics({
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
    let queryDate: string;

    if (intervalType === "month") {
      // dateStr is YYYY-MM, summaries are saved with the first day of the month
      queryDate = `${dateStr}-01`;
    } else {
      // For day and week, dateStr is already YYYY-MM-DD
      queryDate = dateStr;
    }

    const result = await db.query.overallSummaries.findFirst({
      where: and(
        eq(overallSummaries.date, queryDate),
        eq(overallSummaries.intervalType, intervalType),
      ),
    });

    return result?.summary ?? null;
  } catch (error) {
    console.warn(
      `Error reading summary from DB for ${intervalType} ${dateStr}:`,
      error,
    );
    return null;
  }
}
