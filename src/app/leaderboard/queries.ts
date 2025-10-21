import { db } from "@/lib/data/db";
import { userTagScores, tags, userBadges } from "@/lib/data/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { getDateRangeForPeriod } from "@/lib/pipelines/queryHelpers";
import { getTopUsersByScore } from "@/lib/scoring/queries";
import { groupBy } from "@/lib/arrayHelpers";
import { LeaderboardPeriod, LeaderboardUser } from "@/components/leaderboard";
import { getUserWalletData } from "@/lib/walletLinking/queries";

export async function getAllTags() {
  const allTags = await db
    .select({
      name: tags.name,
      category: tags.category,
      description: tags.description,
    })
    .from(tags);
  return allTags;
}

/**
 * Get leaderboard users with aggregated scores for different time periods
 *
 * @param period - Time period for filtering scores ('all', 'monthly', 'weekly')
 * @returns Array of users with their scores and tag data, sorted by score in descending order
 */
export async function getLeaderboard(period: LeaderboardPeriod) {
  // Get the date range for period filtering
  const { startDate, endDate } = getDateRangeForPeriod(period);

  // Get all users with their scores for the specified period
  const topUsers = await getTopUsersByScore(startDate, endDate, null);

  const usernameList = topUsers.map((user) => user.username);

  // Fetch tag scores for these users with their tag information
  const tagScoresData = await db
    .select({
      username: userTagScores.username,
      tagName: userTagScores.tag,
      category: tags.category,
      score: userTagScores.score,
      level: userTagScores.level,
    })
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(inArray(userTagScores.username, usernameList));

  // Group tag scores by username for easy lookup
  const userTagScoresMap = groupBy(
    tagScoresData,
    (tagScore) => tagScore.username,
  );

  // Create a map of the top users with their scores for quick lookup
  const userScoreMap = new Map(
    topUsers.map((user) => [user.username, user.totalScore]),
  );

  // Fetch badge counts for these users
  const badgeCounts = await db
    .select({
      username: userBadges.username,
      count: sql<number>`COUNT(*)`,
    })
    .from(userBadges)
    .where(inArray(userBadges.username, usernameList))
    .groupBy(userBadges.username);

  // Create a map of badge counts for quick lookup
  const badgeCountMap = new Map(
    badgeCounts.map((bc) => [bc.username, bc.count]),
  );

  // Transform the results to match the UserFocusAreaData interface
  const usersFromDb = topUsers
    .map((user) => {
      const userTags = userTagScoresMap[user.username] || [];
      const userScore = userScoreMap.get(user.username) || 0;

      // Calculate total XP and level
      const totalXp = userTags.reduce((sum, tag) => sum + tag.score, 0);
      const totalLevel = userTags.reduce((sum, tag) => sum + tag.level, 0);

      return {
        username: user.username,
        avatarUrl: user.avatarUrl,
        allTags: userTags,
        points: userScore,
        totalXp,
        totalLevel,
        badgeCount: badgeCountMap.get(user.username) || 0,
      };
    })
    .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));

  const usersWithWalletData: LeaderboardUser[] = await Promise.all(
    usersFromDb.map(async (user) => {
      try {
        const walletData = await getUserWalletData(user.username);
        const linkedWallets = walletData?.wallets || [];
        return {
          ...user,
          linkedWallets,
        };
      } catch (error) {
        console.warn(
          `Failed to fetch wallet data for user ${user.username} in leaderboard:`,
          error,
        );
        return {
          ...user,
          linkedWallets: [],
        };
      }
    }),
  );

  return {
    users: usersWithWalletData,
    startDate,
    endDate,
  };
}
