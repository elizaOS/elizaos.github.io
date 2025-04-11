import { db } from "./db";
import { users, userDailyScores } from "./schema";
import { desc, eq, and, gte, lte, sql, asc } from "drizzle-orm";
import { UTCDate } from "@date-fns/utc";
import { z } from "zod";
import { toDateString } from "@/lib/date-utils";
import { ScoreResult } from "@/lib/pipelines/contributors/scoring";
import {
  buildDateRangeCondition,
  formatPeriodLabel,
  generateScoreSelectFields,
} from "./helpers";

/**
 * User Daily Score Metrics Schema (matches scoring.ts ScoreResult)
 */
export const UserDailyScoreMetricsSchema = z.object({
  totalScore: z.number(),
  prScore: z.number(),
  issueScore: z.number(),
  reviewScore: z.number(),
  commentScore: z.number(),
  metrics: z.object({
    pullRequests: z.object({
      total: z.number(),
      merged: z.number(),
      open: z.number(),
      closed: z.number(),
    }),
    issues: z.object({
      total: z.number(),
      open: z.number(),
      closed: z.number(),
    }),
    reviews: z.object({
      total: z.number(),
      approved: z.number(),
      changesRequested: z.number(),
      commented: z.number(),
    }),
    comments: z.object({
      pullRequests: z.number(),
      issues: z.number(),
    }),
    codeChanges: z.object({
      additions: z.number(),
      deletions: z.number(),
      files: z.number(),
    }),
  }),
});

export type UserDailyScoreMetrics = z.infer<typeof UserDailyScoreMetricsSchema>;

/**
 * Interface for userDailyScores with typed metrics
 */
export interface UserDailyScore {
  id: string;
  username: string;
  date: string;
  timestamp: string;
  score: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
  metrics: UserDailyScoreMetrics;
  category: string;
  lastUpdated: string;
}

/**
 * Save daily score for a user
 * @param username - User's username
 * @param scoreData - Score data from scoring.ts
 * @param date - Optional date string (YYYY-MM-DD) - defaults to today
 * @param category - Optional category for the score - defaults to "overall"
 * @returns Result of the insert operation
 */
export async function saveUserDailyScore(
  username: string,
  scoreData: ScoreResult,
  date?: string,
  category = "overall",
): Promise<void> {
  const scoreDate = date || toDateString(new UTCDate());
  const id = `${username}_${scoreDate}_${category}`;

  // Check if user exists
  const userExists = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!userExists) {
    console.warn(`User ${username} not found, cannot save daily score`);
    return;
  }

  // Insert or update daily score
  await db
    .insert(userDailyScores)
    .values({
      id,
      username,
      date: scoreDate,
      timestamp: new UTCDate().toISOString(),
      score: scoreData.totalScore,
      prScore: scoreData.prScore,
      issueScore: scoreData.issueScore,
      reviewScore: scoreData.reviewScore,
      commentScore: scoreData.commentScore,
      metrics: JSON.stringify(scoreData),
      category,
    })
    .onConflictDoUpdate({
      target: userDailyScores.id,
      set: {
        score: scoreData.totalScore,
        prScore: scoreData.prScore,
        issueScore: scoreData.issueScore,
        reviewScore: scoreData.reviewScore,
        commentScore: scoreData.commentScore,
        metrics: JSON.stringify(scoreData),
        lastUpdated: sql`CURRENT_TIMESTAMP`,
      },
    })
    .run();
}

/**
 * Get daily scores for a user
 * @param username - User's username
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param category - Optional category filter
 * @returns Array of daily scores
 */
export async function getUserDailyScores(
  username: string,
  startDate?: string,
  endDate?: string,
  category?: string,
): Promise<UserDailyScore[]> {
  // Start with the basic query condition for username
  const conditions = [eq(userDailyScores.username, username)];

  // Add date range conditions using our helper
  conditions.push(
    ...buildDateRangeCondition(userDailyScores.date, startDate, endDate),
  );

  // Add category filter if provided
  if (category) {
    conditions.push(eq(userDailyScores.category, category));
  }

  // Execute the query with all conditions
  const results = await db
    .select()
    .from(userDailyScores)
    .where(and(...conditions))
    .orderBy(asc(userDailyScores.date))
    .all();

  // Parse the metrics JSON for each result
  return results.map((row) => ({
    ...row,
    // Ensure nullable fields are converted to their non-null types
    prScore: Number(row.prScore || 0),
    issueScore: Number(row.issueScore || 0),
    reviewScore: Number(row.reviewScore || 0),
    commentScore: Number(row.commentScore || 0),
    category: row.category || "overall",
    // Parse the metrics JSON string to an object
    metrics: JSON.parse(row.metrics),
  }));
}

/**
 * Get aggregated user score for a time period
 * @param username - User's username
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param category - Optional category filter
 * @returns Total score and component scores
 */
