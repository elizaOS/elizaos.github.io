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

// Tool annotations
export const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
