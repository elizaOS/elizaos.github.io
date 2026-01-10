import { db } from "@/lib/data/db";
import {
  users,
  userDailyScores,
  walletAddresses,
  userTagScores,
  userBadges,
} from "@/lib/data/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { toDateString } from "@/lib/date-utils";
import { writeToFile } from "@/lib/fsHelpers";
import { join } from "path";
import { mkdirSync } from "fs";
import { generateScoreSelectFields } from "@/lib/scoring/queries";
import { buildCommonWhereConditions } from "@/lib/pipelines/queryHelpers";
import { UTCDate } from "@date-fns/utc";
import { Logger } from "@/lib/logger";

/**
 * Contributor profile with substance over statistics
 */
export interface ContributorProfile {
  contributorType: "author" | "reviewer" | "maintainer" | "collaborator"; // Derived from behavior
  prMergeRate: number; // Quality indicator (0-100)
  reviewActivity: "high" | "medium" | "low"; // Collaboration level
  recentSummary?: string; // Latest AI-generated summary excerpt
}

/**
 * Links to detailed contributor information
 */
export interface ContributorLinks {
  profile: string; // Link to full profile page (UI)
  profileApi: string; // Link to profile JSON API endpoint
  summary: string; // Link to latest summary
  github: string; // GitHub profile
}

/**
 * Detailed focus area with ranking and percentage
 */
export interface FocusAreaDetail {
  tag: string;
  score: number;
  percentage: number; // % of contributor's total tag score
  rank: number; // Rank within this focus area (1 = highest)
  totalInArea: number; // Total contributors in this area
}

/**
 * MMORPG-style score breakdown
 */
export interface ScoreBreakdown {
  total: number;
  distribution: {
    prs: { score: number; percentage: number; label: string };
    issues: { score: number; percentage: number; label: string };
    reviews: { score: number; percentage: number; label: string };
    comments: { score: number; percentage: number; label: string };
  };
  tier: "beginner" | "regular" | "active" | "veteran" | "elite" | "legend";
  percentile: number;
  characterClass: string;
}

/**
 * Leaderboard entry structure for API responses
 */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  characterClass: string; // Top-level for quick access (Builder, Hunter, Scribe, etc.)
  tier: ScoreBreakdown["tier"]; // Top-level for quick access (beginner → legend)
  score: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
  wallets: {
    solana?: string;
    ethereum?: string;
  };
  focusAreas?: FocusAreaDetail[]; // Top 3 expertise areas with rankings
  achievements?: {
    type: string;
    tier: string;
    earnedAt: string;
  }[];
  profile?: ContributorProfile; // Qualitative signals, not counts
  scoreBreakdown?: ScoreBreakdown; // Full MMORPG character sheet (detailed breakdown)
  links?: ContributorLinks; // Deep links for more context (requires SITE_URL)
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
 * Calculate focus area rankings across all contributors
 * Returns a map of tag -> username -> { rank, total }
 */
function calculateFocusAreaRankings(
  tagScores: Array<{ username: string; tag: string; score: number }>,
): Map<string, Map<string, { rank: number; total: number }>> {
  const rankingsMap = new Map<
    string,
    Map<string, { rank: number; total: number }>
  >();

  // Group scores by tag
  const tagGroups = new Map<
    string,
    Array<{ username: string; score: number }>
  >();

  for (const entry of tagScores) {
    if (!tagGroups.has(entry.tag)) {
      tagGroups.set(entry.tag, []);
    }
    tagGroups.get(entry.tag)!.push({
      username: entry.username,
      score: entry.score,
    });
  }

  // Calculate rankings within each tag
  for (const [tag, contributors] of tagGroups.entries()) {
    // Sort by score descending
    const sorted = contributors.sort((a, b) => b.score - a.score);
    const total = sorted.length;

    const tagRankings = new Map<string, { rank: number; total: number }>();

    // Assign ranks (1-based)
    sorted.forEach((contributor, index) => {
      tagRankings.set(contributor.username, {
        rank: index + 1,
        total,
      });
    });

    rankingsMap.set(tag, tagRankings);
  }

  return rankingsMap;
}

/**
 * Get top expertise areas (focus areas) for users with GLOBAL rankings and percentages
 * Rankings are calculated across ALL users, not just the requested subset
 */
