import { createStep, pipe, mapStep } from "../types";
import { RepositorySummaryPipelineContext } from "./context";
import {
  getRepositoryMetrics,
  getTopContributors,
  getTopIssues,
  getTopPullRequests,
} from "../../queries";
import { generateTimeIntervals } from "./generateTimeIntervals";
import * as fs from "fs/promises";
import * as path from "path";
import {
  generateIntervalName,
  TimeInterval,
  toDateString,
} from "@/lib/date-utils";

/**
 * Generate a summary for a specific time interval
 */
export const generateRepoSummaryForInterval = createStep(
  "RepoSummary",
  async (
    { interval, repoId }: { interval: TimeInterval; repoId: string },
    { outputDir, logger }: RepositorySummaryPipelineContext
  ) => {
    const intervalLogger = logger
      ?.child(interval.intervalType)
      .child(toDateString(interval.intervalStart));
    // Query parameters for this interval
    const queryParams = {
      repository: repoId,
      dateRange: {
        startDate: toDateString(interval.intervalStart),
        endDate: toDateString(interval.intervalEnd),
      },
    };

    // Fetch metrics sequentially with logging
    const metrics = await getRepositoryMetrics(queryParams);
    intervalLogger?.info("Repository metrics fetched", metrics);
    const topContributors = await getTopContributors(queryParams, 5);
    intervalLogger?.info("Top contributors fetched", {
      contributorsCount: topContributors.length,
    });
    const topIssues = await getTopIssues(queryParams, 5);
    intervalLogger?.info("Top issues fetched", {
      issuesCount: topIssues.length,
    });
    const topPRs = await getTopPullRequests(queryParams, 5);
    intervalLogger?.info("Top pull requests fetched", {
      prsCount: topPRs.length,
    });

    // Generate a summary
    const overview = `From ${interval.intervalStart} to ${interval.intervalEnd}, ${repoId} had ${metrics.new_prs} new PRs (${metrics.merged_prs} merged), ${metrics.new_issues} new issues, and ${metrics.num_contributors} active contributors.`;

    // Create summary object
    const summary = {
      interval,
      repository: repoId,
      overview,
      metrics,
      topContributors,
      topIssues,
      topPRs,
    };

    const intervalName = generateIntervalName(interval);
    // Generate filename
    const filename = `summary_${intervalName}.json`;
    const repoDir = path.join(
      outputDir,
      repoId.replace("/", "_"),
      interval.intervalType
    );
    const outputPath = path.join(repoDir, filename);

    // Ensure output directory exists (including all parent directories)
    await fs.mkdir(repoDir, { recursive: true });

    // Write summary to file
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), "utf-8");

    logger?.info(
      `Generated ${interval.intervalType} summary for ${repoId} - ${intervalName}`,
      {
        outputPath,
        metrics: summary.metrics,
      }
    );

    return summary;
  }
);

/**
 * Pipeline for generating repository summaries
 */
export const generateDailyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("day"),
  mapStep(generateRepoSummaryForInterval)
);

export const generateWeeklyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("week"),
  mapStep(generateRepoSummaryForInterval)
);

export const generateMonthlyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("month"),
  mapStep(generateRepoSummaryForInterval)
);
