import { db } from "./db";
import {
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  users,
  userDailySummaries,
  userStats,
  tags,
  userTagScores,
  rawPullRequestFiles,
} from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import path from "path";
import { ScoringRules, TagConfig, PipelineConfig } from "./types";

/**
 * Contributor Pipeline - A modern, maintainable data processing system
 *
 * This system processes GitHub contributions data to provide insights
 * into developer activity, impact, and expertise over time.
 */

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ContributorMetrics {
  username: string;
  avatarUrl?: string;
  score: number;
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
    total: number;
    pullRequests: number;
    issues: number;
  };
  codeChanges: {
    additions: number;
    deletions: number;
    files: number;
  };
  focusAreas: Array<{
    area: string;
    count: number;
    percentage: number;
  }>;
  fileTypes: Array<{
    extension: string;
    count: number;
    percentage: number;
  }>;
  expertiseAreas: Array<{
    tag: string;
    category: string;
    score: number;
    level: number;
    progress: number;
  }>;
}

interface ProcessingResult {
  metrics: ContributorMetrics[];
  totals: {
    contributors: number;
    pullRequests: number;
    issues: number;
    reviews: number;
    comments: number;
  };
  timeframe: DateRange;
}

/**
 * Main pipeline processor that orchestrates the contribution analysis
 */
