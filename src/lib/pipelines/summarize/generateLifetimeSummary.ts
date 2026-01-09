import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateAISummaryForContributor } from "./aiContributorSummary";
import { getContributorMetrics } from "./queries";
import { toDateString } from "@/lib/date-utils";
import { db } from "@/lib/data/db";
import { userSummaries, users } from "@/lib/data/schema";
import { eq, and } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import {
  getContributorSummaryFilePath,
  writeToFile,
  writeSummaryToAPI,
} from "@/lib/fsHelpers";

/**
 * Check if a lifetime summary already exists for a user
 */
async function checkExistingLifetimeSummary(
  username: string,
): Promise<boolean> {
  const existingSummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "lifetime"),
    ),
  });

  return !!existingSummary?.summary;
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
        const summaryExists = await checkExistingLifetimeSummary(username);
        if (summaryExists) {
          intervalLogger?.debug(
            `Lifetime summary already exists for ${username}, skipping generation`,
          );
          return;
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
        return;
      }

      // Store in database with "lifetime" interval type
      await storeLifetimeSummary(username, currentDate, summary);

      // Export summary as markdown file
      const mdFilename = `lifetime.md`;
      // Use "month" interval for file path structure (lifetime uses similar structure)
      const mdPath = getContributorSummaryFilePath(
        context.outputDir,
        username,
        "month",
        mdFilename,
      );
      await writeToFile(mdPath, summary);

      // Export summary as JSON API artifact at simplified path
      await writeSummaryToAPI(
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
    const usernames = await getAllActiveContributors();
    return usernames.map((username) => ({ username }));
  },
  mapStep(generateLifetimeSummaryForContributor),
  (results) => results.filter(isNotNullOrUndefined),
);
