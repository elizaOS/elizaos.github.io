import {
  ContributorData,
  PullRequestSchema,
  CommitSchema,
  PullRequestReviewSchema,
  IssueSchema,
  CommentSchema,
} from "@/lib/data/types";
import type { z } from "zod";
import fuzzysort from "fuzzysort";

/*
Test implementation of scoring logic in typescript.
*/

export interface ScoringConfig {
  // PR scoring weights
  baseMergedPRPoints: number;
  prReviewPoints: number;
  prApprovedReviewPoints: number;
  prCommentPoints: number;

  // Impact multipliers
  coreFileMultiplier: number; // Changes to core functionality
  testFileMultiplier: number; // Test coverage improvements
  docsFileMultiplier: number; // Documentation improvements
  securityFixMultiplier: number; // Security-related changes
  performanceFixMultiplier: number; // Performance improvements
  accessibilityFixMultiplier: number; // Accessibility improvements
  bugFixMultiplier: number; // Bug fixes

  // Review quality weights
  inDepthReviewBonus: number; // Detailed code reviews
  suggestionsBonus: number; // Helpful suggestions
  mentorshipBonus: number; // Helping new contributors

  // Issue scoring weights
  baseEngagedIssuePoints: number;
  issueCommentPoints: number;
  issueReferenceBonus: number; // Issue spawns multiple PRs

  // Commit scoring weights
  baseCommitPoints: number;

  // Review scoring weights
  reviewerPoints: number;

  // Volume scoring weights
  volumeCommitPoints: number;
  volumePRPoints: number;
  volumeIssuePoints: number;
  volumeCommentPoints: number;
}

export const defaultScoringConfig: ScoringConfig = {
  // PR scoring weights
  baseMergedPRPoints: 7,
  prReviewPoints: 3,
  prApprovedReviewPoints: 2,
  prCommentPoints: 0.5,

  // Impact multipliers
  coreFileMultiplier: 2.0,
  testFileMultiplier: 1.5,
  docsFileMultiplier: 1.5,
  securityFixMultiplier: 3.0,
  performanceFixMultiplier: 2.0,
  accessibilityFixMultiplier: 1.5,
  bugFixMultiplier: 1.5,

  // Review quality weights
  inDepthReviewBonus: 5,
  suggestionsBonus: 3,
  mentorshipBonus: 5,

  // Issue scoring weights
  baseEngagedIssuePoints: 5,
  issueCommentPoints: 0.5,
  issueReferenceBonus: 5,

  // Commit scoring weights
  baseCommitPoints: 1,

  // Review scoring weights
  reviewerPoints: 5,

  // Volume scoring weights
  volumeCommitPoints: 1,
  volumePRPoints: 2,
  volumeIssuePoints: 1,
  volumeCommentPoints: 0.5,
};

type PR = z.infer<typeof PullRequestSchema>;
type Commit = z.infer<typeof CommitSchema>;
type Review = z.infer<typeof PullRequestReviewSchema>;
type Issue = z.infer<typeof IssueSchema>;
type IssueComment = z.infer<typeof CommentSchema>;

const hasEngagement = (issue: Issue): boolean => {
  const hasComments = (issue.comments?.length ?? 0) > 0;
  const hasReactions =
    issue.comments?.some(
      (comment: IssueComment) => (comment.reactions?.length ?? 0) > 0
    ) ?? false;
  return hasComments || hasReactions;
};

// Impact indicators with common variations and typos
const impactIndicators = {
  security: ["security", "secure", "vulnerability", "vuln", "cve", "exploit"],
  performance: [
    "performance",
    "optimize",
    "optimization",
    "speed",
    "fast",
    "slow",
    "perf",
  ],
  accessibility: ["accessibility", "a11y", "aria", "wcag", "screen reader"],
  bugfix: ["fix", "bug", "issue", "problem", "error", "crash", "exception"],
} as const;

const fuzzyMatch = (text: string, patterns: readonly string[]): boolean => {
  // Prepare text for fuzzy search
  const target = text.toLowerCase();

  // Try to match any of the patterns
  return patterns.some((pattern) => {
    const result = fuzzysort.single(pattern, target);
    // Check if we got a match and if it's a good match (score > -5000)
    // fuzzysort scores range from 0 (perfect) to about -10000 (no match)
    return result !== null && result.score > -5000;
  });
};

