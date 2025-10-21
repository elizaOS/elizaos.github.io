import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  rawPullRequests,
  users,
  userTagScores,
  tags,
  userSummaries,
  userBadges,
} from "@/lib/data/schema";
import { calculateDateRange, IntervalType } from "@/lib/date-utils";
import {
  getUserAggregatedScore,
  getUserActivityHeatmaps,
} from "@/lib/scoring/queries";
import { TagType } from "@/lib/scoring/types";
import { getUserWalletData } from "@/lib/walletLinking/queries";
import { UserBadge } from "@/lib/badges/types";

export async function getUserTags(username: string) {
  const tagSelectFields = {
    tagName: userTagScores.tag,
    category: tags.category,
    score: userTagScores.score,
    level: userTagScores.level,
    progress: userTagScores.progress,
    pointsToNext: userTagScores.pointsToNext,
  };
  // Get user tag scores with tag information and sort at the database level
  const roleTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.ROLE),
      ),
    )
    .orderBy(desc(userTagScores.score));

  const skillTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.TECH),
      ),
    )
    .orderBy(desc(userTagScores.score));

  const focusAreaTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.AREA),
      ),
    )
    .orderBy(desc(userTagScores.score));

  // Calculate totals
  const totalXp = [...focusAreaTags, ...roleTags, ...skillTags].reduce(
    (sum, tag) => sum + Number(tag.score),
    0,
  );
  const totalLevel = [...focusAreaTags, ...roleTags, ...skillTags].reduce(
    (sum, tag) => sum + tag.level,
    0,
  );

  return {
    roleTags,
    skillTags,
    focusAreaTags,
    totalXp,
    totalLevel,
  };
}
/**
 * Get all summaries for a user based on the interval type.
 * @param username - GitHub username of the user
 * @param intervalType - 'month' or 'week'
 * @returns Array of summaries ordered by date descending
 */
export async function getUserSummaries(
  username: string,
  intervalType: IntervalType,
  limit?: number,
) {
  const summaries = await db.query.userSummaries.findMany({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, intervalType),
    ),
    orderBy: desc(userSummaries.date),
    limit: limit,
    columns: {
      date: true,
      summary: true,
    },
  });
  return summaries.filter((summary) => !!summary.summary);
}

// Define an extended type for the profile page data
// This combines your existing return type with new wallet fields
export type UserProfileData = NonNullable<
  Awaited<ReturnType<typeof getUserProfile>>
>;

export async function getUserProfile(username: string) {
  // Get basic user details
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  // Get user tags data
  const tagsData = await getUserTags(username);

  // Get all monthly and 12 most recent weekly summaries
  const monthlySummaries = await getUserSummaries(username, "month");
  const weeklySummaries = await getUserSummaries(username, "week", 12);
  // Get PR metrics
  const prStats = await db
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

  // Get user's overall score
  const userScore = await getUserAggregatedScore(username);

  // Get daily activity metrics for the last 30 days
  const { startDate, endDate } = calculateDateRange({ days: 30 });

  const dailyActivity = await getUserActivityHeatmaps(
    username,
    startDate,
    endDate,
  );

  // Get wallet addresses
  const walletData = await getUserWalletData(user.username);
  return {
    username,
    score: userScore.totalScore,
    monthlySummaries,
    weeklySummaries,
    roleTags: tagsData.roleTags,
    skillTags: tagsData.skillTags,
    focusAreaTags: tagsData.focusAreaTags,
    stats: {
      additions: prStats?.additions || 0,
      deletions: prStats?.deletions || 0,
      changedFiles: prStats?.changedFiles || 0,
      totalPrs: prStats?.total || 0,
      mergedPrs: prStats?.merged || 0,
      closedPrs: prStats?.closed || 0,
    },
    totalXp: tagsData.totalXp,
    totalLevel: tagsData.totalLevel,
    dailyActivity,
    linkedWallets: walletData?.wallets || [],
  };
}

/**
 * Get all badges for a user
 * @param username - GitHub username
 * @returns Array of user badges ordered by earned date descending
 */
export async function getUserBadgesForProfile(
  username: string,
): Promise<UserBadge[]> {
  const badges = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.username, username))
    .orderBy(desc(userBadges.earnedAt))
    .all();

  return badges as UserBadge[];
}

/**
 * Get badge progress values for a user
 * Returns current progress values for all badge types
 */
export async function getUserBadgeProgress(
  username: string,
): Promise<Record<string, number>> {
  const { checkAllBadges } = await import("@/lib/badges/checker");

  // Get current badge awards (includes trigger values)
  const badgeAwards = await checkAllBadges(username);

  // Convert to progress map
  const progress: Record<string, number> = {};
  for (const award of badgeAwards) {
    progress[award.badgeType] = award.triggerValue;
  }

  return progress;
}
