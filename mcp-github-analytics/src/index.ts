#!/usr/bin/env node
/**
 * MCP Server for GitHub Analytics Platform
 *
 * A generic, fork-friendly MCP server that provides access to contributor
 * rankings, profiles, and AI-generated summaries via static JSON API.
 *
 * Configuration:
 *   MCP_API_BASE_URL - Base URL for the static API (default: https://elizaos.github.io)
 *
 * Usage:
 *   npx mcp-github-analytics
 *   MCP_API_BASE_URL=https://example.com npx mcp-github-analytics
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
  GetLeaderboardSchema,
  GetProfileSchema,
  GetSummarySchema,
  SearchSchema,
  handleGetLeaderboard,
  handleGetProfile,
  handleGetSummary,
  handleSearch,
  toolAnnotations,
} from "./tools.js";

// Initialize API client with configurable base URL
const apiClient = new APIClient();

// Create MCP server
const server = new Server(
  {
    name: "mcp-github-analytics",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool definitions - optimized for developer experience
const TOOLS = [
  {
    name: "get_leaderboard",
    description:
      "Get contributor rankings. Returns ranked list with scores, tiers, classes, and focus areas.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["weekly", "monthly", "lifetime"],
          description: "Time period: 'weekly', 'monthly', or 'lifetime'",
        },
        limit: {
          type: "number",
          description: "Max entries (default: 20, max: 100)",
          minimum: 1,
          maximum: 100,
        },
      },
      required: ["period"],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_profile",
    description:
      "Get a contributor's profile. Returns their character sheet: tier, class, scores, focus areas, achievements, and wallets.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: {
          type: "string",
          description: "GitHub username",
        },
      },
      required: ["username"],
    },
    annotations: toolAnnotations,
  },
  {
    name: "get_summary",
    description:
      "Get AI-generated summary. Can summarize a contributor's activity, a repository's changes, or the entire project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["contributor", "repo", "project"],
          description:
            "What to summarize: 'contributor' (a person), 'repo' (a repository), or 'project' (all repos)",
        },
        username: {
          type: "string",
          description: "GitHub username (required for type='contributor')",
        },
        owner: {
          type: "string",
          description: "Repo owner (required for type='repo')",
        },
        repo: {
          type: "string",
          description: "Repo name (required for type='repo')",
        },
        interval: {
          type: "string",
          enum: ["day", "week", "month", "lifetime"],
          description:
            "Time interval: 'day', 'week', 'month', or 'lifetime' (lifetime only for contributors)",
        },
      },
      required: ["type", "interval"],
    },
    annotations: toolAnnotations,
  },
  {
    name: "search",
    description:
      "Search contributors by criteria: tier (beginner→legend), class (Builder/Hunter/Scribe/etc), focus area (typescript/core/ui/etc), min score, or max rank.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tier: {
          type: "string",
          enum: ["beginner", "regular", "active", "veteran", "elite", "legend"],
          description: "Filter by tier",
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
          description: "Filter by class",
        },
        focus: {
          type: "string",
          description:
            "Filter by focus area (e.g., 'typescript', 'core', 'ui')",
        },
        minScore: {
          type: "number",
          description: "Minimum score",
        },
        maxRank: {
          type: "number",
          description: "Maximum rank (e.g., 50 = top 50)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
          minimum: 1,
          maximum: 100,
        },
        period: {
          type: "string",
          enum: ["weekly", "monthly", "lifetime"],
          description: "Which leaderboard to search (default: lifetime)",
        },
      },
      required: [],
    },
    annotations: toolAnnotations,
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "get_leaderboard": {
        const parsed = GetLeaderboardSchema.parse(args);
        result = await handleGetLeaderboard(apiClient, parsed);
        break;
      }
      case "get_profile": {
        const parsed = GetProfileSchema.parse(args);
        result = await handleGetProfile(apiClient, parsed);
        break;
      }
      case "get_summary": {
        const parsed = GetSummarySchema.parse(args);
        result = await handleGetSummary(apiClient, parsed);
        break;
      }
      case "search": {
        const parsed = SearchSchema.parse(args);
        result = await handleSearch(apiClient, parsed);
        break;
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle fetch errors (API not found, network issues)
    if (
      error instanceof Error &&
      error.message.includes("API request failed")
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    // Handle validation errors (missing required fields, etc.)
    if (
      error instanceof Error &&
      (error.name === "ZodError" || error.message.includes("required"))
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid arguments: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    // Re-throw MCP errors
    if (error instanceof McpError) {
      throw error;
    }

    // Handle other errors
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr to avoid interfering with STDIO transport
  const baseUrl = apiClient.getBaseUrl();
  process.stderr.write(`MCP GitHub Analytics server started\n`);
  process.stderr.write(`API Base URL: ${baseUrl}\n`);
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