export async function getUserAggregatedScore(
  username: string,
  startDate?: string,
  endDate?: string,
  category = "overall",
): Promise<{
  totalScore: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
}> {
  // Start with the basic conditions
  const conditions = [
    eq(userDailyScores.username, username),
    eq(userDailyScores.category, category),
    ...buildDateRangeCondition(userDailyScores.date, startDate, endDate),
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
 * Get top users by score for a time period
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param limit - Maximum number of users to return (default: 10)
 * @param category - Optional category filter (default: "overall")
 * @returns Array of users with their scores, sorted by score
 */
export async function getTopUsersByScore(
  startDate?: string,
  endDate?: string,
  limit = 10,
  category = "overall",
): Promise<
  {
    username: string;
    totalScore: number;
    prScore: number;
    issueScore: number;
    reviewScore: number;
    commentScore: number;
  }[]
> {
  // Start with base conditions
  const conditions = [
    eq(userDailyScores.category, category),
    eq(users.isBot, 0), // Exclude bots
  ];

  // Add date conditions if provided
  if (startDate) {
    conditions.push(gte(userDailyScores.date, startDate));
  }

  if (endDate) {
    conditions.push(lte(userDailyScores.date, endDate));
  }

  const results = await db
    .select({
      username: userDailyScores.username,
      totalScore: sql`COALESCE(SUM(${userDailyScores.score}), 0)`.as(
        "totalScore",
      ),
      prScore: sql`COALESCE(SUM(${userDailyScores.prScore}), 0)`.as("prScore"),
      issueScore: sql`COALESCE(SUM(${userDailyScores.issueScore}), 0)`.as(
        "issueScore",
      ),
      reviewScore: sql`COALESCE(SUM(${userDailyScores.reviewScore}), 0)`.as(
        "reviewScore",
      ),
      commentScore: sql`COALESCE(SUM(${userDailyScores.commentScore}), 0)`.as(
        "commentScore",
      ),
    })
    .from(userDailyScores)
    .leftJoin(users, eq(userDailyScores.username, users.username))
    .where(and(...conditions))
    .groupBy(userDailyScores.username)
    .orderBy(desc(sql`totalScore`))
    .limit(limit)
    .all();

  return results.map((row) => ({
    username: row.username,
    totalScore: Number(row.totalScore || 0),
    prScore: Number(row.prScore || 0),
    issueScore: Number(row.issueScore || 0),
    reviewScore: Number(row.reviewScore || 0),
    commentScore: Number(row.commentScore || 0),
  }));
}

/**
 * Time period options for aggregation queries
 */
export type AggregationPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/**
 * Get scores aggregated by a specific time period
 * @param username - Optional username to filter by
 * @param period - Aggregation period (daily, weekly, monthly, quarterly, yearly)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param category - Optional category filter (default: "overall")
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of scores grouped by the specified period
 */
export async function getScoresByTimePeriod(
  username?: string,
  period: AggregationPeriod = "daily",
  startDate?: string,
  endDate?: string,
  category = "overall",
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
    eq(userDailyScores.category, category),
    ...buildDateRangeCondition(userDailyScores.date, startDate, endDate),
  ];

  // Add user filtering
  if (username) {
    conditions.push(eq(userDailyScores.username, username));
  } else {
    // Only include non-bot users
    conditions.push(eq(users.isBot, 0));
  }

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
      ...(username ? {} : { userCount: Number(row.userCount || 0) }),
    };
  });
}

/**
 * Get user score trend data showing progression over time
 * @param username - User's username
 * @param period - Aggregation period (daily, weekly, monthly, quarterly, yearly)
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @param category - Optional category filter (default: "overall")
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of scores over time with running totals
 */
export async function getUserScoreTrend(
  username: string,
  period: AggregationPeriod = "daily",
  startDate?: string,
  endDate?: string,
  category = "overall",
  limit = 100,
): Promise<
  {
    periodLabel: string;
    periodScore: number;
    cumulativeScore: number;
    breakdown: {
      prScore: number;
      issueScore: number;
      reviewScore: number;
      commentScore: number;
    };
  }[]
> {
  // Get scores by time period for this user
  const periodScores = await getScoresByTimePeriod(
    username,
    period,
    startDate,
    endDate,
    category,
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
 * @param category - Optional category filter (default: "overall")
 * @returns Comparative data for each user
 */
export async function compareUserScores(
  usernames: string[],
  period: AggregationPeriod = "monthly",
  startDate?: string,
  endDate?: string,
  category = "overall",
): Promise<
  {
    username: string;
    totalScore: number;
    scoreBreakdown: {
      prScore: number;
      issueScore: number;
      reviewScore: number;
      commentScore: number;
    };
    periodScores: {
      periodLabel: string;
      score: number;
    }[];
  }[]
> {
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
      category,
    );

    // Get period scores for trend data
    const periodScores = await getScoresByTimePeriod(
      username,
      period,
      startDate,
      endDate,
      category,
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
 * @param category - Optional category filter (default: "overall")
 * @returns Daily activity data suitable for heatmap visualization
 */
export async function getUserActivityHeatmap(
  username: string,
  startDate?: string,
  endDate?: string,
  category = "overall",
): Promise<
  {
    date: string;
    value: number;
    breakdown: {
      prScore: number;
      issueScore: number;
      reviewScore: number;
      commentScore: number;
    };
  }[]
> {
  // Get daily scores
  const dailyScores = await getUserDailyScores(
    username,
    startDate,
    endDate,
    category,
  );

  return dailyScores.map((score) => ({
    date: score.date,
    value: score.score,
    breakdown: {
      prScore: score.prScore,
      issueScore: score.issueScore,
      reviewScore: score.reviewScore,
      commentScore: score.commentScore,
    },
  }));
}