async function getUserFocusAreas(
  usernames: string[],
  topN: number = 3,
): Promise<Map<string, FocusAreaDetail[]>> {
  if (usernames.length === 0) {
    return new Map();
  }

  // Fetch ALL tag scores to calculate GLOBAL rankings
  const allTagScores = await db
    .select({
      username: userTagScores.username,
      tag: userTagScores.tag,
      score: userTagScores.score,
    })
    .from(userTagScores)
    .orderBy(desc(userTagScores.score))
    .all();

  // Calculate global rankings across ALL contributors in each tag
  const globalRankings = calculateFocusAreaRankings(allTagScores);

  const focusAreasMap = new Map<string, FocusAreaDetail[]>();

  // Filter to requested users and take top N tags
  for (const username of usernames) {
    const userTags = allTagScores.filter((t) => t.username === username);

    // Calculate total score for this user across all their tags
    const totalUserScore = userTags.reduce((sum, t) => sum + t.score, 0);

    // Take top N and enrich with GLOBAL rankings and percentages
    const topTags = userTags.slice(0, topN).map((t) => {
      const rankInfo = globalRankings.get(t.tag)?.get(username) || {
        rank: 0,
        total: 0,
      };

      return {
        tag: t.tag,
        score: t.score,
        percentage: totalUserScore > 0 ? (t.score / totalUserScore) * 100 : 0,
        rank: rankInfo.rank,
        totalInArea: rankInfo.total,
      };
    });

    if (topTags.length > 0) {
      focusAreasMap.set(username, topTags);
    }
  }

  return focusAreasMap;
}

/**
 * Calculate tier based on total score
 */
function calculateTier(score: number): ScoreBreakdown["tier"] {
  if (score >= 5000) return "legend";
  if (score >= 1000) return "elite";
  if (score >= 500) return "veteran";
  if (score >= 200) return "active";
  if (score >= 50) return "regular";
  return "beginner";
}

/**
 * Calculate percentile ranking (what % of contributors this user outscores)
 * Uses rank and total user count for accurate calculation even with limit
 */
function calculatePercentile(rank: number, totalUsers: number): number {
  if (totalUsers === 0) return 0;
  // Rank 1 of 100 = 99% (beats 99 of 100)
  // Rank 100 of 100 = 0% (beats 0 of 100)
  return ((totalUsers - rank) / totalUsers) * 100;
}

/**
 * CHARACTER CLASS SYSTEM
 * ======================
 * Derives contributor class based on activity distribution.
 *
 * PRIMARY CLASSES (creation activities):
 *   Builder     - PRs >= 50%           - Primary code creator
 *   Hunter      - Issues >= 25%        - Bug finder, issue reporter
 *   Scribe      - Docs focus >= 40%    - Documentation writer
 *   Machine     - Bot in username      - AI agents
 *   Contributor - Default              - Starting class
 *
 * EVOLUTIONS & HYBRIDS:
 *   Maintainer  - Builder + Reviews >= 25%  - Creator who reviews
 *   Pathfinder  - Builder + Hunter          - Creates code + finds bugs
 *
 * META STATS (not classes, influence evolution):
 *   Reviews     - Evolves Builder to Maintainer
 *   Engagement  - Reserved for future evolution paths
 *
 * TO CUSTOMIZE: Adjust thresholds in the `types` array and `hasHighReviews`
 * check below. Consider moving to config/example.json for per-org tuning.
 */
function deriveCharacterClass(
  distribution: ScoreBreakdown["distribution"],
  focusAreas?: FocusAreaDetail[],
  username?: string,
): string {
  // Check for Machine (AI agent/bot) - for future bot inclusion
  if (username && (username.endsWith("[bot]") || username.includes("-bot"))) {
    return "Machine";
  }

  // Check for Scribe (docs-focused contributor)
  if (focusAreas && focusAreas.length > 0) {
    const docsArea = focusAreas.find(
      (fa) => fa.tag === "docs" || fa.tag === "docs-writer",
    );
    // If docs is their #1 focus area with > 40% of their work
    if (
      docsArea &&
      focusAreas[0].tag === docsArea.tag &&
      docsArea.percentage > 40
    ) {
      return "Scribe";
    }
  }

  // Primary classes based on *creation* activities
  // Reviews and engagement are meta stats, not primary classes
  const types = [
    { key: "prs" as const, name: "Builder", threshold: 50 },
    { key: "issues" as const, name: "Hunter", threshold: 25 },
  ];

  const classes = types
    .filter((t) => distribution[t.key].percentage >= t.threshold)
    .map((t) => t.name);

  // Check for Maintainer evolution (Builder with high review activity)
  const hasHighReviews = distribution.reviews.percentage >= 25;
  if (classes.includes("Builder") && hasHighReviews) {
    return "Maintainer";
  }

  // Named hybrids
  if (classes.includes("Builder") && classes.includes("Hunter"))
    return "Pathfinder";

  if (classes.length === 0) return "Contributor";
  if (classes.length === 1) return classes[0];

  return classes[0]; // Return dominant class
}

