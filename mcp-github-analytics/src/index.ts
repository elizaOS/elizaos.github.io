#!/usr/bin/env node
/**
 * MCP Server for GitHub Analytics Platform
 *
 * A generic, fork-friendly MCP server that provides access to contributor
 * rankings, profiles, and AI-generated summaries via static JSON API.
 *
 * Configuration:
 *   MCP_API_BASE_URL - Base URL for the static API (default: https://elizaos.github.io)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { APIClient } from "./api-client.js";
import {
  GetStatsSchema,
  ListReposSchema,
  ListContributorsSchema,
  GetContributorSchema,
  GetSummarySchema,
  FindContributorsSchema,
  handleGetStats,
  handleListRepos,
  handleListContributors,
  handleGetContributor,
  handleGetSummary,
  handleFindContributors,
  toolAnnotations,
} from "./tools.js";

const apiClient = new APIClient();

const server = new Server(
  { name: "mcp-github-analytics", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: "get_stats",
    description:
      "Get project statistics: total contributors, activity counts, tier/class distribution.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
    annotations: toolAnnotations,
  },
  {
    name: "list_repos",
    description: "List tracked repositories.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
    annotations: toolAnnotations,
  },
  {
    name: "list_contributors",
    description:
      "List top contributors by period. Returns ranked list with tier, class, score, focus areas.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["weekly", "monthly", "lifetime"],
          description: "Time period (default: lifetime)",
        },
        limit: {
          type: "number",
          description: "Max entries (default: 20)",
        },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_contributor",
    description:
      "Get a contributor's profile: tier, class, scores, focus areas, achievements, wallets.",
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
      "Get AI-generated summary for a contributor, repository, or the whole project.",
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
        owner: { type: "string", description: "Repo owner (for repo)" },
        repo: { type: "string", description: "Repo name (for repo)" },
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
    description:
      "Search contributors by tier, class, focus area, score, or rank.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tier: {
          type: "string",
          enum: ["beginner", "regular", "active", "veteran", "elite", "legend"],
        },
        class: {
          type: "string",
          enum: [
            "Builder",
            "Hunter",
            "Scribe",
            "Maintainer",
            "Pathfinder",
            "Machine",
            "Contributor",
          ],
        },
        focus: {
          type: "string",
          description: "Focus area (e.g., 'typescript', 'core', 'ui')",
        },
        minScore: { type: "number" },
        maxRank: { type: "number" },
        limit: { type: "number", description: "Max results (default: 20)" },
        period: {
          type: "string",
          enum: ["weekly", "monthly", "lifetime"],
          description: "Which leaderboard (default: lifetime)",
        },
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
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "get_stats":
        GetStatsSchema.parse(args);
        result = await handleGetStats(apiClient);
        break;
      case "list_repos":
        ListReposSchema.parse(args);
        result = await handleListRepos(apiClient);
        break;
      case "list_contributors":
        result = await handleListContributors(
          apiClient,
          ListContributorsSchema.parse(args),
        );
        break;
      case "get_contributor":
        result = await handleGetContributor(
          apiClient,
          GetContributorSchema.parse(args),
        );
        break;
      case "get_summary":
        result = await handleGetSummary(
          apiClient,
          GetSummarySchema.parse(args),
        );
        break;
      case "find_contributors":
        result = await handleFindContributors(
          apiClient,
          FindContributorsSchema.parse(args),
        );
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
  await server.connect(transport);
  process.stderr.write(`MCP GitHub Analytics server started\n`);
  process.stderr.write(`API: ${apiClient.getBaseUrl()}\n`);
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e}\n`);
  process.exit(1);
});
