import { db } from "@/lib/data/db";
import { userBadges } from "@/lib/data/schema";
import { eq } from "drizzle-orm";
import { UTCDate } from "@date-fns/utc";
import { BadgeAward, UserBadge, BadgeType, getTierDefinition } from "./types";

/**
 * Award a badge to a user (or upgrade to higher tier)
 *
 * Due to UNIQUE constraint on (username, badgeType), this will automatically
 * replace a lower tier badge with a higher tier one.
 *
 * @param username - User to award badge to
 * @param badge - Badge award details
 * @returns The awarded badge record
 */
export async function awardBadge(
  username: string,
  badge: BadgeAward,
): Promise<UserBadge> {
  const id = `${username}_${badge.badgeType}`;
  const earnedAt = new UTCDate().toISOString();

  const result = await db
    .insert(userBadges)
    .values({
      id,
      username,
      badgeType: badge.badgeType,
      tier: badge.tier,
      earnedAt,
      triggerValue: badge.triggerValue,
    })
    .onConflictDoUpdate({
      target: userBadges.id,
      set: {
        tier: badge.tier,
        triggerValue: badge.triggerValue,
        earnedAt,
      },
    })
    .returning()
    .get();

  return result as UserBadge;
}

/**
 * Revoke a badge from a user
 * Useful for testing or manual corrections
 *
 * @param username - User to revoke badge from
 * @param badgeType - Badge type to revoke
 */
export async function revokeBadge(
  username: string,
  badgeType: BadgeType,
): Promise<void> {
  const id = `${username}_${badgeType}`;
  await db.delete(userBadges).where(eq(userBadges.id, id));
}

/**
 * Get all badges for a user
 *
 * @param username - User to get badges for
 * @returns Array of user badges
 */
export async function getUserBadges(username: string): Promise<UserBadge[]> {
  const badges = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.username, username))
    .all();

  return badges as UserBadge[];
}

/**
 * Get a specific badge for a user
 *
 * @param username - User to check
 * @param badgeType - Badge type to check
 * @returns User badge or null if not earned
 */
export async function getUserBadge(
  username: string,
  badgeType: BadgeType,
): Promise<UserBadge | null> {
  const id = `${username}_${badgeType}`;
  const badge = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.id, id))
    .get();

  return (badge as UserBadge) || null;
}

/**
 * Check if a user should be awarded or upgraded for a badge
 *
 * @param username - User to check
 * @param newBadge - Potential new badge award
 * @returns true if badge should be awarded/upgraded
 */
export async function shouldAwardBadge(
  username: string,
  newBadge: BadgeAward,
): Promise<boolean> {
  const existingBadge = await getUserBadge(username, newBadge.badgeType);

  // No existing badge - award it
  if (!existingBadge) return true;

  // Check if new tier is higher
  const existingTierDef = getTierDefinition(
    newBadge.badgeType,
    existingBadge.tier,
  );
  const newTierDef = getTierDefinition(newBadge.badgeType, newBadge.tier);

  if (!existingTierDef || !newTierDef) return false;

  // Award if new threshold is higher (upgrade)
  return newTierDef.threshold > existingTierDef.threshold;
}

/**
 * Process badges for a user - check all and award/upgrade as needed
 *
 * @param username - User to process badges for
 * @returns Array of badges that were awarded/upgraded
 */
export async function processBadgesForUser(
  username: string,
): Promise<UserBadge[]> {
  const { checkAllBadges } = await import("./checker");
  const earnedBadges = await checkAllBadges(username);

  const awardedBadges: UserBadge[] = [];

  for (const badge of earnedBadges) {
    const shouldAward = await shouldAwardBadge(username, badge);
    if (shouldAward) {
      const awarded = await awardBadge(username, badge);
      awardedBadges.push(awarded);
    }
  }

  return awardedBadges;
}
