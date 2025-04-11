import { db } from "@/lib/data/db";
import { users, userTagScores, tags } from "@/lib/data/schema";
import { eq, and, inArray } from "drizzle-orm";
import { UserFocusAreaData, TagLevel } from "@/types/user-profile";
import { getTopUsersByScore } from "@/lib/data/user-daily-scores";
import { getDateRangeForPeriod } from "@/lib/data/helpers";

export type LeaderboardPeriod = "all" | "monthly" | "weekly";

/**
 * Get leaderboard users with aggregated scores for different time periods
 * Compatible with the UserFocusAreaData interface for seamless integration
 * Uses userDailyScores table for accurate time-based leaderboards
 *
 * @param period - Time period for filtering scores ('all', 'monthly', 'weekly')
 * @returns Array of users with their scores and tag data, sorted by score in descending order
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
): Promise<UserFocusAreaData[]> {
  // Get the date range for period filtering
  const { startDate, endDate } = getDateRangeForPeriod(period);

  // Get top users from userDailyScores for the specified period
  const topUsers = await getTopUsersByScore(
    startDate,
    endDate,
    50, // Get top 50 users
    "overall",
  );

  // Get usernames from top users to fetch their complete data
  const usernames = topUsers.map((user) => user.username);

  // If no users found from daily scores, fall back to all non-bot users
  let usersForLeaderboard = usernames;
  if (usersForLeaderboard.length === 0) {
    const allUsers = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.isBot, 0))
      .limit(50)
      .all();

    usersForLeaderboard = allUsers.map((user) => user.username);
  }

  // Fetch users basic info
  const usersData = await db
    .select()
    .from(users)
    .where(
      and(eq(users.isBot, 0), inArray(users.username, usersForLeaderboard)),
    );

  // Fetch tag scores for these users with their tag information
  const tagScoresData = await db
    .select({
      id: userTagScores.id,
      username: userTagScores.username,
      tag_name: tags.name,
      score: userTagScores.score,
      level: userTagScores.level,
      progress: userTagScores.progress,
    })
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(inArray(userTagScores.username, usersForLeaderboard));

  // Group tag scores by username for easy lookup
  const userTagScoresMap = new Map<string, typeof tagScoresData>();

  for (const tagScore of tagScoresData) {
    const username = tagScore.username;
    if (!userTagScoresMap.has(username)) {
      userTagScoresMap.set(username, []);
    }
    userTagScoresMap.get(username)?.push(tagScore);
  }

  // Create a map of the top users with their scores for quick lookup
  const userScoreMap = new Map(
    topUsers.map((user) => [user.username, user.totalScore]),
  );

  // Transform the results to match the UserFocusAreaData interface
  return usersData
    .map((user) => {
      // Extract and format tag scores
      const tagScores: Record<string, number> = {};
      const tagLevels: Record<string, TagLevel> = {};
      const tags: string[] = [];
      const focusAreas: [string, number][] = [];

      // Get tag scores for this user
      const userTags = userTagScoresMap.get(user.username) || [];

      // Process each tag score
      for (const tagScore of userTags) {
        // Skip if tag_name is null
        if (!tagScore.tag_name) continue;

        const tagName = tagScore.tag_name.toLowerCase();
        const score = Number(tagScore.score);

        // Store the tag score
        tagScores[tagName] = score;

        // Create a simplified tag level based on the score
        const level = Math.max(1, Math.floor(Math.log2(score + 1)));
        const nextLevelPoints = Math.pow(2, level + 1) - 1;
        const progress =
          (score - (Math.pow(2, level) - 1)) /
          (nextLevelPoints - (Math.pow(2, level) - 1));

        tagLevels[tagName] = {
          level,
          progress: Math.min(1, Math.max(0, progress)),
          points: score,
          points_next_level: nextLevelPoints,
        };

        tags.push(tagName);
        focusAreas.push([tagName, score]);
      }

      // Sort focus areas by score in descending order
      focusAreas.sort((a, b) => b[1] - a[1]);

      // Create a simplified placeholder for stats
      const placeholderStats = {
        total_prs: 0,
        merged_prs: 0,
        closed_prs: 0,
        total_files: 0,
        total_additions: 0,
        total_deletions: 0,
        files_by_type: {},
        prs_by_month: {},
      };

      const userScore = userScoreMap.get(user.username) || 0;

      return {
        username: user.username,
        avatarUrl: user.avatarUrl,
        tag_scores: tagScores,
        tag_levels: tagLevels,
        tags,
        stats: placeholderStats,
        focus_areas: focusAreas,
        score: userScore, // Add score directly to the object for easier sorting
        summary: `${user.username} has a total score of ${userScore.toFixed(0)}.`,
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by the period-specific score
}
