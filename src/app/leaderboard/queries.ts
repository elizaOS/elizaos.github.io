import { db } from "@/lib/data/db";
import { userTagScores, tags } from "@/lib/data/schema";
import { eq, inArray } from "drizzle-orm";
import { getDateRangeForPeriod } from "@/lib/pipelines/queryHelpers";
import { getTopUsersByScore } from "@/lib/scoring/queries";
import { groupBy } from "@/lib/arrayHelpers";
import { LeaderboardPeriod, LeaderboardUser } from "@/components/leaderboard";
import { getCachedUserWalletData } from "@/lib/walletLinking/getUserWalletAddresses";

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
      };
    })
    .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));

  const usersWithWalletData: LeaderboardUser[] = await Promise.all(
    usersFromDb.map(async (user) => {
      try {
        const walletData = await getCachedUserWalletData(user.username);
        const ethAddress = walletData?.wallets.find(
          (w) => w.chain === "ethereum",
        )?.address;
        const solAddress = walletData?.wallets.find(
          (w) => w.chain === "solana",
        )?.address;
        return {
          ...user,
          ethAddress: ethAddress || undefined,
          solAddress: solAddress || undefined,
        };
      } catch (error) {
        console.warn(
          `Failed to fetch wallet data for user ${user.username} in leaderboard:`,
          error,
        );
        return {
          ...user,
          ethAddress: undefined,
          solAddress: undefined,
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
