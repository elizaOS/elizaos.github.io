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
import {
  TimelineActivityData,
  ContributorActivityHour,
} from "@/lib/data/types";
import * as schema from "@/lib/data/schema";
import { sql } from "drizzle-orm";
import { addDays } from "date-fns"; // For calculating next day

export async function getLatestAvailableDate() {
  const date = await db
    .select({
      max: schema.rawPullRequests.updatedAt,
    })
    .from(schema.rawPullRequests)
    .orderBy(desc(schema.rawPullRequests.updatedAt))
    .limit(1);

  return toDateString(date[0].max);
}

export async function getTimelineActivityData(
  targetDate: string, // Expects YYYY-MM-DD
  intervalType: IntervalType, // 'day', 'week', 'month' - though current use case is 'day'
): Promise<TimelineActivityData> {
  if (intervalType !== "day") {
    // For now, this function is specifically designed for daily activity
    console.warn(
      `getTimelineActivityData called with intervalType '${intervalType}', but currently only supports 'day'. Proceeding as 'day'.`,
    );
  }

  const startDate = new UTCDate(targetDate); // Sets time to 00:00:00.000Z for that date
  const nextDayDate = addDays(startDate, 1); // Start of the next day

  const startOfDayISO = startDate.toISOString();
  const startOfNextDayISO = nextDayDate.toISOString();

  // Define the raw SQL query using UNION ALL
  // Ensure all selected columns are aliased consistently (login, avatarUrl, activityTime)
  // Also, ensure that users.avatarUrl can be null and handle it.
  const queryString = sql`
    SELECT users.username as login, users.avatar_url as avatarUrl, raw_commits.committed_date as activityTime
    FROM ${schema.rawCommits} raw_commits
    JOIN ${schema.users} users ON raw_commits.author = users.username
    WHERE raw_commits.committed_date >= ${startOfDayISO} AND raw_commits.committed_date < ${startOfNextDayISO}
    UNION ALL
    SELECT users.username as login, users.avatar_url as avatarUrl, raw_pull_requests.created_at as activityTime
    FROM ${schema.rawPullRequests} raw_pull_requests
    JOIN ${schema.users} users ON raw_pull_requests.author = users.username
    WHERE raw_pull_requests.created_at >= ${startOfDayISO} AND raw_pull_requests.created_at < ${startOfNextDayISO}
    UNION ALL
    SELECT users.username as login, users.avatar_url as avatarUrl, raw_issues.created_at as activityTime
    FROM ${schema.rawIssues} raw_issues
    JOIN ${schema.users} users ON raw_issues.author = users.username
    WHERE raw_issues.created_at >= ${startOfDayISO} AND raw_issues.created_at < ${startOfNextDayISO}
    UNION ALL
    SELECT users.username as login, users.avatar_url as avatarUrl, pr_reviews.created_at as activityTime
    FROM ${schema.prReviews} pr_reviews
    JOIN ${schema.users} users ON pr_reviews.author = users.username
    WHERE pr_reviews.created_at >= ${startOfDayISO} AND pr_reviews.created_at < ${startOfNextDayISO}
    UNION ALL
    SELECT users.username as login, users.avatar_url as avatarUrl, pr_comments.created_at as activityTime
    FROM ${schema.prComments} pr_comments
    JOIN ${schema.users} users ON pr_comments.author = users.username
    WHERE pr_comments.created_at >= ${startOfDayISO} AND pr_comments.created_at < ${startOfNextDayISO}
    UNION ALL
    SELECT users.username as login, users.avatar_url as avatarUrl, issue_comments.created_at as activityTime
    FROM ${schema.issueComments} issue_comments
    JOIN ${schema.users} users ON issue_comments.author = users.username
    WHERE issue_comments.created_at >= ${startOfDayISO} AND issue_comments.created_at < ${startOfNextDayISO};
  `;

  type RawActivityResult = {
    login: string;
    avatarUrl: string | null;
    activityTime: string; // ISO date string
  };

  // Execute the raw query. db.execute should be used for raw SQL.
  // The result type from db.execute is an array of objects, but the exact shape depends on the driver.
  // For bun:sqlite, it should be `unknown[]` or `Record<string, unknown>[]`.
  // We cast it to RawActivityResult[] for easier processing.
  const results = (await db.execute(queryString)) as RawActivityResult[];

  if (!results || results.length === 0) {
    return [];
  }

  const processedActivities = new Map<string, ContributorActivityHour>();

  for (const row of results) {
    if (!row.login || !row.activityTime) { // Basic validation
        console.warn("Skipping row with missing login or activityTime:", row);
        continue;
    }
    try {
      const activityDate = new UTCDate(row.activityTime);
      const hour = activityDate.getUTCHours();
      const key = `${row.login}-${hour}`;

      if (!processedActivities.has(key)) {
        processedActivities.set(key, {
          login: row.login,
          avatarUrl: row.avatarUrl ?? undefined, // Ensure it's string | undefined
          hour: hour,
        });
      }
    } catch (e) {
        console.error("Error processing activity row:", row, e);
    }
  }

  return Array.from(processedActivities.values());
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
