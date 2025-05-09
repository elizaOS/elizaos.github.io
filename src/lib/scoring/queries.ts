import { db } from "@/lib/data/db";
import { users, userDailyScores } from "@/lib/data/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import {
  buildCommonWhereConditions,
  formatPeriodLabel,
} from "@/lib/pipelines/queryHelpers";
import { AggregationPeriod } from "./types";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { getUserDailyScores } from "./storage";
import { generateDaysInRange } from "../date-utils";

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
    prScore: SQLiteColumn;
    issueScore: SQLiteColumn;
    reviewScore: SQLiteColumn;
    commentScore: SQLiteColumn;
  },
>(table: T) {
  return {
    totalScore: sql<number>`COALESCE(SUM(${table.score}), 0)`,
    prScore: sql<number>`COALESCE(SUM(${table.prScore}), 0)`,
    issueScore: sql<number>`COALESCE(SUM(${table.issueScore}), 0)`,
    reviewScore: sql<number>`COALESCE(SUM(${table.reviewScore}), 0)`,
    commentScore: sql<number>`COALESCE(SUM(${table.commentScore}), 0)`,
  };
}
/**
 * Get aggregated user score for a time period
 * @param username - User's username
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Total score and component scores
 */
export async function getUserAggregatedScore(
  username: string,
  startDate?: string,
  endDate?: string,
) {
  // Start with the basic conditions
  const conditions = [
    eq(userDailyScores.username, username),
    eq(userDailyScores.category, "day"),
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
  ];

  // Generate score fields using our helper
  const scoreFields = generateScoreSelectFields(userDailyScores);

  const result = await db
    .select(scoreFields)
    .from(userDailyScores)
    .where(and(...conditions))
    .get();

  // Convert SQL number results to regular numbers
  return {
    totalScore: Number(result?.totalScore || 0),
    prScore: Number(result?.prScore || 0),
    issueScore: Number(result?.issueScore || 0),
    reviewScore: Number(result?.reviewScore || 0),
    commentScore: Number(result?.commentScore || 0),
  };
}

/**
 * Get scores aggregated by a specific time period
 * @param username - Optional username to filter by
 * @param period - Aggregation period (daily, weekly, monthly, quarterly, yearly)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of scores grouped by the specified period
 */
export async function getScoresByTimePeriod(
  username: string,
  period: AggregationPeriod = "daily",
  startDate?: string,
  endDate?: string,
  limit = 100,
): Promise<
  {
    periodLabel: string;
    totalScore: number;
    prScore: number;
    issueScore: number;
    reviewScore: number;
    commentScore: number;
    userCount?: number;
  }[]
> {
  // Start with base conditions
  const conditions = [
    eq(userDailyScores.username, username),
    eq(userDailyScores.category, "day"),
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
  ];

  // Format period label using the helper
  const periodLabelExpr = formatPeriodLabel(userDailyScores.date, period);

  // Generate score fields using our helper
  const scoreFields = generateScoreSelectFields(userDailyScores);

  const userCountExpr = username
    ? sql<number>`1` // If username is specified, we don't need user count
    : sql<number>`COUNT(DISTINCT ${userDailyScores.username})`;

  const results = await db
    .select({
      periodLabel: periodLabelExpr,
      ...scoreFields,
      userCount: userCountExpr,
    })
    .from(userDailyScores)
    .leftJoin(users, eq(userDailyScores.username, users.username))
    .where(and(...conditions))
    .groupBy(periodLabelExpr)
    .orderBy(asc(periodLabelExpr))
    .limit(limit)
    .all();

  return results.map((row) => {
    // Ensure all number fields are properly converted
    return {
      periodLabel: row.periodLabel,
      totalScore: Number(row.totalScore || 0),
      prScore: Number(row.prScore || 0),
      issueScore: Number(row.issueScore || 0),
      reviewScore: Number(row.reviewScore || 0),
      commentScore: Number(row.commentScore || 0),
    };
  });
}

/**
 * Get user score trend data showing progression over time
 * @param username - User's username
 * @param period - Aggregation period (daily, weekly, monthly, quarterly, yearly)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of scores over time with running totals
 */
