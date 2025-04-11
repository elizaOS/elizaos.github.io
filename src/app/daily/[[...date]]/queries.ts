import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  rawPullRequests,
  rawIssues,
  rawCommits,
  prReviews,
  issueComments,
  prComments,
  rawPullRequestFiles,
  users,
} from "@/lib/data/schema";

/**
 * Get daily metrics for repositories for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @returns Object with numeric properties for daily metrics
 */
export async function getDailyMetrics(date: string) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  // Create date range for the specific day (00:00:00Z to 23:59:59Z)
  const startDate = `${date}T00:00:00Z`;
  const endDate = `${date}T23:59:59Z`;

  // Get PRs created in this period
  const newPRsCount = await db
    .select({ count: count() })
    .from(rawPullRequests)
    .where(
      and(
        gte(rawPullRequests.createdAt, startDate),
        lte(rawPullRequests.createdAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  // Get PRs merged in this period
  const mergedPRsCount = await db
    .select({ count: count() })
    .from(rawPullRequests)
    .where(
      and(
        gte(rawPullRequests.mergedAt, startDate),
        lte(rawPullRequests.mergedAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  // Get issues created in this period
  const newIssuesCount = await db
    .select({ count: count() })
    .from(rawIssues)
    .where(
      and(
        gte(rawIssues.createdAt, startDate),
        lte(rawIssues.createdAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  // Get issues closed in this period
  const closedIssuesCount = await db
    .select({ count: count() })
    .from(rawIssues)
    .where(
      and(gte(rawIssues.closedAt, startDate), lte(rawIssues.closedAt, endDate)),
    )
    .then((result) => result[0]?.count || 0);

  // Get active contributors (users who performed any activity on this day)
  const activeUsernames = new Set<string>();

  // PR authors
  const prAuthors = await db
    .select({ author: rawPullRequests.author })
    .from(rawPullRequests)
    .where(
      and(
        gte(rawPullRequests.createdAt, startDate),
        lte(rawPullRequests.createdAt, endDate),
      ),
    );

  prAuthors.forEach((author) => {
    if (author.author) activeUsernames.add(author.author);
  });

  // Issue authors
  const issueAuthors = await db
    .select({ author: rawIssues.author })
    .from(rawIssues)
    .where(
      and(
        gte(rawIssues.createdAt, startDate),
        lte(rawIssues.createdAt, endDate),
      ),
    );

  issueAuthors.forEach((author) => {
    if (author.author) activeUsernames.add(author.author);
  });

  // Reviewers
  const reviewers = await db
    .select({ author: prReviews.author })
    .from(prReviews)
    .where(
      and(
        gte(prReviews.createdAt, startDate),
        lte(prReviews.createdAt, endDate),
      ),
    );

  reviewers.forEach((reviewer) => {
    if (reviewer.author) activeUsernames.add(reviewer.author);
  });

  // Commenters (PR comments)
  const prCommenters = await db
    .select({ author: prComments.author })
    .from(prComments)
    .where(
      and(
        gte(prComments.createdAt, startDate),
        lte(prComments.createdAt, endDate),
      ),
    );

  prCommenters.forEach((commenter) => {
    if (commenter.author) activeUsernames.add(commenter.author);
  });

  // Commenters (Issue comments)
  const issueCommenters = await db
    .select({ author: issueComments.author })
    .from(issueComments)
    .where(
      and(
        gte(issueComments.createdAt, startDate),
        lte(issueComments.createdAt, endDate),
      ),
    );

  issueCommenters.forEach((commenter) => {
    if (commenter.author) activeUsernames.add(commenter.author);
  });

  // Committers
  const committers = await db
    .select({ author: rawCommits.author })
    .from(rawCommits)
    .where(
      and(
        gte(rawCommits.committedDate, startDate),
        lte(rawCommits.committedDate, endDate),
      ),
    );

  committers.forEach((committer) => {
    if (committer.author) activeUsernames.add(committer.author);
  });

  // Filter out bot users
  const realUsernames =
    activeUsernames.size > 0
      ? await db
          .select({ username: users.username })
          .from(users)
          .where(
            and(
              inArray(users.username, Array.from(activeUsernames)),
              eq(users.isBot, 0),
            ),
          )
          .then((results) => results.map((r) => r.username))
      : [];

  // Calculate code changes
  const commits = await db
    .select({
      additions: rawCommits.additions,
      deletions: rawCommits.deletions,
    })
    .from(rawCommits)
    .where(
      and(
        gte(rawCommits.committedDate, startDate),
        lte(rawCommits.committedDate, endDate),
      ),
    );

  const totalAdditions = commits.reduce(
    (sum, commit) => sum + (commit.additions || 0),
    0,
  );

  const totalDeletions = commits.reduce(
    (sum, commit) => sum + (commit.deletions || 0),
    0,
  );

  // Count files changed
  const mergedPRs = await db
    .select({ id: rawPullRequests.id })
    .from(rawPullRequests)
    .where(
      and(
        gte(rawPullRequests.mergedAt, startDate),
        lte(rawPullRequests.mergedAt, endDate),
      ),
    );

  const prIds = mergedPRs.map((pr) => pr.id);

  const filesChanged =
    prIds.length > 0
      ? await db
          .selectDistinct({ path: rawPullRequestFiles.path })
          .from(rawPullRequestFiles)
          .where(inArray(rawPullRequestFiles.prId, prIds))
          .then((results) => results.length)
      : 0;

  // Get comment counts
  const prCommentCount = await db
    .select({ count: count() })
    .from(prComments)
    .where(
      and(
        gte(prComments.createdAt, startDate),
        lte(prComments.createdAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  const issueCommentCount = await db
    .select({ count: count() })
    .from(issueComments)
    .where(
      and(
        gte(issueComments.createdAt, startDate),
        lte(issueComments.createdAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  const reviewCount = await db
    .select({ count: count() })
    .from(prReviews)
    .where(
      and(
        gte(prReviews.createdAt, startDate),
        lte(prReviews.createdAt, endDate),
      ),
    )
    .then((result) => result[0]?.count || 0);

  // Return all collected metrics
  return {
    date,
    pullRequests: {
      new: newPRsCount,
      merged: mergedPRsCount,
    },
    issues: {
      new: newIssuesCount,
      closed: closedIssuesCount,
    },
    activeContributors: realUsernames.length,
    codeChanges: {
      additions: totalAdditions,
      deletions: totalDeletions,
      files: filesChanged,
      commits: commits.length,
    },
    comments: {
      prComments: prCommentCount,
      issueComments: issueCommentCount,
      reviews: reviewCount,
    },
    totalActivity:
      newPRsCount +
      mergedPRsCount +
      newIssuesCount +
      closedIssuesCount +
      prCommentCount +
      issueCommentCount +
      reviewCount +
      commits.length,
  };
}

/**
 * Type definition for the daily metrics result
 */
export type DailyMetrics = Awaited<ReturnType<typeof getDailyMetrics>>;