/**
 * Get achievements/badges for users
 */
async function getUserAchievements(
  usernames: string[],
): Promise<Map<string, { type: string; tier: string; earnedAt: string }[]>> {
  if (usernames.length === 0) {
    return new Map();
  }

  const badges = await db
    .select({
      username: userBadges.username,
      badgeType: userBadges.badgeType,
      tier: userBadges.tier,
      earnedAt: userBadges.earnedAt,
    })
    .from(userBadges)
    .where(
      sql`${userBadges.username} IN (${sql.join(
        usernames.map((u) => sql`${u}`),
        sql`, `,
      )})`,
    )
    .all();

  const achievementsMap = new Map<
    string,
    { type: string; tier: string; earnedAt: string }[]
  >();

  // Group by username
  for (const username of usernames) {
    const userBadgesList = badges
      .filter((b) => b.username === username)
      .map((b) => ({
        type: b.badgeType,
        tier: b.tier,
        earnedAt: b.earnedAt,
      }));

    if (userBadgesList.length > 0) {
      achievementsMap.set(username, userBadgesList);
    }
  }

  return achievementsMap;
}

/**
 * Get recent summary excerpt for users
 */
async function getUserRecentSummaries(
  usernames: string[],
): Promise<Map<string, string>> {
  if (usernames.length === 0) {
    return new Map();
  }

  const summaries = await db
    .select({
      username: sql<string>`${userDailyScores.username}`,
      summary: sql<string>`${userDailyScores.metrics}`,
      date: userDailyScores.date,
    })
    .from(userDailyScores)
    .where(
      and(
        eq(userDailyScores.category, "day"),
        sql`${userDailyScores.username} IN (${sql.join(
          usernames.map((u) => sql`${u}`),
          sql`, `,
        )})`,
      ),
    )
    .orderBy(desc(userDailyScores.date))
    .limit(usernames.length * 2) // Get recent entries
    .all();

  const summaryMap = new Map<string, string>();

  // Get most recent summary for each user
  for (const username of usernames) {
    const userSummary = summaries.find((s) => s.username === username);
    if (userSummary) {
      // Extract a brief excerpt - this would ideally come from userSummaries table
      // For now, we'll leave it empty and fetch from userSummaries in a better way
      summaryMap.set(username, "");
    }
  }

  return summaryMap;
}

/**
 * Compute contributor profile from activity patterns
 */
async function computeContributorProfiles(
  usernames: string[],
  startDate?: string,
  endDate?: string,
): Promise<Map<string, ContributorProfile>> {
  if (usernames.length === 0) {
    return new Map();
  }

  // Build conditions
  const conditions = [
    eq(userDailyScores.category, "day"),
    ...buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    ),
    sql`${userDailyScores.username} IN (${sql.join(
      usernames.map((u) => sql`${u}`),
      sql`, `,
    )})`,
  ];

  // Query aggregated metrics from userDailyScores
  const results = await db
    .select({
      username: userDailyScores.username,
      metrics: userDailyScores.metrics,
    })
    .from(userDailyScores)
    .where(and(...conditions))
    .all();

  const profileMap = new Map<string, ContributorProfile>();

  // Analyze behavior patterns per user
  for (const username of usernames) {
    const userRecords = results.filter((r) => r.username === username);

    let totalPRs = 0;
    let mergedPRs = 0;
    let reviewsGiven = 0;

    for (const record of userRecords) {
      try {
        const metrics =
          typeof record.metrics === "string"
            ? JSON.parse(record.metrics)
            : record.metrics;

        if (metrics.pullRequests) {
          totalPRs += metrics.pullRequests.total || 0;
          mergedPRs += metrics.pullRequests.merged || 0;
        }

        if (metrics.reviews) {
          reviewsGiven += metrics.reviews.total || 0;
        }
      } catch (error) {
        console.warn(`Failed to parse metrics for ${username}:`, error);
      }
    }

    // Determine contributor type based on behavior
    const reviewRatio = totalPRs > 0 ? reviewsGiven / totalPRs : 0;
    let contributorType: ContributorProfile["contributorType"];

    if (reviewsGiven > totalPRs && reviewRatio >= 2) {
      contributorType = "maintainer"; // Heavy reviewer
    } else if (reviewsGiven > totalPRs) {
      contributorType = "reviewer"; // More reviews than PRs
    } else if (reviewRatio >= 1) {
      contributorType = "collaborator"; // Balanced
    } else {
      contributorType = "author"; // Primarily contributor
    }

    // Compute quality indicators (not gameable counts)
    const prMergeRate =
      totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100 * 10) / 10 : 0;

    const reviewActivity: ContributorProfile["reviewActivity"] =
      reviewsGiven >= 20 ? "high" : reviewsGiven >= 5 ? "medium" : "low";

    profileMap.set(username, {
      contributorType,
      prMergeRate,
      reviewActivity,
      // recentSummary will be populated separately
    });
  }

  return profileMap;
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
 * @param totalUserCount - Total count of all users for accurate percentile calculation
 */
