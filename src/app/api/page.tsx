import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveEndpoints } from "./components/InteractiveEndpoints";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface Repository {
  owner: string;
  name: string;
  defaultBranch: string;
}

// Get base URL from env or use default
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://elizaos.github.io";

// Load repositories from config file
function loadRepositories(): Repository[] {
  try {
    const configFile =
      process.env.PIPELINE_CONFIG_FILE || "config/example.json";
    const configPath = join(process.cwd(), configFile);

    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      return config.PIPELINE_REPOS || [];
    }
  } catch (error) {
    console.warn("Could not load config file:", error);
  }

  // Fallback to a default repo if config can't be loaded
  return [{ owner: "elizaos", name: "eliza", defaultBranch: "main" }];
}

// Parse repositories
const repositories = loadRepositories().map((repo) => ({
  owner: repo.owner,
  name: repo.name,
  normalized: `${repo.owner}_${repo.name}`,
}));

const staticEndpoints = {
  leaderboard: [
    {
      path: "/api/leaderboard-monthly.json",
      description: "Current month's contributor rankings",
    },
    {
      path: "/api/leaderboard-weekly.json",
      description: "Current week's contributor rankings",
    },
    {
      path: "/api/leaderboard-lifetime.json",
      description: "All-time contributor rankings",
    },
  ],
  profiles: [
    {
      path: "/api/contributors/{username}/profile.json",
      description: "Complete character sheet for a contributor",
    },
  ],
  summaries: [
    {
      path: "/api/summaries/overall/{interval}/latest.json",
      description: "Most recent overall project summary",
    },
    {
      path: "/api/summaries/overall/{interval}/index.json",
      description: "Index of all overall summaries",
    },
    {
      path: "/api/summaries/overall/{interval}/{date}.json",
      description: "Overall summary for a specific date",
    },
    {
      path: "/api/summaries/contributors/{username}/{interval}/latest.json",
      description: "Most recent contributor summary",
    },
    {
      path: "/api/summaries/contributors/{username}/{interval}/index.json",
      description: "Index of all contributor summaries",
    },
    {
      path: "/api/summaries/contributors/{username}/lifetime.json",
      description: "All-time contributor summary",
    },
  ],
};

function StaticEndpointRow({
  path,
  description,
}: {
  path: string;
  description: string;
}) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <code className="rounded bg-muted px-2 py-1 text-sm">{path}</code>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{description}</td>
    </tr>
  );
}

