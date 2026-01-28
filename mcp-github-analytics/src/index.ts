#!/usr/bin/env node
/**
 * MCP Server for GitHub Analytics (DB-direct)
 *
 * Queries SQLite database directly for contributor data, PRs, issues, and summaries.
 *
 * Required: MCP_DB_PATH=/path/to/db.sqlite
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { closeDb } from "./db.js";
import {
  GetStatsSchema,
  ListReposSchema,
  ListContributorsSchema,
  GetContributorSchema,
  GetSummarySchema,
  FindContributorsSchema,
  ListPRsSchema,
  ListIssuesSchema,
  GetActivitySchema,
  ListReviewsSchema,
  ListCommentsSchema,
  GetFileChangesSchema,
  GetReactionsSchema,
  ListUntrackedReposSchema,
  handleGetStats,
  handleListRepos,
  handleListContributors,
  handleGetContributor,
  handleGetSummary,
  handleFindContributors,
  handleListPRs,
  handleListIssues,
  handleGetActivity,
  handleListReviews,
  handleListComments,
  handleGetFileChanges,
  handleGetReactions,
  handleListUntrackedRepos,
  toolAnnotations,
} from "./tools.js";

const server = new Server(
  { name: "mcp-github-analytics", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: "get_stats",
    description:
      "Get project statistics: contributor count, repos, PRs, issues, tier distribution",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
    annotations: toolAnnotations,
  },
  {
    name: "list_repos",
    description: "List tracked repositories with stars and forks",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "list_contributors",
    description: "List top contributors by score for a time period",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["day", "week", "month", "lifetime"],
          description: "Time period (default: lifetime)",
        },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_contributor",
    description:
      "Get a contributor's full profile: scores, focus areas, achievements, wallets",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "GitHub username" },
      },
      required: ["username"],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_summary",
    description:
      "Get AI-generated summary for a contributor, repo, or the whole project",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["contributor", "repo", "project"],
          description: "'contributor', 'repo', or 'project'",
        },
        username: {
          type: "string",
          description: "GitHub username (for contributor)",
        },
        repo: {
          type: "string",
          description: "Repo as 'owner/name' (for repo)",
        },
        interval: {
          type: "string",
          enum: ["day", "week", "month", "lifetime"],
          description: "Time interval (default: week)",
        },
      },
      required: ["type"],
    },
    annotations: toolAnnotations,
  },
  {
    name: "find_contributors",
    description: "Search contributors by tier, focus area, or minimum score",
    inputSchema: {
      type: "object" as const,
      properties: {
        tier: {
          type: "string",
          enum: ["beginner", "regular", "active", "veteran", "elite", "legend"],
        },
        focus: {
          type: "string",
          description: "Focus area tag (e.g., 'typescript', 'core')",
        },
        minScore: { type: "number", description: "Minimum total score" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "list_prs",
    description:
      "List pull requests, optionally filtered by author, repo, or state",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Filter by author username" },
        repo: { type: "string", description: "Filter by repository" },
        state: {
          type: "string",
          enum: ["open", "closed", "merged", "all"],
          description: "Filter by state (default: all)",
        },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "list_issues",
    description: "List issues, optionally filtered by author, repo, or state",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Filter by author username" },
        repo: { type: "string", description: "Filter by repository" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Filter by state (default: all)",
        },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_activity",
    description:
      "Get recent activity feed: PRs, issues, reviews across the project",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Filter by username" },
        repo: { type: "string", description: "Filter by repository" },
        days: {
          type: "number",
          description: "Days of history (default: 7, max: 90)",
        },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  // Quality Validation Tools
  {
    name: "list_reviews",
    description:
      "List code reviews with quality metrics. Detect rubber-stamping, review thoroughness, approval rates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Filter by reviewer username" },
        prAuthor: {
          type: "string",
          description: "Filter by PR author (who is being reviewed)",
        },
        state: {
          type: "string",
          enum: ["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "all"],
          description: "Filter by review state",
        },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "list_comments",
    description:
      "List PR and issue comments with spam detection. Find low-effort or duplicate comments.",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Filter by comment author" },
        type: {
          type: "string",
          enum: ["pr", "issue", "all"],
          description: "Comment type (default: all)",
        },
        minLength: {
          type: "number",
          description: "Minimum comment length in chars",
        },
        maxLength: {
          type: "number",
          description: "Maximum comment length (find short/spam comments)",
        },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_file_changes",
    description:
      "Get file changes from PRs. Identify code ownership, detect docs-only contributors, find experts by path.",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Filter by PR author" },
        path: {
          type: "string",
          description: "Filter by file path pattern (e.g., 'src/lib/auth')",
        },
        extension: {
          type: "string",
          description: "Filter by file extension (e.g., 'ts', 'md')",
        },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_reactions",
    description:
      "Get emoji reactions on PRs and issues. Measure community sentiment and engagement.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Filter by user who reacted" },
        type: {
          type: "string",
          enum: ["pr", "issue", "all"],
          description: "Reaction target type (default: all)",
        },
        content: {
          type: "string",
          description: "Filter by reaction type (e.g., '+1', 'rocket', 'eyes')",
        },
        limit: { type: "number", description: "Max results (default: 100)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "list_untracked_repos",
    description:
      "List repositories in the org that aren't being scored. Find active repos that should be tracked.",
    inputSchema: {
      type: "object" as const,
      properties: {
        minActivityScore: {
          type: "number",
          description: "Minimum activity score to filter by",
        },
        hasRecentActivity: {
          type: "boolean",
          description: "Only repos with pushes in last 30 days",
        },
        language: {
          type: "string",
          description: "Filter by primary language (e.g., 'TypeScript')",
        },
        limit: { type: "number", description: "Max results (default: 50)" },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = request.params.arguments ?? {};

  try {
    let result: unknown;

    switch (name) {
      case "get_stats":
        GetStatsSchema.parse(args);
        result = handleGetStats();
        break;
      case "list_repos":
        result = handleListRepos(ListReposSchema.parse(args));
        break;
      case "list_contributors":
        result = handleListContributors(ListContributorsSchema.parse(args));
        break;
      case "get_contributor":
        result = handleGetContributor(GetContributorSchema.parse(args));
        break;
      case "get_summary":
        result = handleGetSummary(GetSummarySchema.parse(args));
        break;
      case "find_contributors":
        result = handleFindContributors(FindContributorsSchema.parse(args));
        break;
      case "list_prs":
        result = handleListPRs(ListPRsSchema.parse(args));
        break;
      case "list_issues":
        result = handleListIssues(ListIssuesSchema.parse(args));
        break;
      case "get_activity":
        result = handleGetActivity(GetActivitySchema.parse(args));
        break;
      case "list_reviews":
        result = handleListReviews(ListReviewsSchema.parse(args));
        break;
      case "list_comments":
        result = handleListComments(ListCommentsSchema.parse(args));
        break;
      case "get_file_changes":
        result = handleGetFileChanges(GetFileChangesSchema.parse(args));
        break;
      case "get_reactions":
        result = handleGetReactions(GetReactionsSchema.parse(args));
        break;
      case "list_untracked_repos":
        result = handleListUntrackedRepos(ListUntrackedReposSchema.parse(args));
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    closeDb();
    process.exit(0);
  });

  await server.connect(transport);
  process.stderr.write(
    `MCP GitHub Analytics server started (DB-direct mode)\n`,
  );
  process.stderr.write(`Database: ${process.env.MCP_DB_PATH || "NOT SET"}\n`);
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e}\n`);
  process.exit(1);
});
