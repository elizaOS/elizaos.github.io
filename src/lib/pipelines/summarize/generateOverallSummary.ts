import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateOverallSummary } from "./aiOverallSummary";
import { generateTimeIntervals } from "../generateTimeIntervals";
import { IntervalType, TimeInterval, toDateString } from "@/lib/date-utils";
import { getAllRepoSummariesForInterval } from "./queries";
import {
  getOverallSummaryFilePath,
  writeToFile,
  sha256,
  getAPISummaryPath,
  writeJSONWithLatest,
  updateSummaryIndex,
  SummaryAPIResponse,
} from "@/lib/fsHelpers";
import { storeOverallSummary } from "./mutations";
import { db } from "@/lib/data/db";
import { overallSummaries } from "@/lib/data/schema";
import { and, eq } from "drizzle-orm";

/**
 * Check if an overall summary already exists for a specific date and interval type
 */
async function checkExistingOverallSummary(
  date: string | Date,
  intervalType: IntervalType,
): Promise<boolean> {
  // Check database
  const existingSummary = await db.query.overallSummaries.findFirst({
    where: and(
      eq(overallSummaries.date, toDateString(date)),
      eq(overallSummaries.intervalType, intervalType),
    ),
  });

  return existingSummary !== undefined && existingSummary.summary !== "";
}

export const generateOverallSummaryForInterval = createStep(
  "OverallSummary",
  async (
    { interval }: { interval: TimeInterval },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite, outputDir } = context;
    const intervalType = interval.intervalType;
    if (!aiSummaryConfig.enabled) {
      return null;
    }

    const intervalLogger = logger
      ?.child(intervalType)
      .child(toDateString(interval.intervalStart));
    const startDate = toDateString(interval.intervalStart);

    try {
      if (!overwrite) {
        const summaryExists = await checkExistingOverallSummary(
          startDate,
          intervalType,
        );
        if (summaryExists) {
          intervalLogger?.debug(
            `Overall ${intervalType} summary already exists for ${startDate}, skipping generation`,
          );
          return;
        }
      }

      const repoSummaries = await getAllRepoSummariesForInterval(interval);
      if (repoSummaries.length === 0) {
        intervalLogger?.debug(
          `No repository summaries found for ${intervalType} of ${startDate}, skipping overall summary generation.`,
        );
        return null;
      }

      const summary = await generateOverallSummary(
        repoSummaries,
        aiSummaryConfig,
        { startDate },
        intervalType,
      );

      if (!summary) {
        intervalLogger?.debug(
          `Overall summary generation resulted in no content for ${startDate}, skipping storage.`,
        );
        return;
      }

      // Store the summary in database
      await storeOverallSummary(startDate, summary, intervalType);

      // Export summary as markdown file
      const mdFilename = `${startDate}.md`;
      const mdPath = getOverallSummaryFilePath(
        outputDir,
        intervalType,
        mdFilename,
      );
      await writeToFile(mdPath, summary);

      // Export summary as JSON API artifact
      const now = new Date().toISOString();
      const contentHash = sha256(summary);
      const response: SummaryAPIResponse = {
        version: "1.0",
        type: "overall",
        interval: intervalType,
        date: startDate,
        generatedAt: now,
        sourceLastUpdated: now,
        contentFormat: "markdown",
        contentHash,
        content: summary,
      };

      const jsonFilename = `${startDate}.json`;
      const jsonPath = getAPISummaryPath(
        outputDir,
        "overall",
        intervalType,
        jsonFilename,
      );
      const latestPath = getAPISummaryPath(
        outputDir,
        "overall",
        intervalType,
        "latest.json",
      );
      await writeJSONWithLatest(jsonPath, latestPath, response);

      // Update index
      const indexPath = getAPISummaryPath(
        outputDir,
        "overall",
        intervalType,
        "index.json",
      );
      await updateSummaryIndex(indexPath, "overall", intervalType, {
        date: startDate,
        sourceLastUpdated: now,
        contentHash,
        path: jsonFilename,
      });

      intervalLogger?.info(
        `Generated and exported overall ${intervalType} summary`,
        { mdPath, jsonPath },
      );

      return summary;
    } catch (error) {
      intervalLogger?.error(`Error processing overall summary`, {
        error: (error as Error).message,
      });
    }
  },
);

export const generateMonthlyOverallSummaries = pipe(
  generateTimeIntervals("month"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.month) {
      return input;
    }
    return [];
  },
  mapStep(generateOverallSummaryForInterval),
);

export const generateWeeklyOverallSummaries = pipe(
  generateTimeIntervals("week"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.week) {
      return input;
    }
    return [];
  },
  mapStep(generateOverallSummaryForInterval),
);

export const generateDailyOverallSummaries = pipe(
  generateTimeIntervals("day"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.day) {
      return input;
    }
    return [];
  },
  mapStep(generateOverallSummaryForInterval),
);
