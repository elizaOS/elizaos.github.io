import { pipe, mapStep, createStep, sequence } from "../types";
import { calculateTags } from "./calculateTags";
import { fetchAllContributors } from "./fetchAllContributors";
import { generateTimeIntervals } from "../generateTimeIntervals";
import { processContributorsForInterval } from "./contributorScores";
import { getActiveContributorsInInterval } from "../getActiveContributors";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { processBadgesForUser } from "@/lib/badges/award";

/**
 * Process badges for a single contributor
 */
const processBadges = createStep(
  "processBadges",
  async ({ username }: { username: string }, context) => {
    try {
      const awarded = await processBadgesForUser(username);
      if (awarded.length > 0) {
        context.logger?.debug(
          `${username}: Awarded/upgraded ${awarded.length} badge(s) - ${awarded.map((b) => `${b.badgeType}:${b.tier}`).join(", ")}`,
        );
      }
      return { username, badges: awarded };
    } catch (error) {
      context.logger?.error(`Failed to process badges for ${username}`, {
        error: (error as Error).message,
      });
      return null;
    }
  },
);

/**
 * Process all contributors for tags and badges
 */
export const processContributorTags = pipe(
  // Fetch all unique contributors from all repos
  fetchAllContributors,
  // Process each contributor in parallel
  mapStep(calculateTags),
  // Format the combined results
  createStep("logResults", (results, context) => {
    const totalContributors = results.filter(isNotNullOrUndefined).length;
    context.logger?.info(
      `Processed tags for ${totalContributors} contributors`,
    );
    return results;
  }),
);

/**
 * Process badges for all contributors
 */
export const processContributorBadges = pipe(
  fetchAllContributors,
  mapStep(processBadges),
  createStep("logBadgeResults", (results, context) => {
    const successfulResults = results.filter(isNotNullOrUndefined);
    const totalBadges = successfulResults.reduce(
      (sum, r) => sum + r.badges.length,
      0,
    );
    context.logger?.info(
      `Processed badges for ${successfulResults.length} contributors, ${totalBadges} total badges awarded/upgraded`,
    );
    return results;
  }),
);

export const processContributorScores = pipe(
  generateTimeIntervals("day"),
  mapStep(
    pipe(
      // Fetch only active contributors for this interval
      getActiveContributorsInInterval,
      // Process the active contributors for this interval
      processContributorsForInterval,
    ),
  ),
  createStep("logScoringResults", (intervals, context) => {
    const totalIntervals = intervals.length;
    const allUniqueContributors = intervals
      .filter(isNotNullOrUndefined)
      .flatMap((interval) => interval.results.map((r) => r.username));
    const uniqueContributors = [...new Set(allUniqueContributors)];
    context.logger?.info(
      `Processed scores for ${uniqueContributors.length} unique contributors over ${totalIntervals} days`,
    );
    return intervals;
  }),
);

/**
 * Pipeline for calculating all contributor data across repositories
 */
export const contributorsPipeline = sequence(
  processContributorTags,
  processContributorScores,
  processContributorBadges,
);
