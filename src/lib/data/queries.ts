import { desc, eq, sql, and, or, SQL } from "drizzle-orm";
import { db } from "./db";
import {
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  rawPullRequestFiles,
} from "./schema";
import { DateRange } from "./types";
import path from "path";

/**
 * Standard query parameters used across different queries
 */
export interface QueryParams {
  dateRange?: DateRange;
  repository?: string;
}
export interface PaginatedQueryParams extends QueryParams {
  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * Helper function to build date range conditions for different date fields
 */
function buildDateRangeConditions<T extends { [key: string]: unknown }>(
  dateRange: DateRange,
  table: T,
  dateFields: (keyof T)[]
): SQL[] {
  if (!dateRange) return [];

  const { startDate, endDate } = dateRange;
  const conditions = dateFields.map(
    (field) =>
      sql`${table[field]} >= ${startDate} AND ${table[field]} <= ${endDate}`
  );

  // At least one date field should match the range
  return [sql`(${or(...conditions)})`];
}

/**
 * Helper function to build common where conditions based on query params
 */
function buildCommonWhereConditions<
  T extends { createdAt?: unknown; repository?: unknown }
>(
  params: QueryParams,
  table: T,
  dateFields: (keyof T)[] = ["createdAt"]
): SQL[] {
  const conditions: SQL[] = [];

  if (params.dateRange) {
    conditions.push(
      ...buildDateRangeConditions(params.dateRange, table as any, dateFields)
    );
  }

  if (params.repository) {
    conditions.push(sql`${table.repository} = ${params.repository}`);
  }

  return conditions;
}

/**
 * Get PR data and file paths for a contributor
 */
export async function getContributorPRs(
  username: string,
  params: PaginatedQueryParams = {}
) {
  const whereConditions = [
    eq(rawPullRequests.author, username),
    ...buildCommonWhereConditions(params, rawPullRequests),
  ];

  return db.query.rawPullRequests.findMany({
    where: and(...whereConditions),
    limit: params.limit,
    offset: params.offset,
    orderBy: [desc(rawPullRequests.createdAt)],
    with: {
      files: true,
    },
  });
}

/**
 * Calculate focus areas for a contributor based on their PR file paths
 */
export interface FocusArea {
  area: string;
  count: number;
  percentage: number;
}

export async function getContributorFocusAreas(
  username: string,
  params: QueryParams = {}
): Promise<FocusArea[]> {
  // Fetch PRs with their files
  const contributorPRs = await getContributorPRs(username, params);

  // Extract file paths from PRs
  const filePaths = contributorPRs.flatMap((pr) => {
    if (pr.files) {
      return pr.files.map((f: any) => f.path);
    }
    return [];
  });

  // Count occurrences of top-level directories
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
 * Calculate file types for a contributor based on PR file extensions
 */
export interface FileType {
  extension: string;
  count: number;
  percentage: number;
}

export async function getContributorFileTypes(
  username: string,
  params: QueryParams = {}
): Promise<FileType[]> {
  // Fetch PRs with their files
  const contributorPRs = await getContributorPRs(username, params);

  // Extract file paths from PRs
  const filePaths = contributorPRs.flatMap((pr) => {
    if (pr.files) {
      return pr.files.map((f: any) => f.path);
    }
    return [];
  });

  // Count occurrences of file extensions
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
 * Get aggregated pull request metrics for a contributor
 */
export async function getContributorPRMetrics(
  username: string,
  params: QueryParams = {}
) {
  const whereConditions = [
    eq(rawPullRequests.author, username),
    ...buildCommonWhereConditions(params, rawPullRequests),
  ];

  const metrics = await db
    .select({
      total: sql`COUNT(*)`,
      merged: sql`SUM(CASE WHEN ${rawPullRequests.merged} = 1 THEN 1 ELSE 0 END)`,
      open: sql`SUM(CASE WHEN UPPER(${rawPullRequests.state}) = 'OPEN' THEN 1 ELSE 0 END)`,
      closed: sql`SUM(CASE WHEN UPPER(${rawPullRequests.state}) = 'CLOSED' AND ${rawPullRequests.merged} = 0 THEN 1 ELSE 0 END)`,
      additions: sql`SUM(${rawPullRequests.additions})`,
      deletions: sql`SUM(${rawPullRequests.deletions})`,
      changedFiles: sql`SUM(${rawPullRequests.changedFiles})`,
    })
    .from(rawPullRequests)
    .where(and(...whereConditions))
    .get();

  return {
    total: Number(metrics?.total || 0),
    merged: Number(metrics?.merged || 0),
    open: Number(metrics?.open || 0),
    closed: Number(metrics?.closed || 0),
    additions: Number(metrics?.additions || 0),
    deletions: Number(metrics?.deletions || 0),
    changedFiles: Number(metrics?.changedFiles || 0),
  };
}

/**
 * Get aggregated issue metrics for a contributor
 */
export async function getContributorIssueMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions
  const whereConditions = [
    eq(rawIssues.author, username),
    ...buildCommonWhereConditions(params, rawIssues),
  ];

  const issueMetrics = await db
    .select({
      total: sql`COUNT(*)`,
      open: sql`SUM(CASE WHEN UPPER(${rawIssues.state}) = 'OPEN' THEN 1 ELSE 0 END)`,
      closed: sql`SUM(CASE WHEN UPPER(${rawIssues.state}) = 'CLOSED' THEN 1 ELSE 0 END)`,
    })
    .from(rawIssues)
    .where(and(...whereConditions))
    .get();

  // Get issue IDs for comment count with optional limit
  const query = db
    .select({
      id: rawIssues.id,
    })
    .from(rawIssues)
    .where(and(...whereConditions));

  const issues = await query.all();

  const issueIds = issues.map((issue) => issue.id);

  // Get comment count
  const commentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(issueComments)
    .where(sql`${issueComments.issueId} IN ${issueIds}`)
    .get();

  return {
    total: Number(issueMetrics?.total || 0),
    open: Number(issueMetrics?.open || 0),
    closed: Number(issueMetrics?.closed || 0),
    commentCount: Number(commentCount?.count || 0),
  };
}

/**
 * Get aggregated review metrics for a contributor
 */
export async function getContributorReviewMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions for reviews
  const whereConditions = [
    eq(prReviews.author, username),
    ...buildCommonWhereConditions(params, prReviews),
  ];
  if (params.repository) {
    whereConditions.push(
      sql`${rawPullRequests.repository} = ${params.repository}`
    );
  }

  const reviewMetrics = await db
    .select({
      total: sql`COUNT(*)`,
      approved: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'APPROVED' THEN 1 ELSE 0 END)`,
      commented: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'COMMENTED' THEN 1 ELSE 0 END)`,
      changesRequested: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'CHANGES_REQUESTED' THEN 1 ELSE 0 END)`,
    })
    .from(prReviews)
    .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
    .where(and(...whereConditions))
    .get();

  return {
    total: Number(reviewMetrics?.total || 0),
    approved: Number(reviewMetrics?.approved || 0),
    commented: Number(reviewMetrics?.commented || 0),
    changesRequested: Number(reviewMetrics?.changesRequested || 0),
  };
}

/**
 * Get aggregated comment metrics for a contributor
 */
export async function getContributorCommentMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions for reviews
  const prWhereConditions = [
    eq(prComments.author, username),
    ...buildCommonWhereConditions(params, prComments),
  ];

  if (params.repository) {
    prWhereConditions.push(
      sql`${rawPullRequests.repository} = ${params.repository}`
    );
  }

  // Get PR comment count
  const prCommentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(prComments)
    .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
    .where(and(...prWhereConditions))
    .get();

  // Build where conditions for issue comments
  const issueWhereConditions = [
    eq(issueComments.author, username),
    ...buildCommonWhereConditions(params, issueComments),
  ];

  if (params.repository) {
    issueWhereConditions.push(
      sql`${rawIssues.repository} = ${params.repository}`
    );
  }

  // Get issue comment count
  const issueCommentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(issueComments)
    .innerJoin(rawIssues, eq(issueComments.issueId, rawIssues.id))
    .where(and(...issueWhereConditions))
    .get();

  return {
    pullRequests: Number(prCommentCount?.count || 0),
    issues: Number(issueCommentCount?.count || 0),
  };
}

/**
 * Get active contributors in a time period
 */
export async function getActiveContributors(
  params: PaginatedQueryParams = {}
): Promise<string[]> {
  // Simplified approach: Query each table separately and combine results
  const contributorSets: Set<string> = new Set();

  // Helper function to fetch contributors from a table
  async function fetchContributorsFromTable(
    tableName: string,
    table: any,
    authorField: any,
    repoField: any,
    dateField: any
  ) {
    try {
      const whereConditions: SQL[] = [];

      if (params.repository) {
        whereConditions.push(sql`${repoField} = ${params.repository}`);
      }

      if (params.dateRange) {
        const { startDate, endDate } = params.dateRange;
        whereConditions.push(
          sql`${dateField} BETWEEN ${startDate} AND ${endDate}`
        );
      }

      whereConditions.push(
        sql`${authorField} NOT IN ('unknown', '[deleted]', '')`
      );

      const query = db
        .select({
          author: authorField,
        })
        .from(table)
        .where(and(...whereConditions))
        .groupBy(authorField);

      if (params.limit) {
        query.limit(params.limit);
      }

      const result = await query.all();
      result.forEach((row) => {
        if (row.author) {
          contributorSets.add(row.author);
        }
      });
    } catch (error) {
      console.error(`Error fetching contributors from ${tableName}:`, error);
    }
  }

  // Fetch contributors from each table in sequence
  await fetchContributorsFromTable(
    "raw_pull_requests",
    rawPullRequests,
    rawPullRequests.author,
    rawPullRequests.repository,
    rawPullRequests.createdAt
  );

  await fetchContributorsFromTable(
    "raw_issues",
    rawIssues,
    rawIssues.author,
    rawIssues.repository,
    rawIssues.createdAt
  );

  return Array.from(contributorSets);
}

/**
 * Get top pull requests for a repository in a time period
 */
export async function getTopPullRequests(params: QueryParams = {}, limit = 5) {
  const whereConditions = buildCommonWhereConditions(params, rawPullRequests, [
    "createdAt",
    "mergedAt",
    "closedAt",
  ]);

  const prs = await db
    .select({
      id: rawPullRequests.id,
      title: rawPullRequests.title,
      author: rawPullRequests.author,
      number: rawPullRequests.number,
      repository: rawPullRequests.repository,
      createdAt: rawPullRequests.createdAt,
      mergedAt: rawPullRequests.mergedAt,
      additions: rawPullRequests.additions,
      deletions: rawPullRequests.deletions,
    })
    .from(rawPullRequests)
    .where(and(...whereConditions))
    .orderBy(desc(rawPullRequests.additions))
    .limit(limit)
    .all();

  return prs;
}

/**
 * Get top issues for a repository in a time period
 */
export async function getTopIssues(params: QueryParams = {}, limit = 5) {
  const whereConditions = [
    // Include issues that are either:
    // 1. Currently open, or
    // 2. Were closed after the end date (meaning they were open during the period)
    params.dateRange
      ? sql`(${rawIssues.state} = 'OPEN' OR ${rawIssues.closedAt} > ${params.dateRange.endDate})`
      : sql`${rawIssues.state} = 'OPEN'`,
    ...buildCommonWhereConditions(params, rawIssues, [
      "createdAt",
      "updatedAt",
      "closedAt",
    ]),
  ];

  // Create a comment count subquery
  const commentCountQuery = db.$with("comment_counts").as(
    db
      .select({
        issueId: issueComments.issueId,
        count: sql<number>`COUNT(*)`.as("comment_count"),
      })
      .from(issueComments)
      .where(
        params.dateRange
          ? sql`${issueComments.createdAt} >= ${params.dateRange.startDate} AND ${issueComments.createdAt} <= ${params.dateRange.endDate}`
          : undefined
      )
      .groupBy(issueComments.issueId)
  );

  // Get all issues with their comment counts
  const issuesWithComments = await db
    .with(commentCountQuery)
    .select({
      id: rawIssues.id,
      title: rawIssues.title,
      author: rawIssues.author,
      number: rawIssues.number,
      repository: rawIssues.repository,
      createdAt: rawIssues.createdAt,
      closedAt: rawIssues.closedAt,
      state: rawIssues.state,
      commentCount: sql<number>`COALESCE(comment_counts.comment_count, 0)`,
    })
    .from(rawIssues)
    .leftJoin(commentCountQuery, eq(commentCountQuery.issueId, rawIssues.id))
    .where(and(...whereConditions))
    .orderBy(desc(sql`COALESCE(comment_counts.comment_count, 0)`))
    .limit(limit)
    .all();

  return issuesWithComments;
}

/**
 * Get repository metrics for a time period
 */
export async function getRepositoryMetrics(params: QueryParams = {}) {
  if (!params.repository) {
    throw new Error(
      "Repository parameter is required for getRepositoryMetrics"
    );
  }

  // Base conditions for repository filtering
  const repoCondition = sql`${rawPullRequests.repository} = ${params.repository}`;

  // Date range conditions
  const dateRange = params.dateRange;
  const dateCondition = dateRange
    ? sql`AND ${rawPullRequests.createdAt} >= ${dateRange.startDate} AND ${rawPullRequests.createdAt} <= ${dateRange.endDate}`
    : sql``;
  const mergedDateCondition = dateRange
    ? sql`AND ${rawPullRequests.mergedAt} >= ${dateRange.startDate} AND ${rawPullRequests.mergedAt} <= ${dateRange.endDate}`
    : sql``;
  const closedDateCondition = dateRange
    ? sql`AND ${rawPullRequests.closedAt} >= ${dateRange.startDate} AND ${rawPullRequests.closedAt} <= ${dateRange.endDate}`
    : sql``;

  // Query new PRs
  const newPRsQuery = db
    .select({
      id: rawPullRequests.id,
      title: rawPullRequests.title,
      author: rawPullRequests.author,
      number: rawPullRequests.number,
      additions: rawPullRequests.additions,
      deletions: rawPullRequests.deletions,
      repository: rawPullRequests.repository,
    })
    .from(rawPullRequests)
    .where(sql`${repoCondition} ${dateCondition}`);

  // Query merged PRs
  const mergedPRsQuery = db
    .select({
      id: rawPullRequests.id,
      title: rawPullRequests.title,
      author: rawPullRequests.author,
      number: rawPullRequests.number,
      additions: rawPullRequests.additions,
      deletions: rawPullRequests.deletions,
      repository: rawPullRequests.repository,
    })
    .from(rawPullRequests)
    .where(
      sql`${repoCondition} ${mergedDateCondition} AND ${rawPullRequests.merged} = 1`
    );

  // Query new issues
  const newIssuesQuery = db
    .select({
      id: rawIssues.id,
      title: rawIssues.title,
      author: rawIssues.author,
      number: rawIssues.number,
      repository: rawIssues.repository,
    })
    .from(rawIssues)
    .where(
      sql`${rawIssues.repository} = ${params.repository} ${
        dateRange
          ? sql`AND ${rawIssues.createdAt} >= ${dateRange.startDate} AND ${rawIssues.createdAt} <= ${dateRange.endDate}`
          : sql``
      }`
    );

  // Query closed issues
  const closedIssuesQuery = db
    .select({
      id: rawIssues.id,
      title: rawIssues.title,
      author: rawIssues.author,
      number: rawIssues.number,
      repository: rawIssues.repository,
    })
    .from(rawIssues)
    .where(
      sql`${rawIssues.repository} = ${params.repository} ${
        dateRange
          ? sql`AND ${rawIssues.closedAt} >= ${dateRange.startDate} AND ${rawIssues.closedAt} <= ${dateRange.endDate}`
          : sql``
      } AND ${rawIssues.state} = 'closed'`
    );

  // Execute all queries in parallel
  const [newPRs, mergedPRs, newIssues, closedIssues] = await Promise.all([
    newPRsQuery.all(),
    mergedPRsQuery.all(),
    newIssuesQuery.all(),
    closedIssuesQuery.all(),
  ]);

  // Get unique contributors count
  const uniqueContributors = await getActiveContributors(params);

  return {
    num_contributors: uniqueContributors.length,
    new_prs: {
      count: newPRs.length,
      items: newPRs,
    },
    merged_prs: {
      count: mergedPRs.length,
      items: mergedPRs,
    },
    new_issues: {
      count: newIssues.length,
      items: newIssues,
    },
    closed_issues: {
      count: closedIssues.length,
      items: closedIssues,
    },
  };
}

/**
 * Get top contributors ranked by activity score
 */
export async function getTopContributors(params: QueryParams = {}, limit = 5) {
  const prWhereConditions = buildCommonWhereConditions(
    params,
    rawPullRequests,
    ["createdAt", "mergedAt"]
  );

  try {
    // Define aliases properly for SQLite
    const prCountAlias = "pr_count_alias";
    const issueCountAlias = "issue_count_alias";
    const reviewCountAlias = "review_count_alias";

    const contributorScores = await db
      .select({
        username: rawPullRequests.author,
        pr_count: sql`COUNT(DISTINCT ${rawPullRequests.id})`.as(prCountAlias),
        issue_count: sql`COUNT(DISTINCT ${rawIssues.id})`.as(issueCountAlias),
        review_count: sql`COUNT(DISTINCT ${prReviews.id})`.as(reviewCountAlias),
      })
      .from(rawPullRequests)
      .leftJoin(rawIssues, eq(rawPullRequests.author, rawIssues.author))
      .leftJoin(prReviews, eq(rawPullRequests.author, prReviews.author))
      .where(and(...prWhereConditions))
      .groupBy(rawPullRequests.author)
      .orderBy(
        desc(sql`${prCountAlias} + ${issueCountAlias} + ${reviewCountAlias}`)
      )
      .limit(limit)
      .all();

    return contributorScores;
  } catch (error) {
    console.error(`Error in getTopContributors:`, error);
    return [];
  }
}
