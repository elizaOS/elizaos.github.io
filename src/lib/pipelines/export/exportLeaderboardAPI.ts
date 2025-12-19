import { db } from "@/lib/data/db";
import { users, userDailyScores, walletAddresses } from "@/lib/data/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { toDateString } from "@/lib/date-utils";
import { writeToFile } from "@/lib/fsHelpers";
import { join } from "path";
import { mkdirSync } from "fs";
import { generateScoreSelectFields } from "@/lib/scoring/queries";
import { buildCommonWhereConditions } from "@/lib/pipelines/queryHelpers";
import { UTCDate } from "@date-fns/utc";
import { Logger } from "@/lib/logger";

/**
 * Leaderboard entry structure for API responses
 */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
  wallets: {
    solana?: string;
    ethereum?: string;
  };
}

/**
 * Leaderboard API response structure
 */
export interface LeaderboardAPIResponse {
  version: "1.0";
  period: "monthly" | "weekly" | "lifetime";
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalUsers: number;
  leaderboard: LeaderboardEntry[];
}

/**
 * Get wallet addresses for users and format them by chain
 */
async function getUserWallets(
  usernames: string[],
): Promise<Map<string, { solana?: string; ethereum?: string }>> {
  if (usernames.length === 0) {
    return new Map();
  }

  const wallets = await db
    .select({
      userId: walletAddresses.userId,
      chainId: walletAddresses.chainId,
      accountAddress: walletAddresses.accountAddress,
      isPrimary: walletAddresses.isPrimary,
    })
    .from(walletAddresses)
    .where(
      and(
        sql`${walletAddresses.userId} IN (${sql.join(
          usernames.map((u) => sql`${u}`),
          sql`, `,
        )})`,
        eq(walletAddresses.isActive, true),
      ),
    )
    .all();

  const walletMap = new Map<string, { solana?: string; ethereum?: string }>();

  for (const wallet of wallets) {
    const userId = wallet.userId;
    const existing = walletMap.get(userId) || {};

    // Map chain IDs to readable names
    // Ethereum uses CAIP-2 format: eip155:1
    // Solana uses various chain IDs
    if (wallet.chainId.startsWith("eip155:")) {
      // Ethereum - prefer primary wallet if multiple exist
      if (!existing.ethereum || wallet.isPrimary) {
        existing.ethereum = wallet.accountAddress;
      }
    } else if (
      wallet.chainId.includes("solana") ||
      wallet.chainId === "mainnet-beta"
    ) {
      // Solana - prefer primary wallet if multiple exist
      if (!existing.solana || wallet.isPrimary) {
        existing.solana = wallet.accountAddress;
      }
    }

    walletMap.set(userId, existing);
  }

  return walletMap;
}

/**
 * Get total count of users matching the criteria (for pagination)
 */
async function getTotalUserCount(
  startDate?: string,
  endDate?: string,
): Promise<number> {
  const conditions = [
    eq(users.isBot, 0),
    eq(userDailyScores.category, "day"),
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
  ];

  const result = await db
    .select({ count: sql<number>`count(distinct ${userDailyScores.username})` })
    .from(userDailyScores)
    .innerJoin(users, eq(userDailyScores.username, users.username))
    .where(and(...conditions))
    .get();

  return result?.count ?? 0;
}

/**
 * Get leaderboard data for a specific time period
 */