const calculateImpactMultiplier = (pr: PR, config: ScoringConfig): number => {
  let multiplier = 1.0;

  // Check file types affected
  const paths = pr.files?.map((f) => f.path) ?? [];
  const hasCore = paths.some(
    (f) => f.includes("src/core") || f.includes("src/lib")
  );
  const hasTests = paths.some(
    (f) => f.includes("test") || f.includes(".spec.") || f.includes(".test.")
  );
  const hasDocs = paths.some(
    (f) => f.includes("docs") || f.includes("README") || f.includes(".md")
  );

  // Apply multipliers
  if (hasCore) multiplier *= config.coreFileMultiplier;
  if (hasTests) multiplier *= config.testFileMultiplier;
  if (hasDocs) multiplier *= config.docsFileMultiplier;

  // Check only PR title for impact indicators with fuzzy matching
  const title = pr.title ?? "";

  if (fuzzyMatch(title, impactIndicators.security)) {
    multiplier *= config.securityFixMultiplier;
  }
  if (fuzzyMatch(title, impactIndicators.performance)) {
    multiplier *= config.performanceFixMultiplier;
  }
  if (fuzzyMatch(title, impactIndicators.accessibility)) {
    multiplier *= config.accessibilityFixMultiplier;
  }
  if (fuzzyMatch(title, impactIndicators.bugfix)) {
    multiplier *= config.bugFixMultiplier;
  }

  return multiplier;
};

const calculatePRPoints = (pr: PR, config: ScoringConfig): number => {
  let points = 0;

  if (pr.merged) {
    // Base points for merged PR
    points += config.baseMergedPRPoints;

    // Points for reviews
    points += (pr.reviews?.length ?? 0) * config.prReviewPoints;

    // Extra points for approved reviews
    const approvedReviews =
      pr.reviews?.filter((r) => r.state === "APPROVED").length ?? 0;
    points += approvedReviews * config.prApprovedReviewPoints;

    // Apply impact multiplier
    points *= calculateImpactMultiplier(pr, config);
  }

  // Points for review comments
  if (pr.comments?.length) {
    points += pr.comments.length * config.prCommentPoints;
  }

  return points;
};

const calculateReviewQuality = (
  review: Review,
  pr: PR,
  config: ScoringConfig
): number => {
  let points = 0;

  // Check for in-depth review
  if (review.body && review.body.length > 200) {
    points += config.inDepthReviewBonus;
  }

  // Check for helpful suggestions
  if (review.body?.toLowerCase().includes("suggestion:")) {
    points += config.suggestionsBonus;
  }

  // Check for mentorship (helping new contributors)
  const authorContributions =
    (pr as { author_contributions_count?: number })
      .author_contributions_count ?? 0;
  const isNewContributor = authorContributions <= 3;
  if (isNewContributor && review.body && review.body.length > 100) {
    points += config.mentorshipBonus;
  }

  return points;
};

const calculateIssuePoints = (issue: Issue, config: ScoringConfig): number => {
  let points = 0;

  if (hasEngagement(issue)) {
    // Base points for engaged issues
    points += config.baseEngagedIssuePoints;

    // Points for comments
    const commentCount = issue.comments?.length ?? 0;
    points += commentCount * config.issueCommentPoints;

    // Bonus for issues that spawn multiple PRs
    const relatedPRs =
      (issue as { related_prs?: PR[] }).related_prs?.length ?? 0;
    if (relatedPRs > 0) {
      points += config.issueReferenceBonus * relatedPRs;
    }
  }

  return points;
};

const calculateCommitPoints = (
  commit: Commit,
  config: ScoringConfig
): number => {
  const points = config.baseCommitPoints;

  // Add impact multiplier for commits
  const multiplier = calculateImpactMultiplier(
    {
      number: 0, // Placeholder
      title: commit.message ?? "",
      state: "closed",
      merged: true,
      created_at: commit.created_at,
      updated_at: commit.created_at,
      body: commit.message ?? "",
      files: [
        {
          path: commit.sha,
          additions: commit.additions,
          deletions: commit.deletions,
        },
      ],
      reviews: [],
      comments: [],
    },
    config
  );

  return points * multiplier;
};

export const calculateScore = (
  contributor: ContributorData,
  config: ScoringConfig = defaultScoringConfig
): number => {
  let score = 0;

  // Calculate PR points
  for (const pr of contributor.activity.code.pull_requests ?? []) {
    score += calculatePRPoints(pr, config);
  }

  // Calculate issue points
  for (const issue of contributor.activity.issues?.opened ?? []) {
    score += calculateIssuePoints(issue, config);
  }

  // Calculate commit points
  for (const commit of contributor.activity.code.commits ?? []) {
    score += calculateCommitPoints(commit, config);
  }

  // Points for being reviewer with quality metrics
  for (const pr of contributor.activity.code.pull_requests ?? []) {
    const reviews =
      pr.reviews?.filter((r) => r.author === contributor.contributor) ?? [];
    for (const review of reviews) {
      score +=
        config.reviewerPoints + calculateReviewQuality(review, pr, config);
    }
  }

  // Base points for volume of activity
  score +=
    (contributor.activity.code.total_commits ?? 0) * config.volumeCommitPoints;
  score += (contributor.activity.code.total_prs ?? 0) * config.volumePRPoints;
  score +=
    (contributor.activity.issues?.total_opened ?? 0) * config.volumeIssuePoints;
  score +=
    (contributor.activity.engagement?.total_comments ?? 0) *
    config.volumeCommentPoints;

  return Math.round(score);
};
