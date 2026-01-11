import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateAISummaryForContributor } from "./aiContributorSummary";
import { getContributorMetrics } from "./queries";
import { toDateString } from "@/lib/date-utils";
import { db } from "@/lib/data/db";
import {
  userSummaries,
  users,
  rawPullRequests,
  rawIssues,
  issueComments,
} from "@/lib/data/schema";
import { eq, and, or, gt } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { writeToFile, writeSummaryToAPI } from "@/lib/fsHelpers";

/**
 * Check if a lifetime summary already exists for a user and return its last updated date
 */
async function getExistingLifetimeSummary(
  username: string,
): Promise<{ exists: boolean; lastUpdated?: string }> {
  const existingSummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "lifetime"),
    ),
    columns: {
      summary: true,
      lastUpdated: true,
    },
  });

  return {
    exists: !!existingSummary?.summary,
    lastUpdated: existingSummary?.lastUpdated,
  };
}

/**
 * Check if a user has had any activity since a given date
 */
async function hasActivitySince(
  username: string,
  sinceDate: string,
): Promise<boolean> {
  // Check for recent PRs
  const recentPRs = await db
    .select({ id: rawPullRequests.id })
    .from(rawPullRequests)
    .where(
      and(
        eq(rawPullRequests.author, username),
        or(
          gt(rawPullRequests.createdAt, sinceDate),
          gt(rawPullRequests.updatedAt, sinceDate),
        ),
      ),
    )
    .limit(1);

  if (recentPRs.length > 0) return true;

  // Check for recent issues
  const recentIssues = await db
    .select({ id: rawIssues.id })
    .from(rawIssues)
    .where(
      and(
        eq(rawIssues.author, username),
        or(
          gt(rawIssues.createdAt, sinceDate),
          gt(rawIssues.updatedAt, sinceDate),
        ),
      ),
    )
    .limit(1);

  if (recentIssues.length > 0) return true;

  // Check for recent comments
  const recentComments = await db
    .select({ id: issueComments.id })
    .from(issueComments)
    .where(
      and(
        eq(issueComments.author, username),
        gt(issueComments.createdAt, sinceDate),
      ),
    )
    .limit(1);

  return recentComments.length > 0;
}

/**
 * Store a lifetime summary in the database
 */
async function storeLifetimeSummary(
  username: string,
  date: string,
  summary: string,
): Promise<void> {
  const id = `${username}_lifetime_${date}`;
  await db
    .insert(userSummaries)
    .values({
      id,
      username,
      intervalType: "lifetime",
      date,
      summary,
    })
    .onConflictDoUpdate({
      target: userSummaries.id,
      set: {
        summary,
        lastUpdated: new Date().toISOString(),
      },
    });
}

/**
 * Get all active contributors (anyone who has made any contribution)
 */
async function getAllActiveContributors(): Promise<string[]> {
  const contributors = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.isBot, 0))
    .all();

  return contributors.map((c) => c.username);
}

/**
 * Generate a lifetime (all-time) summary for a single contributor
 */
const generateLifetimeSummaryForContributor = createStep(
  "GenerateLifetimeContributorSummary",
  async (
    { username }: { username: string },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite } = context;
    const intervalLogger = logger?.child("lifetime");

    if (!aiSummaryConfig.enabled) {
      return null;
    }

    // Use current date as the "date" for lifetime summaries
    const currentDate = toDateString(new Date());

    try {
      if (!overwrite) {
        const existingSummary = await getExistingLifetimeSummary(username);
        if (existingSummary.exists) {
          // Check if user has had any activity since last summary update
          if (existingSummary.lastUpdated) {
            const hasRecentActivity = await hasActivitySince(
              username,
              existingSummary.lastUpdated,
            );
            if (!hasRecentActivity) {
              intervalLogger?.debug(
                `No activity for ${username} since ${existingSummary.lastUpdated}, skipping regeneration (cached)`,
              );
              return null;
            }
            intervalLogger?.info(
              `Activity detected for ${username} since ${existingSummary.lastUpdated}, regenerating summary`,
            );
          } else {
            // Summary exists but no lastUpdated date, skip to be safe
            intervalLogger?.debug(
              `Lifetime summary already exists for ${username}, skipping generation`,
            );
            return null;
          }
        }
      }

      // Get all-time metrics (provide full date range covering all possible data)
      const metrics = await getContributorMetrics({
        username,
        dateRange: {
          startDate: "2020-01-01", // Start from a date before project existed
          endDate: currentDate,
        },
      });

      const summary = await generateAISummaryForContributor(
        metrics,
        aiSummaryConfig,
        "lifetime",
      );

      if (!summary) {
        intervalLogger?.debug(
          `No activity for ${username}, skipping lifetime summary generation`,
        );
        return null;
      }

      // Store in database with "lifetime" interval type
      await storeLifetimeSummary(username, currentDate, summary);

      // Export summary as markdown file - directly in summaries folder
      const mdPath = `${context.outputDir}/contributors/${username}/summaries/lifetime.md`;
      await writeToFile(mdPath, summary);

      // Export summary as JSON API artifact at simplified path
      const jsonPath = await writeSummaryToAPI(
        context.outputDir,
        "contributor",
        "lifetime",
        currentDate,
        summary,
        username,
        { username },
      );

      intervalLogger?.info(
        `Generated and exported lifetime summary for ${username}`,
        {
          mdPath,
          jsonPath,
        },
      );
      return { username, summary };
    } catch (error) {
      intervalLogger?.error(`Error processing contributor ${username}`, {
        error: (error as Error).message,
      });
    }
  },
);

/**
 * Generate lifetime summaries for all active contributors
 */
export const generateLifetimeContributorSummaries = pipe(
  async (_input, context: SummarizerPipelineContext) => {
    if (!context.enabledIntervals.lifetime) {
      return [];
    }

    // Get all active contributors from database
    let usernames = await getAllActiveContributors();

    // Apply username filter if provided (for testing single contributors)
    if (context.usernameFilter) {
      const filterUsername = context.usernameFilter.toLowerCase();
      usernames = usernames.filter((u) => u.toLowerCase() === filterUsername);
      if (usernames.length === 0) {
        context.logger?.warn(
          `Username filter "${context.usernameFilter}" not found in active contributors`,
        );
      } else {
        context.logger?.info(
          `Filtering to single user: ${context.usernameFilter}`,
        );
      }
    }

    return usernames.map((username) => ({ username }));
  },
  mapStep(generateLifetimeSummaryForContributor),
  (results) => results.filter(isNotNullOrUndefined),
);