async function getLeaderboardData(
  startDate?: string,
  endDate?: string,
  limit?: number,
  baseUrl?: string,
  totalUserCount?: number,
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

  // Get all enrichment data for users
  const usernames = results.map((r) => r.username);
  const walletMap = await getUserWallets(usernames);
  const focusAreasMap = await getUserFocusAreas(usernames);
  const achievementsMap = await getUserAchievements(usernames);
  const profileMap = await computeContributorProfiles(
    usernames,
    startDate,
    endDate,
  );

  // Use provided baseUrl or fallback to env vars (for Next.js pages)
  // Trim trailing slash to avoid double-slash in URLs
  const linkBase = (
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).replace(/\/$/, "");

  // Use total user count for accurate percentile calculation (even with limit)
  const effectiveTotalUsers = totalUserCount ?? results.length;

  // Format results with all enrichment data
  return results.map((row, index) => {
    const profile = profileMap.get(row.username);

    const score = Number(row.totalScore || 0);
    const prScore = Number(row.prScore || 0);
    const issueScore = Number(row.issueScore || 0);
    const reviewScore = Number(row.reviewScore || 0);
    const commentScore = Number(row.commentScore || 0);

    // Calculate score breakdown (MMORPG character sheet)
    // Labels use Orders nomenclature
    const distribution = {
      prs: {
        score: prScore,
        percentage: score > 0 ? (prScore / score) * 100 : 0,
        label: "Builder",
      },
      issues: {
        score: issueScore,
        percentage: score > 0 ? (issueScore / score) * 100 : 0,
        label: "Hunter",
      },
      reviews: {
        score: reviewScore,
        percentage: score > 0 ? (reviewScore / score) * 100 : 0,
        label: "Reviews", // Meta stat - high reviews evolves Builder to Maintainer
      },
      comments: {
        score: commentScore,
        percentage: score > 0 ? (commentScore / score) * 100 : 0,
        label: "Engagement", // Meta stat for future evolution paths, not a primary class
      },
    };

    const userFocusAreas = focusAreasMap.get(row.username);
    const rank = index + 1; // 1-based rank
    const scoreBreakdown: ScoreBreakdown = {
      total: score,
      distribution,
      tier: calculateTier(score),
      percentile: calculatePercentile(rank, effectiveTotalUsers),
      characterClass: deriveCharacterClass(
        distribution,
        userFocusAreas,
        row.username,
      ),
    };

    return {
      rank: index + 1,
      username: row.username,
      avatarUrl: row.avatarUrl || "",
      characterClass: scoreBreakdown.characterClass,
      tier: scoreBreakdown.tier,
      score,
      prScore,
      issueScore,
      reviewScore,
      commentScore,
      wallets: walletMap.get(row.username) || {},
      focusAreas: focusAreasMap.get(row.username),
      achievements: achievementsMap.get(row.username),
      profile,
      scoreBreakdown,
      links: linkBase
        ? {
            profile: `${linkBase}/profile/${row.username}`,
            profileApi: `${linkBase}/api/contributors/${row.username}/profile.json`,
            summary: `${linkBase}/api/summaries/contributors/${row.username}/day/latest.json`,
            github: `https://github.com/${row.username}`,
          }
        : undefined,
    };
  });
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
    baseUrl?: string;
  },
): Promise<void> {
  const logger = options?.logger;
  const limit = options?.limit;
  const baseUrl = options?.baseUrl;
  const contributionStartDate = options?.contributionStartDate ?? "2024-10-15";

  logger?.info(`Generating ${period} leaderboard API endpoint...`);

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(
    period,
    contributionStartDate,
  );

  // Get total count of users for accurate percentile calculation
  const totalCount = await getTotalUserCount(startDate, endDate);

  // Get leaderboard data (top N if limit specified)
  const leaderboard = await getLeaderboardData(
    startDate,
    endDate,
    limit,
    baseUrl,
    totalCount, // Pass total for accurate percentiles even when limited
  );

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
 * User profile API response structure
 */
export interface UserProfileAPIResponse {
  version: "1.0";
  username: string;
  generatedAt: string;
  characterSheet: {
    tier: ScoreBreakdown["tier"];
    characterClass: string;
    percentile: number;
    rank: {
      monthly: number | null;
      weekly: number | null;
      lifetime: number | null;
    };
    scoreBreakdown: ScoreBreakdown;
    focusAreas: FocusAreaDetail[];
    achievements?: {
      type: string;
      tier: string;
      earnedAt: string;
    }[];
    profile?: ContributorProfile;
    wallets: {
      solana?: string;
      ethereum?: string;
    };
  };
  links: {
    summaries: {
      lifetime: string;
      monthly: string;
      weekly: string;
      daily: string;
    };
    github: string;
    profile: string;
  };
}

/**
 * Get user's rank across different time periods
 */
async function getUserRanks(
  username: string,
  contributionStartDate: string,
): Promise<{
  monthly: number | null;
  weekly: number | null;
  lifetime: number | null;
}> {
  const now = new UTCDate();
  const endDate = toDateString(now);

  const ranks = {
    monthly: null as number | null,
    weekly: null as number | null,
    lifetime: null as number | null,
  };

  // Helper to get rank for a specific period
  async function getRankForPeriod(
    startDate: string,
    endDate: string,
  ): Promise<number | null> {
    const scoreFields = generateScoreSelectFields(userDailyScores);
    const whereConditions = buildCommonWhereConditions(
      { dateRange: { startDate, endDate } },
      userDailyScores,
      ["date"],
    );

    const results = await db
      .select({
        username: users.username,
        totalScore: sql<number>`COALESCE(${scoreFields.totalScore}, 0)`,
      })
      .from(users)
      .leftJoin(
        userDailyScores,
        and(eq(users.username, userDailyScores.username), ...whereConditions),
      )
      .where(eq(users.isBot, 0))
      .groupBy(users.username)
      .orderBy(desc(sql`COALESCE(${scoreFields.totalScore}, 0)`))
      .all();

    const rank = results.findIndex((r) => r.username === username);
    return rank >= 0 ? rank + 1 : null;
  }

  // Monthly
  const startOfMonth = new UTCDate(now.getFullYear(), now.getMonth(), 1);
  ranks.monthly = await getRankForPeriod(toDateString(startOfMonth), endDate);

  // Weekly
  const day = now.getDay();
  const startOfWeek = new UTCDate(now);
  startOfWeek.setDate(now.getDate() - day);
  ranks.weekly = await getRankForPeriod(toDateString(startOfWeek), endDate);

  // Lifetime
  ranks.lifetime = await getRankForPeriod(contributionStartDate, endDate);

  return ranks;
}

/**
 * Export individual user profile as JSON API endpoint
 * @param prefetchedEntry - Optional pre-fetched leaderboard entry to avoid O(U²) queries
 */
export async function exportUserProfile(
  outputDir: string,
  username: string,
  options?: {
    contributionStartDate: string;
    logger?: Logger;
    baseUrl?: string;
    prefetchedEntry?: LeaderboardEntry; // Performance: reuse entry from exportAllUserProfiles
  },
): Promise<void> {
  const logger = options?.logger;
  const contributionStartDate = options?.contributionStartDate ?? "2024-10-15";
  const rawBaseUrl = options?.baseUrl;

  if (!rawBaseUrl) {
    logger?.debug(`Skipping profile for ${username}: SITE_URL not configured`);
    return;
  }

  // Trim trailing slash to avoid double-slash in URLs
  const baseUrl = rawBaseUrl.replace(/\/$/, "");

  logger?.debug(`Generating profile for ${username}...`);

  // Use prefetched entry if available (avoids O(U²) when called from exportAllUserProfiles)
  let userEntry = options?.prefetchedEntry;

  if (!userEntry) {
    // Fallback: fetch from database (for standalone calls)
    const now = new UTCDate();
    const endDate = toDateString(now);
    const leaderboard = await getLeaderboardData(
      contributionStartDate,
      endDate,
      undefined,
      baseUrl,
    );
    userEntry = leaderboard.find((entry) => entry.username === username);
  }

  if (!userEntry) {
    logger?.warn(
      `User ${username} not found in leaderboard, skipping profile export`,
    );
    return;
  }

  // Get ranks across all periods
  const ranks = await getUserRanks(username, contributionStartDate);

  // Build profile response
  const profile: UserProfileAPIResponse = {
    version: "1.0",
    username,
    generatedAt: new Date().toISOString(),
    characterSheet: {
      tier: userEntry.scoreBreakdown?.tier ?? "beginner",
      characterClass: userEntry.scoreBreakdown?.characterClass ?? "Contributor",
      percentile: userEntry.scoreBreakdown?.percentile ?? 0,
      rank: ranks,
      scoreBreakdown: userEntry.scoreBreakdown ?? {
        total: userEntry.score,
        distribution: {
          prs: {
            score: userEntry.prScore,
            percentage: 0,
            label: "Code Author",
          },
          issues: {
            score: userEntry.issueScore,
            percentage: 0,
            label: "Problem Finder",
          },
          reviews: {
            score: userEntry.reviewScore,
            percentage: 0,
            label: "Code Reviewer",
          },
          comments: {
            score: userEntry.commentScore,
            percentage: 0,
            label: "Discussant",
          },
        },
        tier: "beginner",
        percentile: 0,
        characterClass: "Contributor",
      },
      focusAreas: userEntry.focusAreas ?? [],
      achievements: userEntry.achievements,
      profile: userEntry.profile,
      wallets: userEntry.wallets,
    },
    links: {
      summaries: {
        lifetime: `${baseUrl}/api/summaries/contributors/${username}/lifetime.json`,
        monthly: `${baseUrl}/api/summaries/contributors/${username}/month/latest.json`,
        weekly: `${baseUrl}/api/summaries/contributors/${username}/week/latest.json`,
        daily: `${baseUrl}/api/summaries/contributors/${username}/day/latest.json`,
      },
      github: `https://github.com/${username}`,
      profile: `${baseUrl}/profile/${username}`,
    },
  };

  // Create directory structure: /api/contributors/{username}/
  const contributorsDir = join(outputDir, "api", "contributors", username);
  mkdirSync(contributorsDir, { recursive: true });

  // Write profile.json
  const outputPath = join(contributorsDir, "profile.json");
  await writeToFile(outputPath, JSON.stringify(profile, null, 2));

  logger?.debug(`✓ Exported profile for ${username} to ${outputPath}`);
}

/**
 * Export profiles for all users in the leaderboard
 */
export async function exportAllUserProfiles(
  outputDir: string,
  options?: {
    contributionStartDate: string;
    logger?: Logger;
    baseUrl?: string;
  },
): Promise<void> {
  const logger = options?.logger;
  const contributionStartDate = options?.contributionStartDate ?? "2024-10-15";
  const baseUrl = options?.baseUrl;

  if (!baseUrl) {
    logger?.info("Skipping user profiles: SITE_URL not configured");
    return;
  }

  logger?.info("Exporting user profiles...");

  // Get all users from lifetime leaderboard
  const now = new UTCDate();
  const endDate = toDateString(now);
  const leaderboard = await getLeaderboardData(
    contributionStartDate,
    endDate,
    undefined,
    baseUrl,
  );

  logger?.info(`Found ${leaderboard.length} users to export profiles for`);

  // Export each user's profile with prefetched data (avoids O(U²) queries)
  for (const entry of leaderboard) {
    await exportUserProfile(outputDir, entry.username, {
      ...options,
      prefetchedEntry: entry, // Pass pre-fetched entry to avoid redundant queries
    });
  }

  logger?.info(`✓ Exported ${leaderboard.length} user profiles successfully`);
}

/**
 * API Index response for discovery
 */
export interface APIIndexResponse {
  version: string;
  baseUrl: string;
  documentation: string;
  openapi: string;
  endpoints: {
    leaderboard: {
      monthly: string;
      weekly: string;
      lifetime: string;
    };
    profiles: {
      pattern: string;
      example: string;
    };
    summaries: {
      overall: {
        pattern: string;
        intervals: string[];
      };
      contributors: {
        pattern: string;
        intervals: string[];
      };
    };
  };
  capabilities: {
    search: {
      byUsername: boolean;
      byRank: boolean;
      byTier: boolean;
      byFocusArea: boolean;
    };
    intervals: string[];
    characterSystem: {
      tiers: string[];
      classes: string[];
      focusAreas: string[];
    };
  };
}

/**
 * Get all unique focus area tags from the database
 */
async function getAllFocusAreaTags(): Promise<string[]> {
  const tags = await db
    .select({ tag: userTagScores.tag })
    .from(userTagScores)
    .groupBy(userTagScores.tag)
    .orderBy(userTagScores.tag)
    .all();

  return tags.map((t) => t.tag);
}

/**
 * Export API index for discovery
 */
export async function exportAPIIndex(
  outputDir: string,
  options?: {
    baseUrl?: string;
    logger?: Logger;
  },
): Promise<void> {
  const logger = options?.logger;
  const baseUrl = options?.baseUrl;

  if (!baseUrl) {
    logger?.warn(
      "Skipping API index: SITE_URL not configured (set NEXT_PUBLIC_SITE_URL or SITE_URL env var)",
    );
    return;
  }

  logger?.info("Generating API index...");

  // Get all focus area tags from database
  const focusAreas = await getAllFocusAreaTags();

  const index: APIIndexResponse = {
    version: "1.0",
    baseUrl,
    documentation: `${baseUrl}/api`,
    openapi: `${baseUrl}/openapi.json`,
    endpoints: {
      leaderboard: {
        monthly: `${baseUrl}/api/leaderboard-monthly.json`,
        weekly: `${baseUrl}/api/leaderboard-weekly.json`,
        lifetime: `${baseUrl}/api/leaderboard-lifetime.json`,
      },
      profiles: {
        pattern: `${baseUrl}/api/contributors/{username}/profile.json`,
        example: `${baseUrl}/api/contributors/example-user/profile.json`,
      },
      summaries: {
        overall: {
          pattern: `${baseUrl}/api/summaries/overall/{interval}/latest.json`,
          intervals: ["day", "week", "month"],
        },
        contributors: {
          pattern: `${baseUrl}/api/summaries/contributors/{username}/{interval}/latest.json`,
          intervals: ["day", "week", "month", "lifetime"],
        },
      },
    },
    capabilities: {
      search: {
        byUsername: true,
        byRank: true,
        byTier: true,
        byFocusArea: true,
      },
      intervals: ["day", "week", "month", "lifetime"],
      characterSystem: {
        tiers: ["beginner", "regular", "active", "veteran", "elite", "legend"],
        classes: [
          "Builder", // Primary: writes code (PRs)
          "Hunter", // Primary: finds bugs (Issues)
          "Scribe", // Primary: writes docs
          "Maintainer", // Evolution: Builder + high reviews
          "Pathfinder", // Hybrid: Builder + Hunter
          "Machine", // AI agents
          "Contributor", // Default
        ],
        focusAreas,
      },
    },
  };

  // Write to /api/index.json
  const apiDir = join(outputDir, "api");
  mkdirSync(apiDir, { recursive: true });

  const outputPath = join(apiDir, "index.json");
  await writeToFile(outputPath, JSON.stringify(index, null, 2));

  logger?.info(`✓ API index exported to ${outputPath}`);
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
    baseUrl?: string;
  },
): Promise<void> {
  const logger = options?.logger;
  logger?.info("Exporting all leaderboard API endpoints...");

  // Export API index first for discovery
  await exportAPIIndex(outputDir, options);

  // Export all three periods
  await exportLeaderboardAPI(outputDir, "monthly", options);
  await exportLeaderboardAPI(outputDir, "weekly", options);
  await exportLeaderboardAPI(outputDir, "lifetime", options);

  // Export individual user profiles
  await exportAllUserProfiles(outputDir, options);

  logger?.info("✓ All leaderboard API endpoints exported successfully");
}
