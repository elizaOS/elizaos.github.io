import {
  getContributorPRs,
  getContributorIssueMetrics,
  getContributorReviewMetrics,
  getContributorCommentMetrics,
} from "../../queries";
import { storeDailySummary } from "./mutations";
import { createStep } from "../types";
import { ContributorPipelineContext } from "./context";
import { toDateString } from "@/lib/date-utils";
/**
 * Generate and store daily summary for a contributor
 */

export const generateDailySummary = createStep(
  "generateDailySummary",
  async (
    username: string,
    { dateRange, logger, repoId }: ContributorPipelineContext
  ) => {
    // Get date from context
    const dateStr = dateRange?.endDate || toDateString(new Date());

    // Query parameters
    const queryParams = {
      repository: repoId,
      dateRange,
    };

    // Get metrics for the summary
    const prs = await getContributorPRs(username, queryParams);
    const issueMetrics = await getContributorIssueMetrics(
      username,
      queryParams
    );
    const reviewMetrics = await getContributorReviewMetrics(
      username,
      queryParams
    );
    const commentMetrics = await getContributorCommentMetrics(
      username,
      queryParams
    );

    logger?.info(`generating summary for ${username}`, {
      numPrs: prs.length,
      issues: issueMetrics.total,
      reviews: reviewMetrics.total,
    });

    // Generate a simple summary (this would use AI in a real implementation)
    const summary =
      `${username} worked on ${prs.length} pull requests, ` +
      `engaged with ${issueMetrics.total} issues, ` +
      `provided ${reviewMetrics.total} reviews, and ` +
      `wrote ${commentMetrics.pullRequests + commentMetrics.issues} comments.`;

    logger?.debug(summary);
    // Store in database
    await storeDailySummary(username, dateStr, summary);

    return {
      date: dateStr,
      summary,
    };
  }
);