export class ContributorPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Process contributions data for a specific time period
   */
  async processTimeframe(
    dateRange: DateRange,
    repository: string
  ): Promise<ProcessingResult> {
    // Get active contributors in the time period
    const contributors = await this.getActiveContributors(
      dateRange,
      repository
    );

    console.log(`Processing ${contributors.length} active contributors`);

    // Process metrics for each contributor
    const metrics: ContributorMetrics[] = [];
    let totalPRs = 0;
    let totalIssues = 0;
    let totalReviews = 0;
    let totalComments = 0;

    for (const username of contributors) {
      const contributorMetrics = await this.processContributor(
        username,
        dateRange,
        repository
      );
      metrics.push(contributorMetrics);

      // Update totals
      totalPRs += contributorMetrics.pullRequests.total;
      totalIssues += contributorMetrics.issues.total;
      totalReviews += contributorMetrics.reviews.total;
      totalComments += contributorMetrics.comments.total;
    }

    // Sort contributors by score
    metrics.sort((a, b) => b.score - a.score);

    // Save daily summaries
    await this.saveDailySummaries(metrics, dateRange.endDate);

    // Return processed data
    return {
      metrics,
      totals: {
        contributors: contributors.length,
        pullRequests: totalPRs,
        issues: totalIssues,
        reviews: totalReviews,
        comments: totalComments,
      },
      timeframe: dateRange,
    };
  }

  /**
   * Get list of active contributors in the time period
   */
  private async getActiveContributors(
    dateRange: DateRange,
    repository: string
  ): Promise<string[]> {
    const { startDate, endDate } = dateRange;
    const activeUsers = new Set<string>();

    // Common conditions for time range
    const timeRangeCondition = and(
      gte(rawPullRequests.createdAt, startDate),
      lte(rawPullRequests.createdAt, endDate)
    );

    // Add repository filter
    const repoCondition = and(
      timeRangeCondition,
      eq(rawPullRequests.repository, repository)
    );

    // Get PR authors
    const prAuthors = await db
      .select({ username: rawPullRequests.author })
      .from(rawPullRequests)
      .where(repoCondition)
      .all();

    prAuthors.forEach((row) => activeUsers.add(row.username));

    // Get issue authors
    const issueAuthors = await db
      .select({ username: rawIssues.author })
      .from(rawIssues)
      .where(
        and(
          gte(rawIssues.createdAt, startDate),
          lte(rawIssues.createdAt, endDate),
          eq(rawIssues.repository, repository)
        )
      )
      .all();

    issueAuthors.forEach((row) => activeUsers.add(row.username));

    // Get reviewers
    const reviewers = await db
      .select({ username: prReviews.author })
      .from(prReviews)
      .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
      .where(
        and(
          gte(prReviews.submittedAt, startDate),
          lte(prReviews.submittedAt, endDate),
          eq(rawPullRequests.repository, repository)
        )
      )
      .all();

    reviewers.forEach((row) => {
      if (row.username) activeUsers.add(row.username);
    });

    // Get commenters
    const prCommenters = await db
      .select({ username: prComments.author })
      .from(prComments)
      .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
      .where(
        and(
          gte(prComments.createdAt, startDate),
          lte(prComments.createdAt, endDate),
          eq(rawPullRequests.repository, repository)
        )
      )
      .all();

    prCommenters.forEach((row) => {
      if (row.username) activeUsers.add(row.username);
    });

    const issueCommenters = await db
      .select({ username: issueComments.author })
      .from(issueComments)
      .innerJoin(rawIssues, eq(issueComments.issueId, rawIssues.id))
      .where(
        and(
          gte(issueComments.createdAt, startDate),
          lte(issueComments.createdAt, endDate),
          eq(rawIssues.repository, repository)
        )
      )
      .all();

    issueCommenters.forEach((row) => {
      if (row.username) {
        activeUsers.add(row.username);
      }
    });

    // Filter out invalid usernames
    activeUsers.delete("unknown");
    activeUsers.delete("[deleted]");
    activeUsers.delete("");

    // Filter out bot users from the config
    const filteredUsers = Array.from(activeUsers)
      .filter(Boolean)
      .filter((username) => !this.config.botUsers?.includes(username));

    return filteredUsers;
  }

  /**
   * Process metrics for a single contributor
   */
  private async processContributor(
    username: string,
    dateRange: DateRange,
    repository: string
  ): Promise<ContributorMetrics> {
    const { startDate, endDate } = dateRange;
    console.log(`Processing metrics for ${username}`);

    // Initialize metrics
    const metrics: ContributorMetrics = {
      username,
      score: 0,
      pullRequests: {
        total: 0,
        merged: 0,
        open: 0,
        closed: 0,
      },
      issues: {
        total: 0,
        open: 0,
        closed: 0,
      },
      reviews: {
        total: 0,
        approved: 0,
        changesRequested: 0,
        commented: 0,
      },
      comments: {
        total: 0,
        pullRequests: 0,
        issues: 0,
      },
      codeChanges: {
        additions: 0,
        deletions: 0,
        files: 0,
      },
      focusAreas: [],
      fileTypes: [],
      expertiseAreas: [],
    };

    // Get contributor profile info (avatar URL)
    const userProfile = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (userProfile) {
      metrics.avatarUrl = userProfile.avatarUrl || undefined;
    }

    // Get pull request metrics
    const pullRequests = await this.fetchPullRequests(
      username,
      dateRange,
      repository
    );

    // Process pull request metrics
    let prScore = 0;
    const filePaths: string[] = [];
    const prTitles: string[] = [];

    // Group PRs by date to implement daily caps
    const prsByDate: Record<string, any[]> = {};

    for (const pr of pullRequests) {
      const date = new Date(pr.createdAt).toISOString().split("T")[0];
      if (!prsByDate[date]) {
        prsByDate[date] = [];
      }
      prsByDate[date].push(pr);
    }

    // Process PRs with daily caps
    for (const [date, prs] of Object.entries(prsByDate)) {
      // Apply daily cap
      const dayPRs = prs.slice(
        0,
        this.config.scoring.pullRequest.maxPerDay || 10
      );

      for (const pr of dayPRs) {
        // Update counts
        metrics.pullRequests.total++;

        if (pr.merged === 1) {
          metrics.pullRequests.merged++;
        } else if (pr.state.toUpperCase() === "OPEN") {
          metrics.pullRequests.open++;
        } else {
          metrics.pullRequests.closed++;
        }

        // Fetch files for this PR to get file paths for tag analysis
        const prFiles = await db
          .select()
          .from(rawPullRequestFiles)
          .where(eq(rawPullRequestFiles.prId, pr.id))
          .all();

        // Track affected areas for multipliers
        const areaMultipliers: number[] = [];

        for (const file of prFiles) {
          filePaths.push(file.path);
          metrics.codeChanges.files++;
          metrics.codeChanges.additions += file.additions || 0;
          metrics.codeChanges.deletions += file.deletions || 0;

          // Check area tags for this file
          for (const areaTag of this.config.tags.area.filter(
            (tag) => tag.category === "AREA"
          )) {
            for (const pattern of areaTag.patterns) {
              if (file.path.toLowerCase().includes(pattern.toLowerCase())) {
                areaMultipliers.push(areaTag.weight);
                break;
              }
            }
          }
        }

        // Add PR statistics
        metrics.codeChanges.additions += pr.additions || 0;
        metrics.codeChanges.deletions += pr.deletions || 0;
        metrics.codeChanges.files += pr.changedFiles || 0;

        // Store PR title for tag analysis
        prTitles.push(pr.title);

        // Calculate PR base score
        let prPointsBase = this.config.scoring.pullRequest.base;
        if (pr.merged === 1) {
          prPointsBase += this.config.scoring.pullRequest.merged;
        }

        // Add points for description quality
        const descriptionLength = pr.body?.length || 0;
        let descriptionPoints = Math.min(
          descriptionLength *
            this.config.scoring.pullRequest.descriptionMultiplier,
          10 // Cap description points
        );

        // Calculate PR complexity (based on file count and changes)
        const complexity =
          Math.min(pr.changedFiles || 0, 10) *
          Math.log(
            Math.min((pr.additions || 0) + (pr.deletions || 0), 1000) + 1
          );

        // Apply complexity multiplier
        const complexityScore =
          complexity *
          (this.config.scoring.pullRequest.complexityMultiplier || 0.5);

        // Optimal size bonus (PRs between 100-500 lines are considered optimal)
        let sizeBonus = 0;
        const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
        if (totalChanges >= 100 && totalChanges <= 500) {
          sizeBonus = this.config.scoring.pullRequest.optimalSizeBonus || 5;
        } else if (totalChanges > 1000) {
          // Penalty for very large PRs
          sizeBonus = -5;
        }

        // Calculate base PR score
        let prBaseScore =
          prPointsBase + descriptionPoints + complexityScore + sizeBonus;

        // Apply area multipliers (use the highest multiplier if multiple areas affected)
        const areaMultiplier =
          areaMultipliers.length > 0 ? Math.max(...areaMultipliers) : 1.0;

        // Calculate final PR score with area multiplier
        prScore += prBaseScore * areaMultiplier;
      }
    }

    // Get issue metrics
    const issues = await this.fetchIssues(username, dateRange, repository);

    // Process issue metrics
    let issueScore = 0;

    for (const issue of issues) {
      // Update counts
      metrics.issues.total++;

      if (issue.state.toUpperCase() === "OPEN") {
        metrics.issues.open++;
      } else {
        metrics.issues.closed++;
      }

      // Calculate issue score
      let issuePointsBase = this.config.scoring.issue.base;

      // Add points for labels if present
      try {
        const labels = issue.labels ? JSON.parse(issue.labels) : [];
        if (labels && Array.isArray(labels)) {
          for (const label of labels) {
            const labelName = label.name?.toLowerCase() || "";
            const multiplier =
              this.config.scoring.issue.withLabelsMultiplier[labelName] || 1;
            issuePointsBase *= multiplier;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      // Bonus for closed issues
      if (issue.state.toUpperCase() !== "OPEN" && issue.closedAt) {
        issuePointsBase += this.config.scoring.issue.closedBonus || 5;

        // Resolution speed bonus
        const createdAt = new Date(issue.createdAt).getTime();
        const closedAt = new Date(issue.closedAt).getTime();
        const resolutionDays = (closedAt - createdAt) / (1000 * 60 * 60 * 24);

        // Faster resolution gets higher multiplier (inverse relationship)
        const speedMultiplier = Math.max(
          0.5,
          (this.config.scoring.issue.resolutionSpeedMultiplier || 1.0) *
            (10 / (resolutionDays + 1))
        );

        issuePointsBase *= speedMultiplier;
      }

      issueScore += issuePointsBase;

      // Process issue comments
      const comments = await db
        .select()
        .from(issueComments)
        .where(eq(issueComments.issueId, issue.id))
        .all();

      if (comments.length > 0) {
        // Apply diminishing returns for excessive comments
        const effectiveCommentCount = Math.min(
          comments.length,
          this.config.scoring.comment.maxPerThread || 3
        );

        metrics.comments.issues += comments.length;
        metrics.comments.total += comments.length;

        issueScore +=
          effectiveCommentCount * this.config.scoring.issue.perComment;
      }
    }

    // Get review metrics for reviews the user has given
    const givenReviews = await this.fetchGivenReviews(
      username,
      dateRange,
      repository
    );

    // Group reviews by date to implement daily caps
    const reviewsByDate: Record<string, any[]> = {};

    for (const review of givenReviews) {
      const date = new Date(review.submittedAt || "")
        .toISOString()
        .split("T")[0];
      if (!reviewsByDate[date]) {
        reviewsByDate[date] = [];
      }
      reviewsByDate[date].push(review);
    }

    // Process review metrics with daily caps
    let reviewScore = 0;

    for (const [date, reviews] of Object.entries(reviewsByDate)) {
      // Apply daily cap
      const dayReviews = reviews.slice(
        0,
        this.config.scoring.review.maxPerDay || 8
      );

      for (const review of dayReviews) {
        // Update counts
        metrics.reviews.total++;

        let reviewBaseScore = this.config.scoring.review.base;
        let thoroughnessMultiplier = 1.0;

        // Check if review has substantive content
        const bodyLength = review.body?.length || 0;
        if (bodyLength > 100) {
          thoroughnessMultiplier =
            this.config.scoring.review.thoroughnessMultiplier || 1.3;
        }

        switch (review.state.toUpperCase()) {
          case "APPROVED":
            metrics.reviews.approved++;
            reviewBaseScore += this.config.scoring.review.approved;
            break;
          case "CHANGES_REQUESTED":
            metrics.reviews.changesRequested++;
            reviewBaseScore += this.config.scoring.review.changesRequested;
            // Changes requested reviews with detailed feedback are valued higher
            if (bodyLength > 200) {
              thoroughnessMultiplier *= 1.5;
            }
            break;
          default:
            metrics.reviews.commented++;
            reviewBaseScore += this.config.scoring.review.commented;
        }

        // Add points for detailed feedback
        const detailedFeedbackPoints = Math.min(
          bodyLength * this.config.scoring.review.detailedFeedbackMultiplier,
          8 // Cap detailed feedback points
        );

        // Calculate final review score
        reviewScore +=
          (reviewBaseScore + detailedFeedbackPoints) * thoroughnessMultiplier;
      }
    }

    // Get PR comment metrics for comments the user has made
    const prCommentsMade = await this.fetchPRComments(
      username,
      dateRange,
      repository
    );

    // Process PR comment metrics with diminishing returns
    let prCommentScore = 0;

    // Group comments by PR to implement per-thread caps
    const commentsByPR: Record<string, any[]> = {};

    for (const comment of prCommentsMade) {
      if (!commentsByPR[comment.prId]) {
        commentsByPR[comment.prId] = [];
      }
      commentsByPR[comment.prId].push(comment);
    }

    for (const [prId, comments] of Object.entries(commentsByPR)) {
      // Sort comments by creation date
      comments.sort((a, b) => {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      // Apply diminishing returns for subsequent comments
      let diminishingFactor = 1.0;

      for (let i = 0; i < comments.length; i++) {
        const comment = comments[i];
        metrics.comments.pullRequests++;
        metrics.comments.total++;

        if (i >= (this.config.scoring.comment.maxPerThread || 3)) {
          // Cap the number of scored comments per thread
          continue;
        }

        // Calculate comment score with diminishing returns
        const baseCommentScore =
          this.config.scoring.comment.base * diminishingFactor;

        // Add points for substantive comments
        const commentLength = comment.body?.length || 0;
        const substantivePoints = Math.min(
          commentLength * this.config.scoring.comment.substantiveMultiplier,
          3 * diminishingFactor // Cap substantive points
        );

        prCommentScore += baseCommentScore + substantivePoints;

        // Apply diminishing returns for subsequent comments
        diminishingFactor *=
          this.config.scoring.comment.diminishingReturns || 0.7;
      }
    }

    // Calculate code score with improved metrics
    const codeScore = this.calculateCodeScore(metrics.codeChanges, filePaths);

    // Calculate focus areas
    metrics.focusAreas = this.calculateFocusAreas(filePaths);

    // Calculate file types
    metrics.fileTypes = this.calculateFileTypes(filePaths);

    // Calculate expertise areas based on tag rules
    metrics.expertiseAreas = await this.calculateExpertiseAreas(
      username,
      filePaths,
      prTitles
    );

    // Calculate final score
    metrics.score = Math.round(
      prScore + issueScore + reviewScore + prCommentScore + codeScore
    );

    // Update user record with avatar URL
    await db
      .insert(users)
      .values({
        username: metrics.username,
        avatarUrl: metrics.avatarUrl || "",
        score: metrics.score,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          avatarUrl: metrics.avatarUrl || "",
          score: metrics.score,
          lastUpdated: new Date().toISOString(),
        },
      });

    return metrics;
  }

  /**
   * Helper method to fetch pull requests for a specific user
   */
  private async fetchPullRequests(
    username: string,
    dateRange: DateRange,
    repository: string
  ): Promise<any[]> {
    const { startDate, endDate } = dateRange;

    const conditions = [
      eq(rawPullRequests.author, username),
      gte(rawPullRequests.createdAt, startDate),
      lte(rawPullRequests.createdAt, endDate),
      eq(rawPullRequests.repository, repository),
    ];

    return db
      .select()
      .from(rawPullRequests)
      .where(and(...conditions))
      .all();
  }

  /**
   * Helper method to fetch issues for a specific user
   */
  private async fetchIssues(
    username: string,
    dateRange: DateRange,
    repository: string
  ) {
    const { startDate, endDate } = dateRange;

    const conditions = [
      eq(rawIssues.author, username),
      gte(rawIssues.createdAt, startDate),
      lte(rawIssues.createdAt, endDate),
      eq(rawIssues.repository, repository),
    ];

    return db
      .select()
      .from(rawIssues)
      .where(and(...conditions))
      .all();
  }

  /**
   * Fetch reviews given by a user in a timeframe
   */
  private async fetchGivenReviews(
    username: string,
    dateRange: DateRange,
    repository: string
  ) {
    const { startDate, endDate } = dateRange;

    const conditions = [
      eq(prReviews.author, username),
      gte(prReviews.submittedAt, startDate),
      lte(prReviews.submittedAt, endDate),
      eq(rawPullRequests.repository, repository),
    ];

    return db
      .select({
        id: prReviews.id,
        prId: prReviews.prId,
        author: prReviews.author,
        state: prReviews.state,
        body: prReviews.body,
        submittedAt: prReviews.submittedAt,
        lastUpdated: prReviews.lastUpdated,
      })
      .from(prReviews)
      .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
      .where(and(...conditions))
      .all();
  }

  /**
   * Fetch PR comments made by a user in a timeframe
   */
  private async fetchPRComments(
    username: string,
    dateRange: DateRange,
    repository: string
  ) {
    const { startDate, endDate } = dateRange;

    const conditions = [
      eq(prComments.author, username),
      gte(prComments.createdAt, startDate),
      lte(prComments.createdAt, endDate),
      eq(rawPullRequests.repository, repository),
    ];

    return db
      .select({
        id: prComments.id,
        prId: prComments.prId,
        author: prComments.author,
        body: prComments.body,
        createdAt: prComments.createdAt,
        updatedAt: prComments.updatedAt,
        lastUpdated: prComments.lastUpdated,
      })
      .from(prComments)
      .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
      .where(and(...conditions))
      .all();
  }

  /**
   * Calculate score for code changes
   */
  private calculateCodeScore(
    codeChanges: ContributorMetrics["codeChanges"],
    filePaths: string[]
  ): number {
    const { additions, deletions, files } = codeChanges;
    const {
      perLineAddition,
      perLineDeletion,
      perFile,
      maxLines,
      testCoverageBonus,
    } = this.config.scoring.codeChange;

    // Cap the number of lines to prevent extremely large PRs from skewing scores
    const cappedAdditions = Math.min(additions, maxLines);
    const cappedDeletions = Math.min(deletions, maxLines);

    // Base code score - deletions are worth more than additions
    let score =
      cappedAdditions * perLineAddition +
      cappedDeletions * perLineDeletion +
      files * perFile;

    // Bonus for test files (encouraging test coverage)
    const testFileCount = filePaths.filter(
      (path) =>
        path.includes(".test.") ||
        path.includes(".spec.") ||
        path.includes("/__tests__/") ||
        path.includes("/test/")
    ).length;

    if (testFileCount > 0) {
      const testBonus = testFileCount * (testCoverageBonus || 2.0);
      score += testBonus;
    }

    return score;
  }

  /**
   * Calculate focus areas based on file paths
   */
  private calculateFocusAreas(
    filePaths: string[]
  ): ContributorMetrics["focusAreas"] {
    const dirCounts: Record<string, number> = {};
    let totalFiles = 0;

    for (const filePath of filePaths) {
      const parts = filePath.split("/");
      if (parts.length > 1) {
        const topDir = parts[0];
        dirCounts[topDir] = (dirCounts[topDir] || 0) + 1;
        totalFiles++;
      }
    }

    // Calculate percentages and sort by count
    return Object.entries(dirCounts)
      .map(([area, count]) => ({
        area,
        count,
        percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 focus areas
  }

  /**
   * Calculate file types based on file extensions
   */
  private calculateFileTypes(
    filePaths: string[]
  ): ContributorMetrics["fileTypes"] {
    const extensionCounts: Record<string, number> = {};
    let totalFiles = 0;

    for (const filePath of filePaths) {
      const ext = path.extname(filePath);
      if (ext) {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        totalFiles++;
      }
    }

    // Calculate percentages and sort by count
    return Object.entries(extensionCounts)
      .map(([extension, count]) => ({
        extension,
        count,
        percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 file types
  }

  /**
   * Calculate expertise areas based on tag rules
   */
  private async calculateExpertiseAreas(
    username: string,
    filePaths: string[],
    prTitles: string[]
  ): Promise<ContributorMetrics["expertiseAreas"]> {
    const tagScores: Record<string, { score: number; category: string }> = {};
    const allTags = [
      ...this.config.tags.area,
      ...this.config.tags.role,
      ...this.config.tags.tech,
    ];

    // Apply tag rules to file paths
    for (const rule of allTags) {
      let score = 0;

      // Check file paths
      if (rule.category === "AREA" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const filePath of filePaths) {
            if (filePath.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      // Check PR titles
      if (rule.category === "ROLE" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const title of prTitles) {
            if (title.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      if (score > 0) {
        tagScores[rule.name] = {
          score,
          category: rule.category,
        };
      }
    }

    // Calculate levels for each tag
    const result: ContributorMetrics["expertiseAreas"] = [];

    for (const [tag, { score, category }] of Object.entries(tagScores)) {
      // Calculate level using logarithmic progression
      const level = Math.floor(Math.log(score + 1) / Math.log(2));
      const nextLevelThreshold = Math.pow(2, level + 1) - 1;
      const currentLevelThreshold = Math.pow(2, level) - 1;
      const progress =
        (score - currentLevelThreshold) /
        (nextLevelThreshold - currentLevelThreshold);

      result.push({
        tag,
        category,
        score,
        level,
        progress: Math.min(1, progress),
      });

      // Store in database for future reference
      await this.storeTagScore(username, tag, category, score, level, progress);
    }

    // Sort by score (highest first)
    return result.sort((a, b) => b.score - a.score);
  }

  /**
   * Store tag score in the database
   */
  private async storeTagScore(
    username: string,
    tag: string,
    category: string,
    score: number,
    level: number,
    progress: number
  ): Promise<void> {
    // Ensure tag exists in database
    await db
      .insert(tags)
      .values({
        name: tag,
        category,
        description: "",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: tags.name,
        set: {
          lastUpdated: new Date().toISOString(),
        },
      });

    // Store user tag score
    await db
      .insert(userTagScores)
      .values({
        id: `${username}_${tag}`,
        username,
        tag,
        score,
        level,
        progress,
        pointsToNext: Math.pow(2, level + 1) - 1,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: userTagScores.id,
        set: {
          score,
          level,
          progress,
          pointsToNext: Math.pow(2, level + 1) - 1,
          lastUpdated: new Date().toISOString(),
        },
      });
  }

  /**
   * Save daily summaries for contributors
   */
  private async saveDailySummaries(
    metrics: ContributorMetrics[],
    date: string
  ): Promise<void> {
    const dateStr = new Date(date).toISOString().split("T")[0];

    for (const metric of metrics) {
      // Create a structured daily summary
      const dailyData = {
        id: `${metric.username}_${dateStr}`,
        username: metric.username,
        date: dateStr,
        score: metric.score,
        summary: "", // Will be filled by AI summarization if enabled
        totalCommits: 0, // Will need to calculate from PR data
        totalPRs: metric.pullRequests.total,
        additions: metric.codeChanges.additions,
        deletions: metric.codeChanges.deletions,
        changedFiles: metric.codeChanges.files,
        commits: "[]", // JSON string
        pullRequests: "[]", // JSON string
        issues: "[]", // JSON string
      };

      // Store the daily summary
      await db
        .insert(userDailySummaries)
        .values(dailyData)
        .onConflictDoUpdate({
          target: userDailySummaries.id,
          set: {
            score: metric.score,
            totalPRs: metric.pullRequests.total,
            additions: metric.codeChanges.additions,
            deletions: metric.codeChanges.deletions,
            changedFiles: metric.codeChanges.files,
          },
        });

      // Create file type data for storing in stats
      const filesByTypeObj: Record<string, number> = {};
      metric.fileTypes.forEach(({ extension, count }) => {
        filesByTypeObj[extension] = count;
      });

      // Create focus area data for storing in stats
      const focusAreasArray = metric.focusAreas.map(({ area, count }) => [
        area,
        count,
      ]);

      // Update user stats
      await db
        .insert(userStats)
        .values({
          username: metric.username,
          totalPRs: metric.pullRequests.total,
          mergedPRs: metric.pullRequests.merged,
          closedPRs: metric.pullRequests.closed,
          totalFiles: metric.codeChanges.files,
          totalAdditions: metric.codeChanges.additions,
          totalDeletions: metric.codeChanges.deletions,
          filesByType: JSON.stringify(filesByTypeObj),
          prsByMonth: "{}", // Would need to group PRs by month
          focusAreas: JSON.stringify(focusAreasArray),
          lastUpdated: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: userStats.username,
          set: {
            totalPRs: metric.pullRequests.total,
            mergedPRs: metric.pullRequests.merged,
            closedPRs: metric.pullRequests.closed,
            totalFiles: metric.codeChanges.files,
            totalAdditions: metric.codeChanges.additions,
            totalDeletions: metric.codeChanges.deletions,
            filesByType: JSON.stringify(filesByTypeObj),
            focusAreas: JSON.stringify(focusAreasArray),
            lastUpdated: new Date().toISOString(),
          },
        });
    }
  }
}
