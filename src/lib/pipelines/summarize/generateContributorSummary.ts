import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateAISummaryForContributor } from "./aiContributorSummary";
import { getContributorMetrics } from "./queries";
import { IntervalType, TimeInterval, toDateString } from "@/lib/date-utils";
import { storeDailySummary } from "./mutations";
import { db } from "@/lib/data/db";
import { userSummaries } from "@/lib/data/schema";
import { eq, and } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { getActiveContributorsInInterval } from "../getActiveContributors";
import { generateTimeIntervals } from "../generateTimeIntervals";

/**
 * Check if a summary already exists for a user on a specific date and interval type
 */
async function checkExistingSummary(
  username: string,
  date: string | Date,
  intervalType: IntervalType,
): Promise<boolean> {
  const existingSummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.date, toDateString(date)),
      eq(userSummaries.intervalType, intervalType),
    ),
  });

  return !!existingSummary?.summary;
}

/**
 * Generate a summary for a single active contributor for a specific time interval
 */
const generateSummaryForContributor = createStep(
  "GenerateContributorSummary",
  async (
    {
      interval,
      username,
    }: {
      interval: TimeInterval;
      username: string;
    },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite } = context;
    const intervalLogger = logger?.child(interval.intervalType);

    if (!aiSummaryConfig.enabled) {
      return null;
    }

    const startDate = toDateString(interval.intervalStart);

    try {
      if (!overwrite) {
        const summaryExists = await checkExistingSummary(
          username,
          startDate,
          interval.intervalType,
        );
        if (summaryExists) {
          intervalLogger?.debug(
            `${interval.intervalType} summary already exists for ${username} on ${startDate}, skipping generation`,
          );
          return;
        }
      }

      const metrics = await getContributorMetrics({
        username,
        dateRange: {
          startDate: toDateString(interval.intervalStart),
          endDate: toDateString(interval.intervalEnd),
        },
      });

      const summary = await generateAISummaryForContributor(
        metrics,
        aiSummaryConfig,
        interval.intervalType,
      );

      if (!summary) {
        intervalLogger?.debug(
          `No activity for ${username} on ${startDate}, skipping summary generation`,
        );
        return;
      }
      await storeDailySummary(
        username,
        startDate,
        summary,
        interval.intervalType,
      );

      intervalLogger?.info(
        `Generated and stored ${interval.intervalType} summary for ${username} on ${startDate}`,
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
 * Generate summaries for all active contributors in a given time interval
 */
const generateAllContributorSummariesForInterval = pipe(
  getActiveContributorsInInterval,
  ({ interval, contributors }) =>
    contributors.map((contributor) => ({
      interval,
      username: contributor.username,
    })),
  mapStep(generateSummaryForContributor),
  (results) => results.filter(isNotNullOrUndefined),
);

export const generateDailyContributorSummaries = pipe(
  generateTimeIntervals("day"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.day) {
      return input;
    }
    return [];
  },
  mapStep(generateAllContributorSummariesForInterval),
);
export const generateWeeklyContributorSummaries = pipe(
  generateTimeIntervals("week"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.week) {
      return input;
    }
    return [];
  },
  mapStep(generateAllContributorSummariesForInterval),
);

export const generateMonthlyContributorSummaries = pipe(
  generateTimeIntervals("month"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.month) {
      return input;
    }
    return [];
  },
  mapStep(generateAllContributorSummariesForInterval),
);