export async function getUserScoreTrend(
  username: string,
  period: AggregationPeriod = "daily",
  startDate?: string,
  endDate?: string,
  limit = 100,
) {
  // Get scores by time period for this user
  const periodScores = await getScoresByTimePeriod(
    username,
    period,
    startDate,
    endDate,
    limit,
  );

  // Calculate cumulative scores
  let runningTotal = 0;
  return periodScores.map((score) => {
    runningTotal += score.totalScore;
    return {
      periodLabel: score.periodLabel,
      periodScore: score.totalScore,
      cumulativeScore: runningTotal,
      breakdown: {
        prScore: score.prScore,
        issueScore: score.issueScore,
        reviewScore: score.reviewScore,
        commentScore: score.commentScore,
      },
    };
  });
}

/**
 * Compare scores between users or teams
 * @param usernames - Array of usernames to compare
 * @param period - Aggregation period (daily, weekly, monthly, quarterly, yearly)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Comparative data for each user
 */
export async function compareUserScores(
  usernames: string[],
  period: AggregationPeriod = "monthly",
  startDate?: string,
  endDate?: string,
) {
  // Ensure we have valid usernames
  if (!usernames.length) {
    return [];
  }

  // Get aggregated scores for each user
  const userScorePromises = usernames.map(async (username) => {
    // Get total aggregated score
    const aggregatedScore = await getUserAggregatedScore(
      username,
      startDate,
      endDate,
    );

    // Get period scores for trend data
    const periodScores = await getScoresByTimePeriod(
      username,
      period,
      startDate,
      endDate,
    );

    return {
      username,
      totalScore: aggregatedScore.totalScore,
      scoreBreakdown: {
        prScore: aggregatedScore.prScore,
        issueScore: aggregatedScore.issueScore,
        reviewScore: aggregatedScore.reviewScore,
        commentScore: aggregatedScore.commentScore,
      },
      periodScores: periodScores.map((ps) => ({
        periodLabel: ps.periodLabel,
        score: ps.totalScore,
      })),
    };
  });

  const results = await Promise.all(userScorePromises);

  // Sort by total score, descending
  return results.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get activity heatmap data for visualizing user activity patterns
 * @param username - User's username
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Daily activity data suitable for heatmap visualization
 */

export async function getUserActivityHeatmaps(
  username: string,
  startDate: string,
  endDate: string,
) {
  const allDates = generateDaysInRange(startDate, endDate);

  // Get daily scores
  const dailyScores = await getUserDailyScores(username, startDate, endDate);

  const scoreMap = new Map(dailyScores.map((s) => [s.date, s]));

  return allDates.map((date) => ({
    date,
    value: Number(scoreMap.get(date)?.score || 0),
    metrics: scoreMap.get(date)?.metrics,
    breakdown: {
      prScore: Number(scoreMap.get(date)?.prScore || 0),
      issueScore: Number(scoreMap.get(date)?.issueScore || 0),
      reviewScore: Number(scoreMap.get(date)?.reviewScore || 0),
      commentScore: Number(scoreMap.get(date)?.commentScore || 0),
    },
  }));
}

export type UserActivityHeatmap = Awaited<
  ReturnType<typeof getUserActivityHeatmaps>
>[number];

export async function getTopUsersByScore(
  startDate?: string,
  endDate?: string,
  limit?: number | null,
) {
  // Start with base conditions
  const conditions = [
    eq(users.isBot, 0), // Exclude bots
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
  ];

  // Generate score fields using our helper
  const scoreFields = generateScoreSelectFields(userDailyScores);

  // Build the base query
  const baseQuery = db
    .select({
      username: userDailyScores.username,
      avatarUrl: users.avatarUrl,
      ...scoreFields,
    })
    .from(userDailyScores)
    .leftJoin(users, eq(userDailyScores.username, users.username))
    .where(and(...conditions))
    .groupBy(userDailyScores.username)
    .orderBy(desc(scoreFields.totalScore));

  // Conditionally apply the limit
  let finalQuery;
  if (typeof limit === "number" && limit > 0) {
    finalQuery = baseQuery.limit(limit);
  } else {
    finalQuery = baseQuery; // No limit is applied if limit is null, undefined, 0, or negative
  }

  const results = finalQuery.all();

  return results;
}