export default function ApiPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <article className="prose prose-lg max-w-none dark:prose-invert">
        <h1 className="text-center">API</h1>

        <p className="text-center text-muted-foreground">
          Static JSON endpoints for programmatic access to leaderboard and
          summary data.
        </p>

        <section className="not-prose mt-8 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Base URL</h2>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-3 py-2 text-sm">
                  {baseUrl}
                </code>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/openapi.json" download="openapi.json">
                <Download className="mr-2 h-4 w-4" />
                OpenAPI Spec
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-8">
          <h2>API Discovery</h2>
          <p>
            Start here: the API index provides a complete map of all available
            endpoints, capabilities, and metadata for programmatic discovery.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>For AI Agents:</strong> Query <code>/api/index.json</code>{" "}
            first to discover all endpoints, intervals, character system
            metadata (tiers, classes, focus areas), and search capabilities
            without hardcoding URLs.
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <StaticEndpointRow
                  path="/api/index.json"
                  description="Complete API directory with all endpoints and capabilities"
                />
              </tbody>
            </table>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer font-medium">
              Response Schema
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(
                {
                  version: "1.0",
                  baseUrl: "https://elizaos.github.io",
                  documentation: "https://elizaos.github.io/api",
                  openapi: "https://elizaos.github.io/openapi.json",
                  endpoints: {
                    leaderboard: {
                      monthly:
                        "https://elizaos.github.io/api/leaderboard-monthly.json",
                      weekly:
                        "https://elizaos.github.io/api/leaderboard-weekly.json",
                      lifetime:
                        "https://elizaos.github.io/api/leaderboard-lifetime.json",
                    },
                    profiles: {
                      pattern:
                        "https://elizaos.github.io/api/contributors/{username}/profile.json",
                      example:
                        "https://elizaos.github.io/api/contributors/example-user/profile.json",
                    },
                    summaries: {
                      overall: {
                        pattern:
                          "https://elizaos.github.io/api/summaries/overall/{interval}/latest.json",
                        intervals: ["day", "week", "month"],
                      },
                      contributors: {
                        pattern:
                          "https://elizaos.github.io/api/summaries/contributors/{username}/{interval}/latest.json",
                        intervals: ["day", "week", "month", "lifetime"],
                      },
                    },
                  },
                  capabilities: {
                    search: {
                      byUsername: true,
                      byRank: true,
                      byTier: true,
                      byFocusArea: true,
                    },
                    intervals: ["day", "week", "month", "lifetime"],
                    characterSystem: {
                      tiers: [
                        "beginner",
                        "regular",
                        "active",
                        "veteran",
                        "elite",
                        "legend",
                      ],
                      classes: [
                        "Author",
                        "Reviewer",
                        "Maintainer",
                        "Advocate",
                        "Discussant",
                        "Contributor",
                      ],
                      focusAreas: [
                        "core",
                        "frontend",
                        "backend",
                        "typescript",
                        "react",
                        "docs",
                      ],
                    },
                  },
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>

        <section className="mt-8">
          <h2>Leaderboard</h2>
          <p>
            Ranked contributor data with scores, wallet addresses, and avatars
            across all tracked repositories.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Enhanced:</strong> Each contributor includes{" "}
            <code>focusAreas</code> (expertise tags with scores, percentages,
            and rankings), <code>achievements</code> (earned badges),{" "}
            <code>profile</code> (qualitative behavior signals),{" "}
            <code>scoreBreakdown</code> (MMORPG-style character sheet with
            tiers, percentiles, and contribution distribution), and{" "}
            <code>links</code> (deep links to profile, summaries, and GitHub for
            context crawling)
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {staticEndpoints.leaderboard.map((ep) => (
                  <StaticEndpointRow key={ep.path} {...ep} />
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer font-medium">
              Response Schema
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(
                {
                  version: "1.0",
                  period: "monthly | weekly | lifetime",
                  startDate: "2025-01-01",
                  endDate: "2025-01-31",
                  generatedAt: "2025-01-15T12:00:00Z",
                  totalUsers: 150,
                  leaderboard: [
                    {
                      rank: 1,
                      username: "contributor1",
                      avatarUrl: "https://...",
                      score: 1250,
                      prScore: 800,
                      issueScore: 200,
                      reviewScore: 150,
                      commentScore: 100,
                      wallets: { solana: "...", ethereum: "..." },
                      focusAreas: [
                        {
                          tag: "Frontend",
                          score: 565.5,
                          percentage: 45.2,
                          rank: 3,
                          totalInArea: 45,
                        },
                        {
                          tag: "React",
                          score: 401.3,
                          percentage: 32.1,
                          rank: 8,
                          totalInArea: 67,
                        },
                        {
                          tag: "UI/UX",
                          score: 283.8,
                          percentage: 22.7,
                          rank: 12,
                          totalInArea: 52,
                        },
                      ],
                      achievements: [
                        {
                          type: "level",
                          tier: "elite",
                          earnedAt: "2024-11-15T10:00:00Z",
                        },
                        {
                          type: "pr_master",
                          tier: "legend",
                          earnedAt: "2024-12-01T08:30:00Z",
                        },
                      ],
                      profile: {
                        contributorType: "collaborator",
                        prMergeRate: 93.3,
                        reviewActivity: "high",
                      },
                      scoreBreakdown: {
                        total: 1250,
                        distribution: {
                          prs: {
                            score: 800,
                            percentage: 64.0,
                            label: "Code Author",
                          },
                          issues: {
                            score: 200,
                            percentage: 16.0,
                            label: "Problem Finder",
                          },
                          reviews: {
                            score: 150,
                            percentage: 12.0,
                            label: "Code Reviewer",
                          },
                          comments: {
                            score: 100,
                            percentage: 8.0,
                            label: "Discussant",
                          },
                        },
                        tier: "elite",
                        percentile: 95.3,
                        characterClass: "Author-Reviewer",
                      },
                      links: {
                        profile:
                          "https://elizaos.github.io/profile/contributor1",
                        summary:
                          "https://elizaos.github.io/api/summaries/contributors/contributor1/day/latest.json",
                        github: "https://github.com/contributor1",
                      },
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>

        <section className="mt-8">
          <h2>Contributor Profiles</h2>
          <p>
            Individual contributor character sheets with complete stats, class
            info, rankings across all periods, and focus areas.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Query by username:</strong> Get all data for a specific
            contributor without downloading the entire leaderboard.
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {staticEndpoints.profiles.map((ep) => (
                  <StaticEndpointRow key={ep.path} {...ep} />
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer font-medium">
              Response Schema
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(
                {
                  version: "1.0",
                  username: "contributor1",
                  generatedAt: "2026-01-08T23:00:00Z",
                  characterSheet: {
                    tier: "elite",
                    characterClass: "Maintainer",
                    percentile: 95.3,
                    rank: {
                      monthly: 12,
                      weekly: 8,
                      lifetime: 15,
                    },
                    scoreBreakdown: {
                      total: 1250,
                      distribution: {
                        prs: {
                          score: 800,
                          percentage: 64.0,
                          label: "Code Author",
                        },
                        issues: {
                          score: 200,
                          percentage: 16.0,
                          label: "Problem Finder",
                        },
                        reviews: {
                          score: 150,
                          percentage: 12.0,
                          label: "Code Reviewer",
                        },
                        comments: {
                          score: 100,
                          percentage: 8.0,
                          label: "Discussant",
                        },
                      },
                      tier: "elite",
                      percentile: 95.3,
                      characterClass: "Maintainer",
                    },
                    focusAreas: [
                      {
                        tag: "core",
                        score: 565.5,
                        percentage: 45.2,
                        rank: 3,
                        totalInArea: 45,
                      },
                      {
                        tag: "typescript",
                        score: 401.3,
                        percentage: 32.1,
                        rank: 8,
                        totalInArea: 67,
                      },
                    ],
                    achievements: [
                      {
                        type: "level",
                        tier: "elite",
                        earnedAt: "2024-11-15T10:00:00Z",
                      },
                    ],
                    profile: {
                      contributorType: "collaborator",
                      prMergeRate: 93.3,
                      reviewActivity: "high",
                    },
                    wallets: {
                      solana: "...",
                      ethereum: "...",
                    },
                  },
                  links: {
                    summaries: {
                      lifetime:
                        "https://elizaos.github.io/api/summaries/contributors/contributor1/lifetime.json",
                      monthly:
                        "https://elizaos.github.io/api/summaries/contributors/contributor1/month/latest.json",
                      weekly:
                        "https://elizaos.github.io/api/summaries/contributors/contributor1/week/latest.json",
                      daily:
                        "https://elizaos.github.io/api/summaries/contributors/contributor1/day/latest.json",
                    },
                    github: "https://github.com/contributor1",
                    profile: "https://elizaos.github.io/profile/contributor1",
                  },
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>

        <section className="mt-8">
          <h2>Overall & Contributor Summaries</h2>
          <p>
            AI-generated summaries of project activity at daily, weekly,
            monthly, and lifetime intervals.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Intervals:</strong> <code>day</code>, <code>week</code>,{" "}
            <code>month</code>, <code>lifetime</code> (all-time,
            contributor-only)
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {staticEndpoints.summaries.map((ep) => (
                  <StaticEndpointRow key={ep.path} {...ep} />
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer font-medium">
              Response Schema
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(
                {
                  version: "1.0",
                  type: "overall | repository | contributor",
                  interval: "day | week | month",
                  date: "2025-01-15",
                  generatedAt: "2025-01-15T23:00:00Z",
                  contentHash: "abc123...",
                  content: "# Summary\n\nMarkdown content...",
                  metadata: {
                    entityId: "optional-entity-id",
                  },
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>

        <section className="not-prose mt-8">
          <h2 className="mb-4 text-2xl font-bold">
            Repository-Specific Endpoints
          </h2>
          <p className="mb-6 text-muted-foreground">
            Per-repository summaries and statistics. Select a repository to see
            live endpoints for AI-generated summaries and activity metrics.
          </p>
          <InteractiveEndpoints repositories={repositories} baseUrl={baseUrl} />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="mt-0">Notes</h2>
          <ul className="mb-0">
            <li>
              <strong>API Discovery:</strong> Start with{" "}
              <code>/api/index.json</code> to programmatically discover all
              endpoints, capabilities, and metadata without hardcoding URLs
            </li>
            <li>All endpoints return JSON with CORS headers</li>
            <li>Data regenerates on each deployment</li>
            <li>
              Use <code>index.json</code> to discover available dates (for
              summaries)
            </li>
            <li>
              Use <code>latest.json</code> for the most recent data (for
              summaries)
            </li>
            <li>
              <strong>Repository Stats vs Leaderboard:</strong> Stats show
              per-repository contributor rankings, while leaderboard shows
              global rankings across all repositories
            </li>
            <li>
              <strong>Query with jq:</strong> Extract data easily with{" "}
              <code>
                curl {baseUrl}/api/index.json | jq &apos;.endpoints&apos;
              </code>
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