async function getLeaderboardData(
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<LeaderboardEntry[]> {
  // Build conditions
  const conditions = [
    eq(users.isBot, 0), // Exclude bots
    eq(userDailyScores.category, "day"),
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
  ];

  // Generate score fields
  const scoreFields = generateScoreSelectFields(userDailyScores);

  // Query top users by score
  const baseQuery = db
    .select({
      username: userDailyScores.username,
      avatarUrl: users.avatarUrl,
      ...scoreFields,
    })
    .from(userDailyScores)
    .innerJoin(users, eq(userDailyScores.username, users.username))
    .where(and(...conditions))
    .groupBy(userDailyScores.username)
    .orderBy(desc(scoreFields.totalScore));

  // Apply limit if specified
  const results = limit
    ? await baseQuery.limit(limit).all()
    : await baseQuery.all();

  // Get wallet addresses for all users
  const usernames = results.map((r) => r.username);
  const walletMap = await getUserWallets(usernames);

  // Format results with ranks and wallets
  return results.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    avatarUrl: row.avatarUrl || "",
    score: Number(row.totalScore || 0),
    prScore: Number(row.prScore || 0),
    issueScore: Number(row.issueScore || 0),
    reviewScore: Number(row.reviewScore || 0),
    commentScore: Number(row.commentScore || 0),
    wallets: walletMap.get(row.username) || {},
  }));
}

/**
 * Calculate date ranges for different periods
 */
function calculateDateRange(
  period: "monthly" | "weekly" | "lifetime",
  contributionStartDate: string,
): {
  startDate: string;
  endDate: string;
} {
  const now = new UTCDate();
  const endDate = toDateString(now);

  switch (period) {
    case "monthly": {
      // Start of current month (same as leaderboard frontend)
      const startOfMonth = new UTCDate(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toDateString(startOfMonth), endDate };
    }
    case "weekly": {
      // Start of current week - Sunday as first day (same as leaderboard frontend)
      const day = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const startOfWeek = new UTCDate(now);
      startOfWeek.setDate(now.getDate() - day);
      return { startDate: toDateString(startOfWeek), endDate };
    }
    case "lifetime": {
      // Use config value for fork-friendliness
      return { startDate: contributionStartDate, endDate };
    }
  }
}

/**
 * Export leaderboard data as JSON API endpoint
 */
export async function exportLeaderboardAPI(
  outputDir: string,
  period: "monthly" | "weekly" | "lifetime",
  options?: {
    limit?: number;
    contributionStartDate: string;
    logger?: Logger;
  },
): Promise<void> {
  const logger = options?.logger;
  const limit = options?.limit;
  const contributionStartDate = options?.contributionStartDate ?? "2024-10-15";

  logger?.info(`Generating ${period} leaderboard API endpoint...`);

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(
    period,
    contributionStartDate,
  );

  // Get total count of users
  const totalCount = await getTotalUserCount(startDate, endDate);

  // Get leaderboard data (top N if limit specified)
  const leaderboard = await getLeaderboardData(startDate, endDate, limit);

  // Build response
  const response: LeaderboardAPIResponse = {
    version: "1.0",
    period,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    totalUsers: totalCount,
    leaderboard,
  };

  // Create API directory if it doesn't exist
  const apiDir = join(outputDir, "api");
  mkdirSync(apiDir, { recursive: true });

  // Write JSON file
  const filename = `leaderboard-${period}.json`;
  const outputPath = join(apiDir, filename);
  await writeToFile(outputPath, JSON.stringify(response, null, 2));

  logger?.info(`✓ Exported ${period} leaderboard to ${outputPath}`, {
    totalUsers: response.totalUsers,
    returnedUsers: leaderboard.length,
    topUser: leaderboard[0]?.username,
    topScore: leaderboard[0]?.score,
  });
}

/**
 * Export all leaderboard API endpoints
 */
export async function exportAllLeaderboardAPIs(
  outputDir: string,
  options?: {
    limit?: number;
    contributionStartDate: string;
    logger?: Logger;
  },
): Promise<void> {
  const logger = options?.logger;
  logger?.info("Exporting all leaderboard API endpoints...");

  // Export all three periods
  await exportLeaderboardAPI(outputDir, "monthly", options);
  await exportLeaderboardAPI(outputDir, "weekly", options);
  await exportLeaderboardAPI(outputDir, "lifetime", options);

  logger?.info("✓ All leaderboard API endpoints exported successfully");
}
