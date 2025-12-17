import { z } from "zod";

/**
 * Badge tier levels (only highest tier shown per badge type)
 */
export type BadgeTier = "beginner" | "elite" | "legend";

/**
 * Badge type identifiers
 */
export type BadgeType =
  | "level"
  | "streak"
  | "pr_master"
  | "bug_hunter"
  | "review_champion";

/**
 * Badge definition with tier thresholds
 */
export interface BadgeTierDefinition {
  tier: BadgeTier;
  threshold: number;
  icon: string;
  color: string;
  label: string;
  description: string;
}

export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  category: string;
  tiers: BadgeTierDefinition[];
}

/**
 * Badge award result from checking user eligibility
 */
export interface BadgeAward {
  badgeType: BadgeType;
  tier: BadgeTier;
  triggerValue: number;
}

/**
 * User badge record from database
 */
export interface UserBadge {
  id: string;
  username: string;
  badgeType: BadgeType;
  tier: BadgeTier;
  earnedAt: string;
  triggerValue: number;
}

/**
 * Complete badge definitions for MVP
 * Only 5 badge types with 3 tiers each
 */
export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  level: {
    type: "level",
    name: "Level Milestone",
    category: "progression",
    tiers: [
      {
        tier: "beginner",
        threshold: 10,
        icon: "🥉",
        color: "bronze",
        label: "Beginner",
        description: "Reached level 10",
      },
      {
        tier: "elite",
        threshold: 30,
        icon: "🥈",
        color: "silver",
        label: "Elite",
        description: "Reached level 30",
      },
      {
        tier: "legend",
        threshold: 50,
        icon: "🥇",
        color: "gold",
        label: "Legend",
        description: "Reached level 50",
      },
    ],
  },
  streak: {
    type: "streak",
    name: "Activity Streak",
    category: "engagement",
    tiers: [
      {
        tier: "beginner",
        threshold: 7,
        icon: "🔥",
        color: "orange",
        label: "Week Warrior",
        description: "7-day contribution streak",
      },
      {
        tier: "elite",
        threshold: 30,
        icon: "⚡",
        color: "yellow",
        label: "Month Master",
        description: "30-day contribution streak",
      },
      {
        tier: "legend",
        threshold: 60,
        icon: "💫",
        color: "purple",
        label: "Streak Legend",
        description: "60-day contribution streak",
      },
    ],
  },
  pr_master: {
    type: "pr_master",
    name: "PR Master",
    category: "contribution",
    tiers: [
      {
        tier: "beginner",
        threshold: 5,
        icon: "📝",
        color: "blue",
        label: "PR Starter",
        description: "5 merged pull requests",
      },
      {
        tier: "elite",
        threshold: 25,
        icon: "🚀",
        color: "cyan",
        label: "PR Pro",
        description: "25 merged pull requests",
      },
      {
        tier: "legend",
        threshold: 100,
        icon: "⭐",
        color: "gold",
        label: "PR Legend",
        description: "100 merged pull requests",
      },
    ],
  },
  bug_hunter: {
    type: "bug_hunter",
    name: "Bug Hunter",
    category: "quality",
    tiers: [
      {
        tier: "beginner",
        threshold: 3,
        icon: "🐛",
        color: "green",
        label: "Bug Finder",
        description: "Fixed 3 bugs",
      },
      {
        tier: "elite",
        threshold: 15,
        icon: "🔍",
        color: "emerald",
        label: "Bug Slayer",
        description: "Fixed 15 bugs",
      },
      {
        tier: "legend",
        threshold: 50,
        icon: "🏆",
        color: "gold",
        label: "Bug Terminator",
        description: "Fixed 50 bugs",
      },
    ],
  },
  review_champion: {
    type: "review_champion",
    name: "Review Champion",
    category: "collaboration",
    tiers: [
      {
        tier: "beginner",
        threshold: 10,
        icon: "👀",
        color: "indigo",
        label: "Code Reviewer",
        description: "Completed 10 reviews",
      },
      {
        tier: "elite",
        threshold: 50,
        icon: "🎯",
        color: "violet",
        label: "Review Expert",
        description: "Completed 50 reviews",
      },
      {
        tier: "legend",
        threshold: 200,
        icon: "🏅",
        color: "gold",
        label: "Review Legend",
        description: "Completed 200 reviews",
      },
    ],
  },
};

/**
 * Helper to get badge definition
 */
export function getBadgeDefinition(badgeType: BadgeType): BadgeDefinition {
  return BADGE_DEFINITIONS[badgeType];
}

/**
 * Helper to get tier definition
 */
export function getTierDefinition(
  badgeType: BadgeType,
  tier: BadgeTier,
): BadgeTierDefinition | undefined {
  return BADGE_DEFINITIONS[badgeType].tiers.find((t) => t.tier === tier);
}

/**
 * Helper to get next tier target for progress calculation
 */
export function getNextTier(
  badgeType: BadgeType,
  currentValue: number,
): BadgeTierDefinition | null {
  const definition = BADGE_DEFINITIONS[badgeType];
  // Sort tiers by threshold ascending to find next target
  const sortedTiers = [...definition.tiers].sort(
    (a, b) => a.threshold - b.threshold,
  );

  // Find first tier that exceeds current value
  return sortedTiers.find((t) => t.threshold > currentValue) || null;
}

/**
 * Helper to get highest earned tier for a value
 */
export function getEarnedTier(
  badgeType: BadgeType,
  value: number,
): BadgeTierDefinition | null {
  const definition = BADGE_DEFINITIONS[badgeType];
  // Sort tiers by threshold descending to get highest first
  const sortedTiers = [...definition.tiers].sort(
    (a, b) => b.threshold - a.threshold,
  );

  for (const tier of sortedTiers) {
    if (value >= tier.threshold) {
      return tier;
    }
  }
  return null;
}

// Zod schemas for validation
export const BadgeAwardSchema = z.object({
  badgeType: z.enum([
    "level",
    "streak",
    "pr_master",
    "bug_hunter",
    "review_champion",
  ]),
  tier: z.enum(["beginner", "elite", "legend"]),
  triggerValue: z.number(),
});

export const UserBadgeSchema = z.object({
  id: z.string(),
  username: z.string(),
  badgeType: z.enum([
    "level",
    "streak",
    "pr_master",
    "bug_hunter",
    "review_champion",
  ]),
  tier: z.enum(["beginner", "elite", "legend"]),
  earnedAt: z.string(),
  triggerValue: z.number(),
});
