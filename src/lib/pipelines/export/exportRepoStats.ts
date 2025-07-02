import { createStep } from "../types";
import { RepositoryStatsPipelineContext } from "./context";
import { getTopIssues } from "./queries";
import { getTopPullRequests } from "./queries";
import {
  generateIntervalName,
  TimeInterval,
  toDateString,
} from "@/lib/date-utils";
import { getRepoFilePath, writeToFile } from "@/lib/fsHelpers";
import { getRepoMetrics } from "./queries";
import { existsSync } from "fs";

/**
 * Generate stats for a specific time interval
 */
export const exportRepoStatsForInterval = createStep(
  "RepoStats",
  async (
    { interval, repoId }: { interval: TimeInterval; repoId: string },
    { outputDir, logger, overwrite = false }: RepositoryStatsPipelineContext,
  ) => {
    const intervalLogger = logger
      ?.child(interval.intervalType)
      .child(toDateString(interval.intervalStart));

    // Generate filename and path first to check existence
    const intervalName = generateIntervalName(interval);
    const filename = `stats_${intervalName}.json`;
    const outputPath = getRepoFilePath(
      outputDir,
      repoId,
      "stats",
      interval.intervalType,
      filename,
    );

    // Check if file exists and skip if overwrite is false
    if (!overwrite && existsSync(outputPath)) {
      intervalLogger?.info(
        `${interval.intervalType} stats already exist for ${repoId} on ${toDateString(interval.intervalStart)}, skipping generation`,
      );
      return;
    }

    // Query parameters for this interval
    const queryParams = {
      repository: repoId,
      dateRange: {
        startDate: toDateString(interval.intervalStart),
        endDate: toDateString(interval.intervalEnd),
      },
    };
    intervalLogger?.debug("Querying repository metrics", queryParams);
    // Fetch metrics sequentially with logging
    const metrics = await getRepoMetrics(queryParams);
    intervalLogger?.debug("Repository metrics fetched");
    const topIssues = await getTopIssues(queryParams, 5);
    intervalLogger?.debug("Top issues fetched", {
      issuesCount: topIssues.length,
    });
    const topPRs = await getTopPullRequests(queryParams, 5);
    intervalLogger?.debug("Top pull requests fetched", {
      prsCount: topPRs.length,
    });

    const overview = `From ${toDateString(interval.intervalStart)} to ${toDateString(interval.intervalEnd)}, ${repoId} had ${metrics.pullRequests.newPRs.length} new PRs (${metrics.pullRequests.mergedPRs.length} merged), ${metrics.issues.newIssues.length} new issues, and ${metrics.uniqueContributors} active contributors.`;

    const stats = {
      interval,
      repository: repoId,
      overview,
      topIssues,
      topPRs,
      codeChanges: metrics.codeChanges,
      completedItems: metrics.completedItems,
      topContributors: metrics.topContributors,
      newPRs: metrics.pullRequests.newPRs.length,
      mergedPRs: metrics.pullRequests.mergedPRs.length,
      newIssues: metrics.issues.newIssues.length,
      closedIssues: metrics.issues.closedIssues.length,
      activeContributors: metrics.uniqueContributors,
    };

    // Write stats to file
    await writeToFile(outputPath, JSON.stringify(stats, null, 2));

    logger?.info(
      `Exported ${interval.intervalType} stats for ${repoId} - ${intervalName}`,
      {
        outputPath,
      },
    );

    return stats;
  },
);
