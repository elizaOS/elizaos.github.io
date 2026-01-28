/**
 * MCP Tool definitions for GitHub Analytics (DB-direct)
 * All tools query SQLite database directly
 */

import { z } from "zod";
import { query, queryOne } from "./db.js";

// ============ Schemas ============

export const GetStatsSchema = z.object({});

export const ListReposSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
});

export const ListContributorsSchema = z.object({
  period: z.enum(["day", "week", "month", "lifetime"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const GetContributorSchema = z.object({
  username: z.string().min(1),
});

export const GetSummarySchema = z.object({
  type: z.enum(["contributor", "repo", "project"]),
  username: z.string().optional(),
  repo: z.string().optional(), // format: owner/name or repoId
  interval: z.enum(["day", "week", "month", "lifetime"]).optional(),
});

export const FindContributorsSchema = z.object({
  tier: z
    .enum(["beginner", "regular", "active", "veteran", "elite", "legend"])
    .optional(),
  focus: z.string().optional(),
  minScore: z.number().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListPRsSchema = z.object({
  author: z.string().optional(),
  repo: z.string().optional(),
  state: z.enum(["open", "closed", "merged", "all"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListIssuesSchema = z.object({
  author: z.string().optional(),
  repo: z.string().optional(),
  state: z.enum(["open", "closed", "all"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const GetActivitySchema = z.object({
  username: z.string().optional(),
  repo: z.string().optional(),
  days: z.number().int().positive().max(90).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ============ Quality Validation Schemas ============

export const ListReviewsSchema = z.object({
  author: z.string().optional(),
  prAuthor: z.string().optional(),
  state: z
    .enum(["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "all"])
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListCommentsSchema = z.object({
  author: z.string().optional(),
  type: z.enum(["pr", "issue", "all"]).optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const GetFileChangesSchema = z.object({
  author: z.string().optional(),
  path: z.string().optional(),
  extension: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const GetReactionsSchema = z.object({
  username: z.string().optional(),
  type: z.enum(["pr", "issue", "all"]).optional(),
  content: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListUntrackedReposSchema = z.object({
  minActivityScore: z.number().optional(),
  hasRecentActivity: z.boolean().optional(),
  language: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ============ Handlers ============

export function handleGetStats() {
  const userCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM users WHERE is_bot = 0",
  );
  const repoCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM repositories",
  );
  const prCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM raw_pull_requests",
  );
  const issueCount = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM raw_issues",
  );

  // Tier distribution
  const tiers = query<{ tier: string; count: number }>(`
    SELECT
      CASE
        WHEN score >= 5000 THEN 'legend'
        WHEN score >= 2000 THEN 'elite'
        WHEN score >= 500 THEN 'veteran'
        WHEN score >= 100 THEN 'active'
        WHEN score >= 20 THEN 'regular'
        ELSE 'beginner'
      END as tier,
      COUNT(*) as count
    FROM (
      SELECT username, SUM(score) as score
      FROM user_daily_scores
      WHERE category = 'day'
      GROUP BY username
    )
    GROUP BY tier
  `);

  return {
    contributors: userCount?.count || 0,
    repositories: repoCount?.count || 0,
    pullRequests: prCount?.count || 0,
    issues: issueCount?.count || 0,
    tierDistribution: Object.fromEntries(tiers.map((t) => [t.tier, t.count])),
  };
}

export function handleListRepos(args: z.infer<typeof ListReposSchema>) {
  const limit = args.limit || 20;
  const repos = query<{
    repo_id: string;
    owner: string;
    name: string;
    description: string;
    stars: number;
    forks: number;
  }>(
    `SELECT repo_id, owner, name, description, stars, forks
     FROM repositories
     ORDER BY stars DESC
     LIMIT ?`,
    [limit],
  );

  return {
    total: repos.length,
    repos: repos.map((r) => ({
      id: r.repo_id,
      name: `${r.owner}/${r.name}`,
      description: r.description,
      stars: r.stars,
      forks: r.forks,
    })),
  };
}

export function handleListContributors(
  args: z.infer<typeof ListContributorsSchema>,
) {
  const limit = args.limit || 20;
  const period = args.period || "lifetime";

  let dateFilter = "";
  if (period === "day") {
    dateFilter = "AND date >= date('now', '-1 day')";
  } else if (period === "week") {
    dateFilter = "AND date >= date('now', '-7 days')";
  } else if (period === "month") {
    dateFilter = "AND date >= date('now', '-30 days')";
  }

  const contributors = query<{
    username: string;
    score: number;
    pr_score: number;
    issue_score: number;
    review_score: number;
    comment_score: number;
  }>(
    `SELECT
      username,
      SUM(score) as score,
      SUM(pr_score) as pr_score,
      SUM(issue_score) as issue_score,
      SUM(review_score) as review_score,
      SUM(comment_score) as comment_score
     FROM user_daily_scores
     WHERE category = 'day' ${dateFilter}
     GROUP BY username
     ORDER BY score DESC
     LIMIT ?`,
    [limit],
  );

  return {
    period,
    total: contributors.length,
    contributors: contributors.map((c, i) => ({
      rank: i + 1,
      username: c.username,
      score: Math.round(c.score),
      breakdown: {
        prs: Math.round(c.pr_score || 0),
        issues: Math.round(c.issue_score || 0),
        reviews: Math.round(c.review_score || 0),
        comments: Math.round(c.comment_score || 0),
      },
    })),
  };
}

export function handleGetContributor(
  args: z.infer<typeof GetContributorSchema>,
) {
  const { username } = args;

  // Basic info
  const user = queryOne<{
    username: string;
    avatar_url: string;
    is_bot: number;
  }>("SELECT username, avatar_url, is_bot FROM users WHERE username = ?", [
    username,
  ]);

  if (!user) {
    throw new Error(`Contributor not found: ${username}`);
  }

  // Scores
  const scores = queryOne<{
    score: number;
    pr_score: number;
    issue_score: number;
    review_score: number;
    comment_score: number;
  }>(
    `SELECT
      SUM(score) as score,
      SUM(pr_score) as pr_score,
      SUM(issue_score) as issue_score,
      SUM(review_score) as review_score,
      SUM(comment_score) as comment_score
     FROM user_daily_scores
     WHERE username = ? AND category = 'day'`,
    [username],
  );

  // Focus areas
  const focusAreas = query<{ tag: string; score: number }>(
    `SELECT tag, score FROM user_tag_scores
     WHERE username = ?
     ORDER BY score DESC
     LIMIT 5`,
    [username],
  );

  // Badges
  const badges = query<{ badge_type: string; tier: string; earned_at: string }>(
    "SELECT badge_type, tier, earned_at FROM user_badges WHERE username = ?",
    [username],
  );

  // Wallets
  const wallets = query<{ chain_id: string; account_address: string }>(
    "SELECT chain_id, account_address FROM wallet_addresses WHERE user_id = ? AND is_active = 1",
    [username],
  );

  const totalScore = scores?.score || 0;
  const tier =
    totalScore >= 5000
      ? "legend"
      : totalScore >= 2000
        ? "elite"
        : totalScore >= 500
          ? "veteran"
          : totalScore >= 100
            ? "active"
            : totalScore >= 20
              ? "regular"
              : "beginner";

  return {
    username: user.username,
    tier,
    score: {
      total: Math.round(totalScore),
      prs: Math.round(scores?.pr_score || 0),
      issues: Math.round(scores?.issue_score || 0),
      reviews: Math.round(scores?.review_score || 0),
      comments: Math.round(scores?.comment_score || 0),
    },
    focusAreas: focusAreas.map((f) => ({
      tag: f.tag,
      score: Math.round(f.score),
    })),
    achievements: badges.map((b) => ({
      type: b.badge_type,
      tier: b.tier,
      earnedAt: b.earned_at,
    })),
    wallets: Object.fromEntries(
      wallets.map((w) => [w.chain_id, w.account_address]),
    ),
  };
}

export function handleGetSummary(args: z.infer<typeof GetSummarySchema>) {
  const interval = args.interval || "week";

  if (args.type === "contributor") {
    if (!args.username) {
      throw new Error("username required for contributor summary");
    }
    const summary = queryOne<{ summary: string; date: string }>(
      `SELECT summary, date FROM user_summaries
       WHERE username = ? AND interval_type = ?
       ORDER BY date DESC LIMIT 1`,
      [args.username, interval],
    );
    return {
      type: "contributor",
      username: args.username,
      interval,
      date: summary?.date,
      summary: summary?.summary || "No summary available",
    };
  }

  if (args.type === "repo") {
    if (!args.repo) {
      throw new Error("repo required for repo summary");
    }
    // Handle both "owner/name" and "owner_name" formats
    const repoId = args.repo.includes("/")
      ? args.repo.replace("/", "_")
      : args.repo;
    const summary = queryOne<{ summary: string; date: string }>(
      `SELECT summary, date FROM repo_summaries
       WHERE repo_id = ? AND interval_type = ?
       ORDER BY date DESC LIMIT 1`,
      [repoId, interval],
    );
    return {
      type: "repo",
      repo: args.repo,
      interval,
      date: summary?.date,
      summary: summary?.summary || "No summary available",
    };
  }

  // project
  const summary = queryOne<{ summary: string; date: string }>(
    `SELECT summary, date FROM overall_summaries
     WHERE interval_type = ?
     ORDER BY date DESC LIMIT 1`,
    [interval],
  );
  return {
    type: "project",
    interval,
    date: summary?.date,
    summary: summary?.summary || "No summary available",
  };
}

export function handleFindContributors(
  args: z.infer<typeof FindContributorsSchema>,
) {
  const limit = args.limit || 20;
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  // Build score subquery
  let havingClause = "";
  if (args.minScore) {
    havingClause = `HAVING SUM(score) >= ?`;
    params.push(args.minScore);
  }

  // Focus area filter requires join
  let focusJoin = "";
  if (args.focus) {
    focusJoin = `INNER JOIN user_tag_scores uts ON s.username = uts.username AND uts.tag = ?`;
    params.unshift(args.focus);
  }

  const contributors = query<{
    username: string;
    score: number;
  }>(
    `SELECT s.username, SUM(s.score) as score
     FROM user_daily_scores s
     ${focusJoin}
     WHERE s.category = 'day'
     GROUP BY s.username
     ${havingClause}
     ORDER BY score DESC
     LIMIT ?`,
    [...params, limit],
  );

  // Filter by tier if specified
  let filtered = contributors;
  if (args.tier) {
    filtered = contributors.filter((c) => {
      const tier =
        c.score >= 5000
          ? "legend"
          : c.score >= 2000
            ? "elite"
            : c.score >= 500
              ? "veteran"
              : c.score >= 100
                ? "active"
                : c.score >= 20
                  ? "regular"
                  : "beginner";
      return tier === args.tier;
    });
  }

  return {
    filters: { tier: args.tier, focus: args.focus, minScore: args.minScore },
    total: filtered.length,
    contributors: filtered.map((c, i) => ({
      rank: i + 1,
      username: c.username,
      score: Math.round(c.score),
    })),
  };
}

export function handleListPRs(args: z.infer<typeof ListPRsSchema>) {
  const limit = args.limit || 20;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.author) {
    conditions.push("author = ?");
    params.push(args.author);
  }
  if (args.repo) {
    conditions.push("repository = ?");
    params.push(args.repo);
  }
  if (args.state && args.state !== "all") {
    if (args.state === "merged") {
      conditions.push("merged = 1");
    } else {
      conditions.push("state = ?");
      params.push(args.state);
    }
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const prs = query<{
    id: string;
    number: number;
    title: string;
    state: string;
    merged: number;
    author: string;
    repository: string;
    created_at: string;
    additions: number;
    deletions: number;
  }>(
    `SELECT id, number, title, state, merged, author, repository, created_at, additions, deletions
     FROM raw_pull_requests
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, limit],
  );

  return {
    total: prs.length,
    pullRequests: prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.merged ? "merged" : pr.state,
      author: pr.author,
      repo: pr.repository,
      createdAt: pr.created_at,
      changes: { additions: pr.additions, deletions: pr.deletions },
    })),
  };
}

export function handleListIssues(args: z.infer<typeof ListIssuesSchema>) {
  const limit = args.limit || 20;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.author) {
    conditions.push("author = ?");
    params.push(args.author);
  }
  if (args.repo) {
    conditions.push("repository = ?");
    params.push(args.repo);
  }
  if (args.state && args.state !== "all") {
    conditions.push("state = ?");
    params.push(args.state);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const issues = query<{
    id: string;
    number: number;
    title: string;
    state: string;
    author: string;
    repository: string;
    created_at: string;
  }>(
    `SELECT id, number, title, state, author, repository, created_at
     FROM raw_issues
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, limit],
  );

  return {
    total: issues.length,
    issues: issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.author,
      repo: issue.repository,
      createdAt: issue.created_at,
    })),
  };
}

export function handleGetActivity(args: z.infer<typeof GetActivitySchema>) {
  const limit = args.limit || 50;
  const days = args.days || 7;
  const dateFilter = `datetime('now', '-${days} days')`;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.username) {
    conditions.push("author = ?");
    params.push(args.username);
  }
  if (args.repo) {
    conditions.push("repository = ?");
    params.push(args.repo);
  }

  const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  // Union of PRs, issues, reviews, comments
  const activity = query<{
    type: string;
    title: string;
    author: string;
    repo: string;
    created_at: string;
  }>(
    `SELECT * FROM (
      SELECT 'pr' as type, title, author, repository as repo, created_at
      FROM raw_pull_requests
      WHERE created_at >= ${dateFilter} ${where}

      UNION ALL

      SELECT 'issue' as type, title, author, repository as repo, created_at
      FROM raw_issues
      WHERE created_at >= ${dateFilter} ${where}

      UNION ALL

      SELECT 'review' as type,
             COALESCE(body, state) as title,
             author,
             (SELECT repository FROM raw_pull_requests WHERE id = pr_reviews.pr_id) as repo,
             created_at
      FROM pr_reviews
      WHERE created_at >= ${dateFilter} ${where.replace("repository", "(SELECT repository FROM raw_pull_requests WHERE id = pr_reviews.pr_id)")}
    )
    ORDER BY created_at DESC
    LIMIT ?`,
    [...params, ...params, ...params, limit],
  );

  return {
    days,
    total: activity.length,
    activity: activity.map((a) => ({
      type: a.type,
      title: a.title?.substring(0, 100),
      author: a.author,
      repo: a.repo,
      date: a.created_at,
    })),
  };
}

// ============ Quality Validation Handlers ============

export function handleListReviews(args: z.infer<typeof ListReviewsSchema>) {
  const limit = args.limit || 50;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.author) {
    conditions.push("r.author = ?");
    params.push(args.author);
  }
  if (args.prAuthor) {
    conditions.push("pr.author = ?");
    params.push(args.prAuthor);
  }
  if (args.state && args.state !== "all") {
    conditions.push("r.state = ?");
    params.push(args.state);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const reviews = query<{
    id: string;
    state: string;
    body: string;
    created_at: string;
    author: string;
    pr_number: number;
    pr_title: string;
    pr_author: string;
    repository: string;
  }>(
    `SELECT
      r.id, r.state, r.body, r.created_at, r.author,
      pr.number as pr_number, pr.title as pr_title, pr.author as pr_author, pr.repository
     FROM pr_reviews r
     JOIN raw_pull_requests pr ON r.pr_id = pr.id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [...params, limit],
  );

  // Calculate quality metrics
  const byAuthor: Record<
    string,
    {
      approved: number;
      changes: number;
      commented: number;
      totalBodyLength: number;
    }
  > = {};
  for (const r of reviews) {
    if (!r.author) continue;
    if (!byAuthor[r.author]) {
      byAuthor[r.author] = {
        approved: 0,
        changes: 0,
        commented: 0,
        totalBodyLength: 0,
      };
    }
    if (r.state === "APPROVED") byAuthor[r.author].approved++;
    if (r.state === "CHANGES_REQUESTED") byAuthor[r.author].changes++;
    if (r.state === "COMMENTED") byAuthor[r.author].commented++;
    byAuthor[r.author].totalBodyLength += (r.body || "").length;
  }

  return {
    total: reviews.length,
    reviews: reviews.map((r) => ({
      state: r.state,
      bodyLength: (r.body || "").length,
      author: r.author,
      prNumber: r.pr_number,
      prTitle: r.pr_title,
      prAuthor: r.pr_author,
      repo: r.repository,
      createdAt: r.created_at,
    })),
    qualityMetrics: Object.entries(byAuthor).map(([author, stats]) => ({
      author,
      approvalRate:
        stats.approved / (stats.approved + stats.changes + stats.commented) ||
        0,
      changesRequestedRate:
        stats.changes / (stats.approved + stats.changes + stats.commented) || 0,
      avgBodyLength: Math.round(
        stats.totalBodyLength /
          (stats.approved + stats.changes + stats.commented) || 0,
      ),
      reviewCount: stats.approved + stats.changes + stats.commented,
    })),
  };
}

export function handleListComments(args: z.infer<typeof ListCommentsSchema>) {
  const limit = args.limit || 50;
  const type = args.type || "all";

  const results: Array<{
    id: string;
    body: string;
    author: string;
    created_at: string;
    type: string;
    context_id: string;
  }> = [];

  // PR comments
  if (type === "pr" || type === "all") {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (args.author) {
      conditions.push("author = ?");
      params.push(args.author);
    }
    if (args.minLength) {
      conditions.push("LENGTH(body) >= ?");
      params.push(args.minLength);
    }
    if (args.maxLength) {
      conditions.push("LENGTH(body) <= ?");
      params.push(args.maxLength);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const prComments = query<{
      id: string;
      body: string;
      author: string;
      created_at: string;
      pr_id: string;
    }>(
      `SELECT id, body, author, created_at, pr_id
       FROM pr_comments
       ${where}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, limit],
    );

    results.push(
      ...prComments.map((c) => ({ ...c, type: "pr", context_id: c.pr_id })),
    );
  }

  // Issue comments
  if (type === "issue" || type === "all") {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (args.author) {
      conditions.push("author = ?");
      params.push(args.author);
    }
    if (args.minLength) {
      conditions.push("LENGTH(body) >= ?");
      params.push(args.minLength);
    }
    if (args.maxLength) {
      conditions.push("LENGTH(body) <= ?");
      params.push(args.maxLength);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const issueComments = query<{
      id: string;
      body: string;
      author: string;
      created_at: string;
      issue_id: string;
    }>(
      `SELECT id, body, author, created_at, issue_id
       FROM issue_comments
       ${where}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, limit],
    );

    results.push(
      ...issueComments.map((c) => ({
        ...c,
        type: "issue",
        context_id: c.issue_id,
      })),
    );
  }

  // Sort by date and limit
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const limited = results.slice(0, limit);

  // Calculate quality metrics by author
  const byAuthor: Record<
    string,
    { count: number; totalLength: number; bodies: string[] }
  > = {};
  for (const c of limited) {
    if (!c.author) continue;
    if (!byAuthor[c.author]) {
      byAuthor[c.author] = { count: 0, totalLength: 0, bodies: [] };
    }
    byAuthor[c.author].count++;
    byAuthor[c.author].totalLength += (c.body || "").length;
    byAuthor[c.author].bodies.push(c.body || "");
  }

  // Detect duplicate comments (potential spam)
  const detectDuplicates = (bodies: string[]) => {
    const counts: Record<string, number> = {};
    for (const b of bodies) {
      const normalized = b.trim().toLowerCase();
      if (normalized.length > 0) {
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    }
    return Object.values(counts).filter((c) => c > 1).length;
  };

  return {
    total: limited.length,
    comments: limited.map((c) => ({
      type: c.type,
      bodyLength: (c.body || "").length,
      bodyPreview: (c.body || "").substring(0, 100),
      author: c.author,
      createdAt: c.created_at,
    })),
    qualityMetrics: Object.entries(byAuthor).map(([author, stats]) => ({
      author,
      commentCount: stats.count,
      avgLength: Math.round(stats.totalLength / stats.count),
      duplicateCount: detectDuplicates(stats.bodies),
      shortComments: stats.bodies.filter((b) => b.length < 20).length,
    })),
  };
}

export function handleGetFileChanges(
  args: z.infer<typeof GetFileChangesSchema>,
) {
  const limit = args.limit || 50;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.author) {
    conditions.push("pr.author = ?");
    params.push(args.author);
  }
  if (args.path) {
    conditions.push("f.path LIKE ?");
    params.push(`%${args.path}%`);
  }
  if (args.extension) {
    conditions.push("f.path LIKE ?");
    params.push(`%.${args.extension}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const files = query<{
    path: string;
    additions: number;
    deletions: number;
    change_type: string;
    pr_number: number;
    pr_title: string;
    author: string;
    repository: string;
    created_at: string;
  }>(
    `SELECT
      f.path, f.additions, f.deletions, f.changeType as change_type,
      pr.number as pr_number, pr.title as pr_title, pr.author, pr.repository, pr.created_at
     FROM raw_pr_files f
     JOIN raw_pull_requests pr ON f.pr_id = pr.id
     ${where}
     ORDER BY pr.created_at DESC
     LIMIT ?`,
    [...params, limit],
  );

  // Aggregate by author and file type
  const byAuthor: Record<
    string,
    {
      files: Set<string>;
      additions: number;
      deletions: number;
      extensions: Record<string, number>;
    }
  > = {};
  for (const f of files) {
    if (!f.author) continue;
    if (!byAuthor[f.author]) {
      byAuthor[f.author] = {
        files: new Set(),
        additions: 0,
        deletions: 0,
        extensions: {},
      };
    }
    byAuthor[f.author].files.add(f.path);
    byAuthor[f.author].additions += f.additions || 0;
    byAuthor[f.author].deletions += f.deletions || 0;

    const ext = f.path.split(".").pop() || "none";
    byAuthor[f.author].extensions[ext] =
      (byAuthor[f.author].extensions[ext] || 0) + 1;
  }

  // Identify file type distribution
  const getTopExtensions = (exts: Record<string, number>) => {
    return Object.entries(exts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ext, count]) => ({ ext, count }));
  };

  return {
    total: files.length,
    files: files.map((f) => ({
      path: f.path,
      additions: f.additions,
      deletions: f.deletions,
      changeType: f.change_type,
      author: f.author,
      prNumber: f.pr_number,
      repo: f.repository,
    })),
    authorMetrics: Object.entries(byAuthor).map(([author, stats]) => ({
      author,
      uniqueFiles: stats.files.size,
      totalAdditions: stats.additions,
      totalDeletions: stats.deletions,
      topExtensions: getTopExtensions(stats.extensions),
      docsOnly:
        stats.extensions["md"] ===
        Object.values(stats.extensions).reduce((a, b) => a + b, 0),
    })),
  };
}

export function handleGetReactions(args: z.infer<typeof GetReactionsSchema>) {
  const limit = args.limit || 100;
  const type = args.type || "all";

  const results: Array<{
    content: string;
    user: string;
    target_type: string;
    target_id: string;
  }> = [];

  // PR reactions
  if (type === "pr" || type === "all") {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (args.username) {
      conditions.push("user = ?");
      params.push(args.username);
    }
    if (args.content) {
      conditions.push("content = ?");
      params.push(args.content);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const prReactions = query<{
      content: string;
      user: string;
      pr_id: string;
    }>(`SELECT content, user, pr_id FROM pr_reactions ${where} LIMIT ?`, [
      ...params,
      limit,
    ]);

    results.push(
      ...prReactions.map((r) => ({
        ...r,
        target_type: "pr",
        target_id: r.pr_id,
      })),
    );
  }

  // Issue reactions
  if (type === "issue" || type === "all") {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (args.username) {
      conditions.push("user = ?");
      params.push(args.username);
    }
    if (args.content) {
      conditions.push("content = ?");
      params.push(args.content);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const issueReactions = query<{
      content: string;
      user: string;
      issue_id: string;
    }>(`SELECT content, user, issue_id FROM issue_reactions ${where} LIMIT ?`, [
      ...params,
      limit,
    ]);

    results.push(
      ...issueReactions.map((r) => ({
        ...r,
        target_type: "issue",
        target_id: r.issue_id,
      })),
    );
  }

  // Aggregate by content type
  const byConte: Record<string, number> = {};
  const byUser: Record<string, Record<string, number>> = {};
  for (const r of results) {
    byConte[r.content] = (byConte[r.content] || 0) + 1;
    if (!byUser[r.user]) byUser[r.user] = {};
    byUser[r.user][r.content] = (byUser[r.user][r.content] || 0) + 1;
  }

  return {
    total: results.length,
    reactions: results.slice(0, limit).map((r) => ({
      content: r.content,
      user: r.user,
      targetType: r.target_type,
    })),
    summary: {
      byContent: Object.entries(byConte)
        .sort((a, b) => b[1] - a[1])
        .map(([content, count]) => ({ content, count })),
      byUser: Object.entries(byUser)
        .map(([user, reactions]) => ({
          user,
          total: Object.values(reactions).reduce((a, b) => a + b, 0),
          breakdown: reactions,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20),
    },
  };
}

export function handleListUntrackedRepos(
  args: z.infer<typeof ListUntrackedReposSchema>,
) {
  const limit = args.limit || 50;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (args.minActivityScore) {
    conditions.push("activity_score >= ?");
    params.push(args.minActivityScore);
  }
  if (args.hasRecentActivity) {
    // Recent = pushed in last 30 days
    conditions.push("last_pushed_at >= datetime('now', '-30 days')");
  }
  if (args.language) {
    conditions.push("primary_language = ?");
    params.push(args.language);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const repos = query<{
    repo_id: string;
    owner: string;
    name: string;
    description: string;
    stars: number;
    forks: number;
    is_archived: number;
    primary_language: string;
    last_pushed_at: string;
    open_pr_count: number;
    merged_pr_count: number;
    open_issue_count: number;
    activity_score: number;
  }>(
    `SELECT repo_id, owner, name, description, stars, forks, is_archived,
            primary_language, last_pushed_at, open_pr_count, merged_pr_count,
            open_issue_count, activity_score
     FROM untracked_repositories
     ${where}
     ORDER BY activity_score DESC
     LIMIT ?`,
    [...params, limit],
  );

  const total = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM untracked_repositories ${where}`,
    params,
  );

  return {
    total: total?.count || 0,
    returned: repos.length,
    repos: repos.map((r) => ({
      id: r.repo_id,
      name: `${r.owner}/${r.name}`,
      description: r.description,
      language: r.primary_language,
      stars: r.stars,
      forks: r.forks,
      isArchived: !!r.is_archived,
      lastPushed: r.last_pushed_at,
      openPRs: r.open_pr_count,
      mergedPRs: r.merged_pr_count,
      openIssues: r.open_issue_count,
      activityScore: Math.round(r.activity_score * 10) / 10,
    })),
  };
}

// Tool annotations
export const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
