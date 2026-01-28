/**
 * MCP Tool definitions for GitHub Analytics
 * All tools are read-only and map to static JSON API endpoints
 */

import { z } from "zod";
import type { APIClient } from "./api-client.js";
import type { LeaderboardEntry } from "./types.js";

// Tool Input Schemas
export const GetLeaderboardSchema = z.object({
  period: z
    .enum(["weekly", "monthly", "lifetime"])
    .describe(
      "Time period: 'weekly' (current week), 'monthly' (current month), or 'lifetime' (all-time)",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Max entries to return (default: 20, max: 100)"),
});

export const GetProfileSchema = z.object({
  username: z.string().min(1).describe("GitHub username"),
});

export const GetSummarySchema = z.object({
  type: z
    .enum(["contributor", "repo", "project"])
    .describe(
      "What to summarize: 'contributor' (a person), 'repo' (a repository), or 'project' (all repos)",
    ),
  username: z
    .string()
    .optional()
    .describe("GitHub username (required when type='contributor')"),
  owner: z
    .string()
    .optional()
    .describe("Repo owner (required when type='repo')"),
  repo: z.string().optional().describe("Repo name (required when type='repo')"),
  interval: z
    .enum(["day", "week", "month", "lifetime"])
    .describe(
      "Time interval: 'day', 'week', 'month', or 'lifetime' (contributor only)",
    ),
});

export const SearchSchema = z.object({
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
    .describe("Filter by character class"),
  focus: z
    .string()
    .optional()
    .describe(
      "Filter by focus area (e.g., 'typescript', 'core', 'ui', 'docs')",
    ),
  minScore: z.number().positive().optional().describe("Minimum score"),
  maxRank: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum rank (e.g., 50 = top 50)"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Max results (default: 20, max: 100)"),
  period: z
    .enum(["weekly", "monthly", "lifetime"])
    .optional()
    .describe("Which leaderboard to search (default: lifetime)"),
});

// Tool Handlers
export async function handleGetLeaderboard(
  client: APIClient,
  args: z.infer<typeof GetLeaderboardSchema>,
) {
  const data = await client.getLeaderboard(args.period);
  const limit = args.limit || 20;
  const entries = data.leaderboard.slice(0, limit);

  return {
    period: data.period,
    dateRange: `${data.startDate} to ${data.endDate}`,
    totalContributors: data.totalUsers,
    showing: entries.length,
    leaderboard: entries.map((e) => ({
      rank: e.rank,
      username: e.username,
      tier: e.tier,
      class: e.characterClass,
      score: Math.round(e.score * 100) / 100,
      breakdown: {
        prs: Math.round(e.prScore * 100) / 100,
        issues: Math.round(e.issueScore * 100) / 100,
        reviews: Math.round(e.reviewScore * 100) / 100,
        comments: Math.round(e.commentScore * 100) / 100,
      },
      focusAreas: e.focusAreas?.slice(0, 3).map((f) => f.tag) || [],
      wallets: e.wallets,
    })),
  };
}

export async function handleGetProfile(
  client: APIClient,
  args: z.infer<typeof GetProfileSchema>,
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
      total: Math.round(cs.scoreBreakdown.total * 100) / 100,
      prs: Math.round(cs.scoreBreakdown.distribution.prs.score * 100) / 100,
      issues:
        Math.round(cs.scoreBreakdown.distribution.issues.score * 100) / 100,
      reviews:
        Math.round(cs.scoreBreakdown.distribution.reviews.score * 100) / 100,
      comments:
        Math.round(cs.scoreBreakdown.distribution.comments.score * 100) / 100,
    },
    focusAreas: cs.focusAreas.map((f) => ({
      tag: f.tag,
      percentage: Math.round(f.percentage * 10) / 10,
      rank: f.rank,
      totalInArea: f.totalInArea,
    })),
    achievements: cs.achievements || [],
    profile: cs.profile,
    wallets: cs.wallets,
    links: data.links,
  };
}

export async function handleGetSummary(
  client: APIClient,
  args: z.infer<typeof GetSummarySchema>,
) {
  // Validate required fields based on type
  if (args.type === "contributor") {
    if (!args.username) {
      throw new Error("username is required when type='contributor'");
    }
    const data = await client.getContributorSummary(
      args.username,
      args.interval,
    );
    return {
      type: "contributor",
      username: args.username,
      interval: data.interval,
      date: data.date,
      generatedAt: data.generatedAt,
      summary: data.content,
    };
  }

  if (args.type === "repo") {
    if (!args.owner || !args.repo) {
      throw new Error("owner and repo are required when type='repo'");
    }
    if (args.interval === "lifetime") {
      throw new Error(
        "interval='lifetime' is not available for repo summaries",
      );
    }
    const data = await client.getRepoSummary(
      args.owner,
      args.repo,
      args.interval,
    );
    return {
      type: "repo",
      repository: `${args.owner}/${args.repo}`,
      interval: data.interval,
      date: data.date,
      generatedAt: data.generatedAt,
      summary: data.content,
    };
  }

  // type === "project"
  if (args.interval === "lifetime") {
    throw new Error(
      "interval='lifetime' is not available for project summaries",
    );
  }
  const data = await client.getOverallSummary(args.interval);
  return {
    type: "project",
    interval: data.interval,
    date: data.date,
    generatedAt: data.generatedAt,
    summary: data.content,
  };
}

export async function handleSearch(
  client: APIClient,
  args: z.infer<typeof SearchSchema>,
) {
  const period = args.period || "lifetime";
  const data = await client.getLeaderboard(period);
  const limit = args.limit || 20;

  // Apply filters
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
    totalMatches: filtered.length,
    showing: results.length,
    contributors: results.map((e) => ({
      rank: e.rank,
      username: e.username,
      tier: e.tier,
      class: e.characterClass,
      score: Math.round(e.score * 100) / 100,
      focusAreas: e.focusAreas?.slice(0, 3).map((f) => f.tag) || [],
    })),
  };
}

// Tool Annotations (MCP best practice)
export const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
