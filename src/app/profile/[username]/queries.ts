import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  rawPullRequests,
  users,
  userTagScores,
  tags,
  userSummaries,
} from "@/lib/data/schema";
import { UTCDate } from "@date-fns/utc";
import { toDateString } from "@/lib/date-utils";
import { UserFocusAreaData, UserStats } from "@/types/user-profile";

/**
 * Get comprehensive user profile data
 * @param username - GitHub username of the user
 * @returns UserFocusAreaData object containing all profile information
 */
export async function getUserProfile(
  username: string,
): Promise<UserFocusAreaData | null> {
  // Get basic user details
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  // Get user tag scores with tag information
  const tagScoresData = await db
    .select({
      tag_name: tags.name,
      score: userTagScores.score,
      level: userTagScores.level,
      progress: userTagScores.progress,
      pointsToNext: userTagScores.pointsToNext,
    })
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(eq(userTagScores.username, username));

  // Process tag scores
  const tagScores: Record<string, number> = {};
  const tagLevels: Record<
    string,
    {
      level: number;
      progress: number;
      points: number;
      points_next_level: number;
    }
  > = {};
  const userTags: string[] = [];
  const focusAreas: [string, number][] = [];

  for (const tagScore of tagScoresData) {
    if (!tagScore.tag_name) continue;

    const tagName = tagScore.tag_name.toLowerCase();
    const score = Number(tagScore.score);

    tagScores[tagName] = score;
    userTags.push(tagName);
    focusAreas.push([tagName, score]);

    tagLevels[tagName] = {
      level: tagScore.level,
      progress: tagScore.progress,
      points: score,
      points_next_level: tagScore.pointsToNext + score,
    };
  }

  // Sort focus areas by score in descending order
  focusAreas.sort((a, b) => b[1] - a[1]);

  // Get most recent monthly and weekly summaries
  const monthlySummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "month"),
    ),
    orderBy: desc(userSummaries.date),
  });

  const weeklySummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "week"),
    ),
    orderBy: desc(userSummaries.date),
  });

  // Combine summaries, preferring monthly
  const summary =
    monthlySummary?.summary ||
    weeklySummary?.summary ||
    `${username}'s contribution profile`;

  // Get PR metrics
  const prMetrics = await db
    .select({
      total: count(),
      merged: sql<number>`SUM(CASE WHEN ${rawPullRequests.merged} = 1 THEN 1 ELSE 0 END)`,
      closed: sql<number>`SUM(CASE WHEN ${rawPullRequests.state} = 'CLOSED' AND ${rawPullRequests.merged} = 0 THEN 1 ELSE 0 END)`,
      additions: sql<number>`SUM(${rawPullRequests.additions})`,
      deletions: sql<number>`SUM(${rawPullRequests.deletions})`,
      changedFiles: sql<number>`SUM(${rawPullRequests.changedFiles})`,
    })
    .from(rawPullRequests)
    .where(eq(rawPullRequests.author, username))
    .get();

  // Get recent PRs - sorted with open first, then merged, then closed
  const recentPRs = await db.query.rawPullRequests.findMany({
    where: eq(rawPullRequests.author, username),
    orderBy: [
      sql`CASE WHEN ${rawPullRequests.state} = 'OPEN' THEN 0 ELSE 1 END`,
      desc(rawPullRequests.createdAt),
    ],
    limit: 10,
  });

  // Get files by type metrics
  const filesByTypeRows = await db
    .select({
      fileType: sql<string>`SUBSTR(${rawPullRequests.title}, INSTR(${rawPullRequests.title}, '.') + 1)`,
      count: count(),
    })
    .from(rawPullRequests)
    .where(
      and(
        eq(rawPullRequests.author, username),
        sql`INSTR(${rawPullRequests.title}, '.') > 0`,
      ),
    )
    .groupBy(sql`fileType`)
    .having(sql`fileType != '' AND length(fileType) < 10`)
    .all();

  // Process files by type
  const filesByType: Record<string, number> = {};
  for (const row of filesByTypeRows) {
    filesByType[row.fileType] = row.count;
  }

  // Get PRs by month
  const now = new UTCDate();
  const monthsAgo = new UTCDate(now);
  monthsAgo.setMonth(now.getMonth() - 11); // Last 12 months
  const monthsAgoStr = toDateString(monthsAgo);

  const prsByMonthRows = await db
    .select({
      month: sql<string>`SUBSTR(${rawPullRequests.createdAt}, 1, 7)`,
      count: count(),
    })
    .from(rawPullRequests)
    .where(
      and(
        eq(rawPullRequests.author, username),
        sql`${rawPullRequests.createdAt} >= ${monthsAgoStr}`,
      ),
    )
    .groupBy(sql`month`)
    .all();

  // Process PRs by month
  const prsByMonth: Record<string, number> = {};
  for (const row of prsByMonthRows) {
    prsByMonth[row.month] = row.count;
  }

  // Compile stats
  const stats: UserStats = {
    total_prs: prMetrics?.total || 0,
    merged_prs: prMetrics?.merged || 0,
    closed_prs: prMetrics?.closed || 0,
    total_files: prMetrics?.changedFiles || 0,
    total_additions: prMetrics?.additions || 0,
    total_deletions: prMetrics?.deletions || 0,
    files_by_type: filesByType,
    prs_by_month: prsByMonth,
  };

  return {
    username,
    tag_scores: tagScores,
    tag_levels: tagLevels,
    tags: userTags,
    stats,
    focus_areas: focusAreas,
    summary,
  };
}
