/**
 * MCP Tool definitions for GitHub Analytics
 * All tools are read-only and map to static JSON API endpoints
 */

import { z } from "zod";
import type { APIClient } from "./api-client.js";
import type { LeaderboardEntry } from "./types.js";

// Tool Input Schemas
export const GetStatsSchema = z.object({});

export const ListReposSchema = z.object({});

export const ListContributorsSchema = z.object({
  period: z
    .enum(["weekly", "monthly", "lifetime"])
    .optional()
    .describe("Time period (default: lifetime)"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Max entries (default: 20, max: 100)"),
});

export const GetContributorSchema = z.object({
  username: z.string().min(1).describe("GitHub username"),
});

export const GetSummarySchema = z.object({
  type: z
    .enum(["contributor", "repo", "project"])
    .describe("'contributor', 'repo', or 'project'"),
  username: z
    .string()
    .optional()
    .describe("GitHub username (for type='contributor')"),
  owner: z.string().optional().describe("Repo owner (for type='repo')"),
  repo: z.string().optional().describe("Repo name (for type='repo')"),
  interval: z
    .enum(["day", "week", "month", "lifetime"])
    .optional()
    .describe("Time interval (default: week)"),
});

export const FindContributorsSchema = z.object({
  tier: z
    .enum(["beginner", "regular", "active", "veteran", "elite", "legend"])
    .optional()
    .describe("Filter by tier"),
  class: z
    .enum([
      "Builder",
      "Hunter",
      "Scribe",
      "Maintainer",
      "Pathfinder",
      "Machine",
      "Contributor",
    ])
    .optional()
    .describe("Filter by class"),
  focus: z
    .string()
    .optional()
    .describe("Filter by focus area (e.g., 'typescript', 'core', 'ui')"),
  minScore: z.number().positive().optional().describe("Minimum score"),
  maxRank: z.number().int().positive().optional().describe("Max rank"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Max results (default: 20)"),
  period: z
    .enum(["weekly", "monthly", "lifetime"])
    .optional()
    .describe("Which leaderboard (default: lifetime)"),
});

// Tool Handlers
export async function handleGetStats(client: APIClient) {
  const [lifetime, weekly, monthly, index] = await Promise.all([
    client.getLeaderboard("lifetime"),
    client.getLeaderboard("weekly"),
    client.getLeaderboard("monthly"),
    client.getAPIIndex(),
  ]);

  // Calculate tier distribution from lifetime data
  const tierCounts: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  for (const entry of lifetime.leaderboard) {
    tierCounts[entry.tier] = (tierCounts[entry.tier] || 0) + 1;
    classCounts[entry.characterClass] =
      (classCounts[entry.characterClass] || 0) + 1;
  }

  return {
    totalContributors: lifetime.totalUsers,
    activeThisWeek: weekly.totalUsers,
    activeThisMonth: monthly.totalUsers,
    dataRange: {
      start: lifetime.startDate,
      end: lifetime.endDate,
    },
    tierDistribution: tierCounts,
    classDistribution: classCounts,
    characterSystem: index.capabilities.characterSystem,
  };
}

export async function handleListRepos(client: APIClient) {
  // Get repos from a known summary to extract repo list
  // The API doesn't have a direct repo list endpoint, so we derive from index
  const index = await client.getAPIIndex();

  return {
    note: "Tracked repositories with summaries available",
    summaryPattern: index.endpoints.summaries.overall.pattern,
    intervals: index.endpoints.summaries.overall.intervals,
    // Common repos - could be enhanced with a dedicated endpoint
    hint: "Use get_summary with type='repo' to get details for specific repos",
  };
}

export async function handleListContributors(
  client: APIClient,
  args: z.infer<typeof ListContributorsSchema>,
) {
  const period = args.period || "lifetime";
  const limit = args.limit || 20;
  const data = await client.getLeaderboard(period);
  const entries = data.leaderboard.slice(0, limit);

  return {
    period: data.period,
    dateRange: `${data.startDate} to ${data.endDate}`,
    total: data.totalUsers,
    showing: entries.length,
    contributors: entries.map((e) => ({
      rank: e.rank,
      username: e.username,
      tier: e.tier,
      class: e.characterClass,
      score: Math.round(e.score),
      focus: e.focusAreas?.slice(0, 3).map((f) => f.tag) || [],
    })),
  };
}

export async function handleGetContributor(
  client: APIClient,
  args: z.infer<typeof GetContributorSchema>,
) {
  const data = await client.getContributorProfile(args.username);
  const cs = data.characterSheet;

  return {
    username: data.username,
    tier: cs.tier,
    class: cs.characterClass,
    percentile: Math.round(cs.percentile * 100) / 100,
    rank: cs.rank,
    score: {
      total: Math.round(cs.scoreBreakdown.total),
      prs: Math.round(cs.scoreBreakdown.distribution.prs.score),
      issues: Math.round(cs.scoreBreakdown.distribution.issues.score),
      reviews: Math.round(cs.scoreBreakdown.distribution.reviews.score),
      comments: Math.round(cs.scoreBreakdown.distribution.comments.score),
    },
    focusAreas: cs.focusAreas.map((f) => ({
      tag: f.tag,
      pct: Math.round(f.percentage),
      rank: f.rank,
    })),
    achievements: cs.achievements || [],
    wallets: cs.wallets,
    links: data.links,
  };
}

export async function handleGetSummary(
  client: APIClient,
  args: z.infer<typeof GetSummarySchema>,
) {
  const interval = args.interval || "week";

  if (args.type === "contributor") {
    if (!args.username) {
      throw new Error("username required for type='contributor'");
    }
    const data = await client.getContributorSummary(args.username, interval);
    return {
      type: "contributor",
      username: args.username,
      interval: data.interval,
      date: data.date,
      summary: data.content,
    };
  }

  if (args.type === "repo") {
    if (!args.owner || !args.repo) {
      throw new Error("owner and repo required for type='repo'");
    }
    if (interval === "lifetime") {
      throw new Error("lifetime not available for repo summaries");
    }
    const data = await client.getRepoSummary(
      args.owner,
      args.repo,
      interval as "day" | "week" | "month",
    );
    return {
      type: "repo",
      repo: `${args.owner}/${args.repo}`,
      interval: data.interval,
      date: data.date,
      summary: data.content,
    };
  }

  // project
  if (interval === "lifetime") {
    throw new Error("lifetime not available for project summaries");
  }
  const data = await client.getOverallSummary(
    interval as "day" | "week" | "month",
  );
  return {
    type: "project",
    interval: data.interval,
    date: data.date,
    summary: data.content,
  };
}

export async function handleFindContributors(
  client: APIClient,
  args: z.infer<typeof FindContributorsSchema>,
) {
  const period = args.period || "lifetime";
  const limit = args.limit || 20;
  const data = await client.getLeaderboard(period);

  let filtered: LeaderboardEntry[] = data.leaderboard;

  if (args.tier) {
    filtered = filtered.filter((e) => e.tier === args.tier);
  }
  if (args.class) {
    filtered = filtered.filter((e) => e.characterClass === args.class);
  }
  if (args.focus) {
    const area = args.focus.toLowerCase();
    filtered = filtered.filter((e) =>
      e.focusAreas?.some((f) => f.tag.toLowerCase() === area),
    );
  }
  if (args.minScore !== undefined) {
    filtered = filtered.filter((e) => e.score >= args.minScore!);
  }
  if (args.maxRank !== undefined) {
    filtered = filtered.filter((e) => e.rank <= args.maxRank!);
  }

  const results = filtered.slice(0, limit);

  return {
    period,
    filters: {
      tier: args.tier,
      class: args.class,
      focus: args.focus,
      minScore: args.minScore,
      maxRank: args.maxRank,
    },
    total: filtered.length,
    showing: results.length,
    contributors: results.map((e) => ({
      rank: e.rank,
      username: e.username,
      tier: e.tier,
      class: e.characterClass,
      score: Math.round(e.score),
      focus: e.focusAreas?.slice(0, 3).map((f) => f.tag) || [],
    })),
  };
}

// Tool Annotations
export const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
