import { BadgeAward, BadgeType, getEarnedTier } from "./types";
import { calculateLevelStats } from "@/lib/skillsHelpers";
import { getUserDailyScores } from "@/lib/scoring/storage";
import {
  getContributorPRMetrics,
  getContributorReviewMetrics,
} from "@/lib/pipelines/contributors/queries";
import { db } from "@/lib/data/db";
import {
  rawIssues,
  issueLabels,
  labels,
  userTagScores,
} from "@/lib/data/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Check level milestone badge eligibility
 * Reuses: userTagScores query, calculateLevelStats
 */
export async function checkLevelBadge(
  username: string,
): Promise<BadgeAward | null> {
  // Query user tag scores directly
  const tagScores = await db
    .select({ score: userTagScores.score })
    .from(userTagScores)
    .where(eq(userTagScores.username, username))
    .all();

  const totalXP = tagScores.reduce(
    (sum: number, t: { score: number }) => sum + t.score,
    0,
  );
  const { level } = calculateLevelStats(totalXP);

  const tier = getEarnedTier("level", level);
  if (!tier) return null;

  return {
    badgeType: "level",
    tier: tier.tier,
    triggerValue: level,
  };
}

/**
 * Check activity streak badge eligibility
 * Reuses: getUserDailyScores
 *
 * Streak definition: Consecutive days with score > 0
 */
export async function checkStreakBadge(
  username: string,
): Promise<BadgeAward | null> {
  // Get all daily scores ordered by date
  const dailyScores = await getUserDailyScores(username);

  if (dailyScores.length === 0) return null;

  // Calculate longest streak ending today or recently
  let longestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  // Sort by date ascending
  const sortedScores = [...dailyScores].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const score of sortedScores) {
    const scoreDate = new Date(score.date);

    if (lastDate) {
      const daysDiff = Math.round(
        (scoreDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 1) {
        // Consecutive day
        currentStreak++;
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    lastDate = scoreDate;
  }

  // Check final streak
  longestStreak = Math.max(longestStreak, currentStreak);

  const tier = getEarnedTier("streak", longestStreak);
  if (!tier) return null;

  return {
    badgeType: "streak",
    tier: tier.tier,
    triggerValue: longestStreak,
  };
}

/**
 * Check PR Master badge eligibility
 * Reuses: getContributorPRMetrics
 */
export async function checkPRMasterBadge(
  username: string,
): Promise<BadgeAward | null> {
  const prMetrics = await getContributorPRMetrics(username, {});
  const mergedCount = prMetrics.merged;

  const tier = getEarnedTier("pr_master", mergedCount);
  if (!tier) return null;

  return {
    badgeType: "pr_master",
    tier: tier.tier,
    triggerValue: mergedCount,
  };
}

/**
 * Check Bug Hunter badge eligibility
 * Queries: closed issues with "bug" label
 */
export async function checkBugHunterBadge(
  username: string,
): Promise<BadgeAward | null> {
  // Query for closed issues with bug label
  const bugFixes = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${rawIssues.id})`,
    })
    .from(rawIssues)
    .innerJoin(issueLabels, eq(issueLabels.issueId, rawIssues.id))
    .innerJoin(labels, eq(labels.id, issueLabels.labelId))
    .where(
      and(
        eq(rawIssues.author, username),
        sql`UPPER(${rawIssues.state}) = 'CLOSED'`,
        sql`LOWER(${labels.name}) LIKE '%bug%'`,
      ),
    )
    .get();

  const bugCount = Number(bugFixes?.count || 0);

  const tier = getEarnedTier("bug_hunter", bugCount);
  if (!tier) return null;

  return {
    badgeType: "bug_hunter",
    tier: tier.tier,
    triggerValue: bugCount,
  };
}

/**
 * Check Review Champion badge eligibility
 * Reuses: getContributorReviewMetrics
 */
export async function checkReviewChampionBadge(
  username: string,
): Promise<BadgeAward | null> {
  const reviewMetrics = await getContributorReviewMetrics(username, {});
  const reviewCount = reviewMetrics.total;

  const tier = getEarnedTier("review_champion", reviewCount);
  if (!tier) return null;

  return {
    badgeType: "review_champion",
    tier: tier.tier,
    triggerValue: reviewCount,
  };
}

/**
 * Check all badge types for a user
 * Returns array of earned badges
 */
export async function checkAllBadges(username: string): Promise<BadgeAward[]> {
  const results = await Promise.all([
    checkLevelBadge(username),
    checkStreakBadge(username),
    checkPRMasterBadge(username),
    checkBugHunterBadge(username),
    checkReviewChampionBadge(username),
  ]);

  return results.filter((badge): badge is BadgeAward => badge !== null);
}

/**
 * Check single badge type for a user
 */
export async function checkBadge(
  username: string,
  badgeType: BadgeType,
): Promise<BadgeAward | null> {
  switch (badgeType) {
    case "level":
      return checkLevelBadge(username);
    case "streak":
      return checkStreakBadge(username);
    case "pr_master":
      return checkPRMasterBadge(username);
    case "bug_hunter":
      return checkBugHunterBadge(username);
    case "review_champion":
      return checkReviewChampionBadge(username);
    default:
      return null;
  }
}
