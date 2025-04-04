import { ScoringConfig } from "./pipelineConfig";
import { groupBy } from "../arrayHelpers";
import { toDateString } from "../date-utils";
import {
  prComments,
  prReviews,
  rawIssues,
  rawPullRequests,
  rawPullRequestFiles,
} from "./schema";
import {
  getContributorPRs,
  getContributorIssueMetrics,
  getContributorReviewMetrics,
  getContributorCommentMetrics,
  QueryParams,
  getContributorPRMetrics,
} from "./queries";

export interface ScoreResult {
  totalScore: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
  metrics: {
    pullRequests: {
      total: number;
      merged: number;
      open: number;
      closed: number;
    };
    issues: {
      total: number;
      open: number;
      closed: number;
    };
    reviews: {
      total: number;
      approved: number;
      changesRequested: number;
      commented: number;
    };
    comments: {
      pullRequests: number;
      issues: number;
    };
    codeChanges: {
      additions: number;
      deletions: number;
      files: number;
    };
  };
}

/**
 * Calculate score for pull requests
 */
export const calculatePRScore = (
  prs: (typeof rawPullRequests.$inferSelect)[],
  scoringConfig: ScoringConfig
): number => {
  let score = 0;
  const { pullRequest } = scoringConfig;

  // Group PRs by date for applying daily caps
  const prsByDate = groupBy(prs, (pr) => {
    const date = new Date(pr.createdAt);
    return toDateString(date);
  });

  for (const [_, datePRs] of Object.entries(prsByDate)) {
    // Apply daily cap
    const dayPRs = datePRs.slice(0, pullRequest.maxPerDay || 10);

    for (const pr of dayPRs) {
      // Calculate PR base score
      let prPointsBase = pullRequest.base;
      if (pr.merged) {
        prPointsBase += pullRequest.merged;
      }

      // Add points for description quality (if available)
      const descriptionLength = pr.body?.length || 0;
      const descriptionPoints = Math.min(
        descriptionLength * pullRequest.descriptionMultiplier,
        10 // Cap description points
      );

      // Calculate PR complexity (based on file count and changes)
      const complexity =
        Math.min(pr.changedFiles || 0, 10) *
        Math.log(Math.min((pr.additions || 0) + (pr.deletions || 0), 1000) + 1);

      // Apply complexity multiplier
      const complexityScore =
        complexity * (pullRequest.complexityMultiplier || 0.5);

      // Optimal size bonus
      let sizeBonus = 0;
      const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
      if (totalChanges >= 100 && totalChanges <= 500) {
        sizeBonus = pullRequest.optimalSizeBonus || 5;
      } else if (totalChanges > 1000) {
        sizeBonus = -5;
      }

      // Calculate final PR score
      score += prPointsBase + descriptionPoints + complexityScore + sizeBonus;
    }
  }

  return score;
};

/**
 * Calculate score for issues
 */
export const calculateIssueScore = (
  issueMetrics: {
    total: number;
    open: number;
    closed: number;
    commentCount: number;
  },
  scoringConfig: ScoringConfig
): number => {
  let score = 0;
  const { issue } = scoringConfig;
  const basePoints = issue.base;

  // Count metrics from the issues array
  const total = issueMetrics.total;
  const closed = issueMetrics.closed;
  const commentCount = issueMetrics.commentCount;

  // Base score for each issue
  score += total * basePoints;

  // Bonus for closed issues
  score += closed * (issue.closedBonus || 5);

  // Points for comments
  const effectiveComments = Math.min(
    commentCount,
    scoringConfig.comment.maxPerThread || 3
  );
  score += effectiveComments * issue.perComment;

  return score;
};

/**
 * Calculate score for reviews
 */
export const calculateReviewScore = (
  reviewMetrics: {
    total: number;
    approved: number;
    changesRequested: number;
    commented: number;
  },
  scoringConfig: ScoringConfig
): number => {
  let score = 0;
  const { review } = scoringConfig;
  const basePoints = review.base;

  // Count metrics from the reviews array
  const approved = reviewMetrics.approved;
  const changesRequested = reviewMetrics.changesRequested;
  const commented = reviewMetrics.commented;

  // Score for each review type
  score += approved * (basePoints + review.approved);
  score += changesRequested * (basePoints + review.changesRequested);
  score += commented * (basePoints + review.commented);

  return score;
};

/**
 * Calculate score for comments
 */
export const calculateCommentScore = (
  commentMetrics: {
    pullRequests: number;
    issues: number;
  },
  scoringConfig: ScoringConfig
): number => {
  let score = 0;
  const { comment } = scoringConfig;
  const basePoints = comment.base;
  const maxPerThread = comment.maxPerThread || 3;
  const diminishingReturns = comment.diminishingReturns || 0.7;

  // Calculate total threads (PRs with comments + issues with comments)
  const pullRequestsWithComments = commentMetrics.pullRequests;
  const issuesWithComments = commentMetrics.issues;

  // Calculate score with diminishing returns
  let factor = 1.0;
  const totalComments = Math.min(
    pullRequestsWithComments + issuesWithComments,
    maxPerThread
  );

  for (let i = 0; i < totalComments; i++) {
    score += basePoints * factor;
    factor *= diminishingReturns;
  }

  return score;
};

/**
 * Calculate overall contributor score directly using query functions
 */
export async function calculateContributorScore(
  username: string,
  queryParams: QueryParams,
  scoringConfig: ScoringConfig
): Promise<ScoreResult> {
  // Get contributor PRs
  const contributorPRs = await getContributorPRs(username, queryParams);

  const contributorPRMetrics = await getContributorPRMetrics(
    username,
    queryParams
  );

  // Get issue metrics
  const issueMetrics = await getContributorIssueMetrics(username, queryParams);

  // Get review metrics
  const reviewMetrics = await getContributorReviewMetrics(
    username,
    queryParams
  );

  // Get comment metrics
  const commentMetrics = await getContributorCommentMetrics(
    username,
    queryParams
  );

  // Calculate individual scores
  const prScore = calculatePRScore(contributorPRs, scoringConfig);
  const issueScore = calculateIssueScore(issueMetrics, scoringConfig);
  const reviewScore = calculateReviewScore(reviewMetrics, scoringConfig);
  const commentScore = calculateCommentScore(commentMetrics, scoringConfig);

  // Calculate total score
  const totalScore = prScore + issueScore + reviewScore + commentScore;

  // Calculate code changes
  const codeChanges = {
    additions: contributorPRs.reduce((sum, pr) => sum + (pr.additions || 0), 0),
    deletions: contributorPRs.reduce((sum, pr) => sum + (pr.deletions || 0), 0),
    files: contributorPRs.reduce((sum, pr) => sum + (pr.changedFiles || 0), 0),
  };

  return {
    totalScore,
    prScore,
    issueScore,
    reviewScore,
    commentScore,
    metrics: {
      pullRequests: contributorPRMetrics,
      issues: issueMetrics,
      reviews: reviewMetrics,
      comments: commentMetrics,
      codeChanges,
    },
  };
}
