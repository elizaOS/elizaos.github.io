import { eq, and, inArray, isNotNull, sql, ne } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  users,
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  rawCommits,
  rawPullRequestFiles,
  userSummaries,
  repoSummaries,
  prClosingIssueReferences,
} from "@/lib/data/schema";
import {
  buildAreaMap,
  categorizeWorkItem,
} from "@/lib/pipelines/codeAreaHelpers";
import { UTCDate } from "@date-fns/utc";
import { buildCommonWhereConditions } from "../queryHelpers";
import { TimeInterval, toDateString, RepoIntervalType } from "@/lib/date-utils";

/**
 * Get metrics for a contributor within a time range
 */
export async function getContributorMetrics({
  username,
  dateRange,
}: {
  username: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}) {
  // Ensure contributor exists
  const contributor = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!contributor) {
    throw new Error(`Contributor ${username} not found`);
  }

  // Get pull requests for this contributor in the time range
  const prs = await db.query.rawPullRequests.findMany({
    where: and(
      eq(rawPullRequests.author, username),
      ...buildCommonWhereConditions({ dateRange }, rawPullRequests, [
        "createdAt",
      ]),
    ),
    with: {
      commits: true,
    },
  });

  // Count merged and open PRs
  const mergedPRs = prs.filter((pr) => pr.merged === 1);
  const openPRs = prs.filter((pr) => pr.merged !== 1);

  // Calculate average PR size and time to merge
  const prMetrics = {
    avgAdditions: 0,
    avgDeletions: 0,
    avgTimeToMerge: 0,
    largestPR: {
      number: 0,
      title: "",
      additions: 0,
      deletions: 0,
      repository: "",
    },
  };

  if (mergedPRs.length > 0) {
    const totalAdditions = mergedPRs.reduce(
      (sum, pr) => sum + (pr.additions || 0),
      0,
    );
    const totalDeletions = mergedPRs.reduce(
      (sum, pr) => sum + (pr.deletions || 0),
      0,
    );
    prMetrics.avgAdditions = Math.round(totalAdditions / mergedPRs.length);
    prMetrics.avgDeletions = Math.round(totalDeletions / mergedPRs.length);

    // Calculate time to merge (in hours)
    let totalTimeToMerge = 0;
    let mergedPRsWithTimes = 0;

    for (const pr of mergedPRs) {
      if (pr.createdAt && pr.mergedAt) {
        const created = new UTCDate(pr.createdAt).getTime();
        const merged = new UTCDate(pr.mergedAt).getTime();
        const hoursToMerge = Math.round((merged - created) / (1000 * 60 * 60));

        totalTimeToMerge += hoursToMerge;
        mergedPRsWithTimes++;
      }
    }

    if (mergedPRsWithTimes > 0) {
      prMetrics.avgTimeToMerge = Math.round(
        totalTimeToMerge / mergedPRsWithTimes,
      );
    }

    // Find largest PR
    let maxChanges = 0;
    for (const pr of mergedPRs) {
      const changes = (pr.additions || 0) + (pr.deletions || 0);
      if (changes > maxChanges) {
        maxChanges = changes;
        prMetrics.largestPR = {
          number: pr.number,
          title: pr.title,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          repository: pr.repository,
        };
      }
    }
  }

  // Get PR files to analyze types of changes
  const allPrIds = prs.map((pr) => pr.id);
  const prFiles =
    allPrIds.length > 0
      ? await db.query.rawPullRequestFiles.findMany({
          where: inArray(rawPullRequestFiles.prId, allPrIds),
        })
      : [];

  // Analyze types of files changed
  const fileTypeAnalysis = {
    code: 0,
    tests: 0,
    docs: 0,
    config: 0,
    other: 0,
  };

  prFiles.forEach((file) => {
    const path = file.path.toLowerCase();
    if (
      path.includes("test") ||
      path.includes("spec") ||
      path.endsWith(".test.ts") ||
      path.endsWith(".spec.ts")
    ) {
      fileTypeAnalysis.tests++;
    } else if (
      path.endsWith(".md") ||
      path.endsWith(".mdx") ||
      path.includes("/docs/")
    ) {
      fileTypeAnalysis.docs++;
    } else if (
      path.endsWith(".json") ||
      path.endsWith(".yml") ||
      path.endsWith(".yaml") ||
      path.endsWith(".config.js") ||
      path.endsWith(".config.ts")
    ) {
      fileTypeAnalysis.config++;
    } else if (
      path.endsWith(".ts") ||
      path.endsWith(".js") ||
      path.endsWith(".tsx") ||
      path.endsWith(".jsx") ||
      path.endsWith(".go") ||
      path.endsWith(".py") ||
      path.endsWith(".java") ||
      path.endsWith(".c") ||
      path.endsWith(".cpp")
    ) {
      fileTypeAnalysis.code++;
    } else {
      fileTypeAnalysis.other++;
    }
  });

  // Get issues
  const contributorIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.author, username),
      ...buildCommonWhereConditions({ dateRange }, rawIssues, [
        "createdAt",
        "closedAt",
      ]),
    ),
  });

  // Get closed issues
  const closedIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.author, username),
      ...buildCommonWhereConditions({ dateRange }, rawIssues, ["closedAt"]),
      eq(rawIssues.state, "CLOSED"),
    ),
  });

  // Get issue comments
  const issueInteractions = await db.query.issueComments.findMany({
    where: and(
      eq(issueComments.author, username),
      ...buildCommonWhereConditions({ dateRange }, issueComments, [
        "createdAt",
      ]),
    ),
    with: {
      issue: true,
    },
  });

  // Get reviews
  const contributorReviews = await db.query.prReviews.findMany({
    where: and(
      eq(prReviews.author, username),
      ...buildCommonWhereConditions({ dateRange }, prReviews, ["createdAt"]),
    ),
    with: {
      pullRequest: true,
    },
  });

  // Count review types
  const approved = contributorReviews.filter(
    (r) => r.state === "APPROVED",
  ).length;
  const changesRequested = contributorReviews.filter(
    (r) => r.state === "CHANGES_REQUESTED",
  ).length;
  const commented = contributorReviews.filter(
    (r) => r.state === "COMMENTED",
  ).length;

  // Get PR comments
  const prCommentData = await db.query.prComments.findMany({
    where: and(
      eq(prComments.author, username),
      ...buildCommonWhereConditions({ dateRange }, prComments, ["createdAt"]),
    ),
    with: {
      pullRequest: true,
    },
  });

  // Get code changes from commits
  const contributorCommits = await db.query.rawCommits.findMany({
    where: and(
      eq(rawCommits.author, username),
      ...buildCommonWhereConditions({ dateRange }, rawCommits, [
        "committedDate",
      ]),
    ),
    with: {
      files: true,
    },
  });

  // Calculate code changes
  const additions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.additions || 0),
    0,
  );
  const deletions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.deletions || 0),
    0,
  );
  const files = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.changedFiles || 0),
    0,
  );

  // Analyze commit messages for work types
  const commitTypes = {
    feature: 0,
    bugfix: 0,
    refactor: 0,
    docs: 0,
    tests: 0,
    other: 0,
  };

  contributorCommits.forEach((commit) => {
    const type = categorizeWorkItem(commit.message || "");

    // Make sure the type exists in commitTypes, or use 'other' as fallback
    const typeKey = type in commitTypes ? type : "other";
    commitTypes[typeKey as keyof typeof commitTypes]++;
  });

  // Calculate focus areas based on file paths in commits
  const commitFiles = contributorCommits.flatMap(
    (commit) => commit.files || [],
  );
  const areaMap = buildAreaMap(commitFiles);

  const focusAreas = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate work frequency patterns
  const commitDates = contributorCommits.map(
    (c) => new UTCDate(c.committedDate).toISOString().split("T")[0],
  );
  const uniqueDaysWithCommits = new Set(commitDates).size;
  const totalDays = Math.max(
    1,
    Math.ceil(
      (new UTCDate(dateRange.endDate).getTime() -
        new UTCDate(dateRange.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const commitFrequency = uniqueDaysWithCommits / totalDays;

  // === STRATEGIC METRICS FOR LIFETIME BRIEFINGS ===

  // 1. Bus Factor: Get total merged PRs per repo to compute this user's ownership %
  const userRepos = [...new Set(mergedPRs.map((pr) => pr.repository))];
  const busFactorByRepo: Array<{
    repo: string;
    userPRs: number;
    totalPRs: number;
    percentage: number;
  }> = [];

  if (userRepos.length > 0) {
    // Get total merged PRs per repo (all contributors)
    const repoTotals = await db
      .select({
        repository: rawPullRequests.repository,
        totalPRs: sql<number>`COUNT(*)`,
      })
      .from(rawPullRequests)
      .where(
        and(
          inArray(rawPullRequests.repository, userRepos),
          eq(rawPullRequests.merged, 1),
        ),
      )
      .groupBy(rawPullRequests.repository);

    const repoTotalsMap = new Map(
      repoTotals.map((r) => [r.repository, r.totalPRs]),
    );

    // Calculate percentage for each repo
    const userPRsByRepo = new Map<string, number>();
    for (const pr of mergedPRs) {
      userPRsByRepo.set(
        pr.repository,
        (userPRsByRepo.get(pr.repository) || 0) + 1,
      );
    }

    for (const [repo, userPRCount] of userPRsByRepo) {
      const totalPRs = repoTotalsMap.get(repo) || userPRCount;
      busFactorByRepo.push({
        repo,
        userPRs: userPRCount,
        totalPRs,
        percentage: Math.round((userPRCount / totalPRs) * 100),
      });
    }

    // Sort by percentage descending
    busFactorByRepo.sort((a, b) => b.percentage - a.percentage);
  }

  // 2. Issue-PR Linkage: How many of their PRs close tracked issues?
  const prIdsForLinkage = mergedPRs.map((pr) => pr.id);
  let issuesLinkedCount = 0;
  let linkedIssues: Array<{
    prNumber: number;
    issueNumber: number;
    issueTitle: string;
  }> = [];

  if (prIdsForLinkage.length > 0) {
    const linkages = await db
      .select({
        prId: prClosingIssueReferences.prId,
        issueNumber: prClosingIssueReferences.issueNumber,
        issueTitle: prClosingIssueReferences.issueTitle,
      })
      .from(prClosingIssueReferences)
      .where(inArray(prClosingIssueReferences.prId, prIdsForLinkage));

    issuesLinkedCount = new Set(linkages.map((l) => l.prId)).size;

    // Get PR numbers for the linked PRs
    const prIdToNumber = new Map(mergedPRs.map((pr) => [pr.id, pr.number]));
    linkedIssues = linkages.map((l) => ({
      prNumber: prIdToNumber.get(l.prId) || 0,
      issueNumber: l.issueNumber,
      issueTitle: l.issueTitle,
    }));
  }

  const issueLinkageRate =
    mergedPRs.length > 0
      ? Math.round((issuesLinkedCount / mergedPRs.length) * 100)
      : 0;

  // 3. Collaboration Network: Who reviews their PRs?
  const reviewersOfTheirPRs: Array<{
    reviewer: string;
    reviewCount: number;
    approvals: number;
    changeRequests: number;
  }> = [];

  if (allPrIds.length > 0) {
    const reviewsOnTheirPRs = await db
      .select({
        reviewer: prReviews.author,
        state: prReviews.state,
      })
      .from(prReviews)
      .where(
        and(
          inArray(prReviews.prId, allPrIds),
          isNotNull(prReviews.author),
          ne(prReviews.author, username), // Exclude self-reviews
        ),
      );

    // Aggregate by reviewer
    const reviewerStats = new Map<
      string,
      { count: number; approvals: number; changeRequests: number }
    >();

    for (const review of reviewsOnTheirPRs) {
      if (!review.reviewer) continue;
      const stats = reviewerStats.get(review.reviewer) || {
        count: 0,
        approvals: 0,
        changeRequests: 0,
      };
      stats.count++;
      if (review.state === "APPROVED") stats.approvals++;
      if (review.state === "CHANGES_REQUESTED") stats.changeRequests++;
      reviewerStats.set(review.reviewer, stats);
    }

    for (const [reviewer, stats] of reviewerStats) {
      reviewersOfTheirPRs.push({
        reviewer,
        reviewCount: stats.count,
        approvals: stats.approvals,
        changeRequests: stats.changeRequests,
      });
    }

    // Sort by review count descending
    reviewersOfTheirPRs.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  return {
    username,
    pullRequests: {
      total: prs.length,
      merged: mergedPRs.length,
      open: openPRs.length,
      items: prs,
      metrics: prMetrics,
      fileTypes: fileTypeAnalysis,
    },
    issues: {
      total: contributorIssues.length,
      opened: contributorIssues.length,
      closed: closedIssues.length,
      commented: issueInteractions.length,
      items: contributorIssues,
    },
    reviews: {
      total: contributorReviews.length,
      approved,
      changesRequested,
      commented,
      items: contributorReviews,
    },
    comments: {
      prComments: prCommentData.length,
      issueComments: issueInteractions.length,
      total: prCommentData.length + issueInteractions.length,
    },
    codeChanges: {
      additions,
      deletions,
      files,
      commitCount: contributorCommits.length,
      commitTypes,
    },
    focusAreas,
    activityPattern: {
      daysActive: uniqueDaysWithCommits,
      totalDays,
      frequency: commitFrequency,
    },
    // Strategic metrics for lifetime briefings
    strategicMetrics: {
      busFactor: busFactorByRepo,
      issueLinkage: {
        linkedPRs: issuesLinkedCount,
        totalMergedPRs: mergedPRs.length,
        rate: issueLinkageRate,
        linkedIssues,
      },
      collaborationNetwork: {
        reviewersOfTheirPRs,
        totalReviewers: reviewersOfTheirPRs.length,
      },
    },
  };
}

/**
 * Get summaries for a list of contributors for a specific interval.
 */
export async function getContributorSummariesForInterval(
  usernames: string[],
  interval: TimeInterval,
): Promise<Map<string, string | null>> {
  console.log(
    `[getContributorSummariesForInterval] Fetching for usernames: ${usernames.join(", ")}, intervalType: ${interval.intervalType}, intervalStart: ${toDateString(interval.intervalStart)}`,
  );
  if (usernames.length === 0) {
    console.log(
      "[getContributorSummariesForInterval] No usernames provided, returning empty map.",
    );
    return new Map<string, string | null>();
  }

  const intervalStartDateString = toDateString(interval.intervalStart);

  const summaries = await db
    .select({
      username: userSummaries.username,
      summary: userSummaries.summary,
    })
    .from(userSummaries)
    .where(
      and(
        inArray(userSummaries.username, usernames),
        eq(userSummaries.intervalType, interval.intervalType),
        eq(userSummaries.date, intervalStartDateString),
      ),
    );

  const summariesMap = new Map<string, string | null>();
  for (const s of summaries) {
    if (s.username != null) {
      summariesMap.set(s.username, s.summary ?? null);
    }
  }
  console.log(
    `[getContributorSummariesForInterval] Found ${summariesMap.size} summaries for ${usernames.length} requested users.`,
  );
  return summariesMap;
}

/**
 * Get repository summaries for a given interval (e.g., all daily summaries for a week/month).
 */
export async function getRepoSummariesForInterval(
  repoId: string,
  interval: TimeInterval,
): Promise<{ date: string; summary: string }[]> {
  console.log(
    `[getRepoSummariesForInterval] Fetching for repoId: ${repoId}, intervalType: day, from ${toDateString(interval.intervalStart)} to ${toDateString(interval.intervalEnd)}`,
  );

  const summaries = await db
    .select({
      date: repoSummaries.date,
      summary: repoSummaries.summary,
    })
    .from(repoSummaries)
    .where(
      and(
        eq(repoSummaries.repoId, repoId),
        eq(repoSummaries.intervalType, "day"), // We fetch daily summaries for aggregation
        // Date range for the weekly/monthly interval
        ...buildCommonWhereConditions(
          {
            dateRange: {
              startDate: toDateString(interval.intervalStart),
              endDate: toDateString(interval.intervalEnd),
            },
          },
          repoSummaries,
          ["date"],
        ),
      ),
    )
    .orderBy(repoSummaries.date);

  console.log(
    `[getRepoSummariesForInterval] Found ${summaries.length} daily summaries for interval.`,
  );

  // Filter out any null summaries and ensure all summaries are strings
  return summaries
    .filter((s) => s.summary !== null && s.summary !== "")
    .map((s) => ({
      date: s.date,
      summary: s.summary ?? "", // This is redundant due to filter but TypeScript needs it
    }));
}

/**
 * Get repositories with activity in a specific time interval
 */
export async function getActiveReposInInterval(
  interval: TimeInterval,
): Promise<string[]> {
  const dateRange = {
    startDate: toDateString(interval.intervalStart),
    endDate: toDateString(interval.intervalEnd),
  };

  // Get repo IDs from PRs created, merged, or closed in the interval
  const prRepoIds = await db
    .selectDistinct({ repoId: rawPullRequests.repository })
    .from(rawPullRequests)
    .where(
      and(
        ...buildCommonWhereConditions({ dateRange }, rawPullRequests, [
          "createdAt",
          "mergedAt",
          "closedAt",
        ]),
      ),
    );

  // Get repo IDs from issues created or closed in the interval
  const issueRepoIds = await db
    .selectDistinct({ repoId: rawIssues.repository })
    .from(rawIssues)
    .where(
      and(
        ...buildCommonWhereConditions({ dateRange }, rawIssues, [
          "createdAt",
          "closedAt",
        ]),
      ),
    );

  const activeRepoIds = new Set([
    ...prRepoIds.map((r) => r.repoId),
    ...issueRepoIds.map((r) => r.repoId),
  ]);

  return Array.from(activeRepoIds);
}

/**
 * Get all repository summaries for a specific time interval
 */
export async function getAllRepoSummariesForInterval(
  interval: TimeInterval,
): Promise<{ repoId: string; summary: string }[]> {
  const summaries = await db.query.repoSummaries.findMany({
    where: and(
      eq(repoSummaries.intervalType, interval.intervalType as RepoIntervalType),
      eq(repoSummaries.date, toDateString(interval.intervalStart)),
      isNotNull(repoSummaries.summary),
    ),
    columns: {
      repoId: true,
      summary: true,
    },
  });

  return summaries.filter((s): s is { repoId: string; summary: string } =>
    Boolean(s.summary),
  );
}
