"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const endpoints = {
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
  summaries: [
    {
      path: "/api/summaries/overall/{interval}/latest.json",
      description: "Most recent overall project summary",
      example: "/api/summaries/overall/day/latest.json",
    },
    {
      path: "/api/summaries/overall/{interval}/index.json",
      description: "Index of all overall summaries",
      example: "/api/summaries/overall/day/index.json",
    },
    {
      path: "/api/summaries/overall/{interval}/{date}.json",
      description: "Overall summary for a specific date",
      example: "/api/summaries/overall/day/2025-01-15.json",
    },
    {
      path: "/api/summaries/repos/{owner}_{repo}/{interval}/latest.json",
      description: "Most recent repository summary",
      example: "/api/summaries/repos/elizaos_eliza/day/latest.json",
    },
    {
      path: "/api/summaries/repos/{owner}_{repo}/{interval}/index.json",
      description: "Index of all repository summaries",
      example: "/api/summaries/repos/elizaos_eliza/day/index.json",
    },
    {
      path: "/api/summaries/contributors/{username}/{interval}/latest.json",
      description: "Most recent contributor summary",
      example: "/api/summaries/contributors/wtfsayo/day/latest.json",
    },
    {
      path: "/api/summaries/contributors/{username}/{interval}/index.json",
      description: "Index of all contributor summaries",
      example: "/api/summaries/contributors/wtfsayo/day/index.json",
    },
  ],
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={handleCopy}
      title="Copy URL"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function EndpointRow({
  path,
  description,
  example,
  baseUrl,
}: {
  path: string;
  description: string;
  example?: string;
  baseUrl: string;
}) {
  const livePath = example || path;
  const fullUrl = `${baseUrl}${livePath}`;
  const hasVariables = path.includes("{");

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <code className="rounded bg-muted px-2 py-1 text-sm">{path}</code>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{description}</td>
      <td className="px-4 py-3">
        {!hasVariables || example ? (
          <div className="flex items-center gap-2">
            <Link
              href={fullUrl}
              target="_blank"
              className="text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <CopyButton text={fullUrl} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export default function ApiPage() {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const url =
      window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "");
    setBaseUrl(url);
  }, []);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <article className="prose prose-lg max-w-none dark:prose-invert">
        <h1 className="text-center">API</h1>

        <p className="text-center text-muted-foreground">
          Static JSON endpoints for programmatic access to leaderboard and
          summary data.
        </p>

        <section className="not-prose mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Base URL</h2>
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-3 py-2 text-sm">
              {baseUrl || "Loading..."}
            </code>
            {baseUrl && <CopyButton text={baseUrl} />}
          </div>
        </section>

        <section className="mt-8">
          <h2>Leaderboard</h2>
          <p>
            Ranked contributor data with scores, wallet addresses, and avatars.
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Try</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.leaderboard.map((ep) => (
                  <EndpointRow key={ep.path} {...ep} baseUrl={baseUrl} />
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
          <h2>Summaries</h2>
          <p>
            AI-generated summaries of project activity at daily, weekly, and
            monthly intervals.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Intervals:</strong> <code>day</code>, <code>week</code>,{" "}
            <code>month</code>
            <br />
            <strong>Repo format:</strong> <code>owner_repo</code> (underscore
            separator)
          </p>

          <div className="not-prose overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Try</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.summaries.map((ep) => (
                  <EndpointRow key={ep.path} {...ep} baseUrl={baseUrl} />
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

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="mt-0">Notes</h2>
          <ul className="mb-0">
            <li>All endpoints return JSON with CORS headers</li>
            <li>Data regenerates on each deployment</li>
            <li>
              Use <code>index.json</code> to discover available dates
            </li>
            <li>
              Use <code>latest.json</code> for the most recent data
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
