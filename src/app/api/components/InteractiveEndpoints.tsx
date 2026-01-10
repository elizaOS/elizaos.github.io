"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Repository {
  owner: string;
  name: string;
  normalized: string;
}

interface InteractiveEndpointsProps {
  repositories: Repository[];
  baseUrl: string;
}

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

export function InteractiveEndpoints({
  repositories,
  baseUrl,
}: InteractiveEndpointsProps) {
  const [selectedRepo, setSelectedRepo] = useState(
    repositories[0]?.normalized || "elizaos_eliza",
  );

  const currentRepo = repositories.find((r) => r.normalized === selectedRepo);
  const displayName = currentRepo
    ? `${currentRepo.owner}/${currentRepo.name}`
    : selectedRepo.replace("_", "/");

  const endpoints = {
    summaries: [
      {
        path: `/api/summaries/repos/${selectedRepo}/day/latest.json`,
        description: "Most recent daily repository summary",
      },
      {
        path: `/api/summaries/repos/${selectedRepo}/day/index.json`,
        description: "Index of all daily repository summaries",
      },
    ],
    stats: [
      {
        path: `/${selectedRepo}/stats/day/stats_2025-01-15.json`,
        description: "Repository statistics for a specific date",
      },
      {
        path: `/${selectedRepo}/stats/month/stats_2024-11.json`,
        description: "Repository statistics for a month",
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Select Repository:</label>
        <Select value={selectedRepo} onValueChange={setSelectedRepo}>
          <SelectTrigger className="w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {repositories.map((repo) => (
              <SelectItem key={repo.normalized} value={repo.normalized}>
                {repo.owner}/{repo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          ({repositories.length} repos tracked)
        </span>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">
          Repository Summaries for {displayName}
        </h3>
        <div className="not-prose overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Try</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.summaries.map((ep) => {
                const fullUrl = `${baseUrl}${ep.path}`;
                return (
                  <tr key={ep.path} className="border-b border-border">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {ep.path}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ep.description}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">
          Repository Stats for {displayName}
        </h3>
        <div className="not-prose overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Try</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.stats.map((ep) => {
                const fullUrl = `${baseUrl}${ep.path}`;
                return (
                  <tr key={ep.path} className="border-b border-border">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {ep.path}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ep.description}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <details className="mt-6">
        <summary className="cursor-pointer font-medium">
          Repository Stats Response Schema
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {JSON.stringify(
            {
              interval: {
                intervalStart: "2024-11-01T00:00:00.000Z",
                intervalEnd: "2024-12-01T00:00:00.000Z",
                intervalType: "month",
              },
              repository: "elizaos/eliza",
              overview:
                "From 2024-11-01 to 2024-12-01, elizaos/eliza had 150 new PRs (120 merged), 80 new issues, and 45 active contributors.",
              topContributors: [
                {
                  username: "contributor1",
                  avatarUrl: "https://...",
                  totalScore: 2012.31,
                  prScore: 1867.45,
                  issueScore: 20.1,
                  reviewScore: 122.5,
                  commentScore: 2.25,
                },
              ],
              topIssues: [
                {
                  id: "...",
                  title: "Issue title",
                  author: "username",
                  number: 123,
                  state: "OPEN",
                  commentCount: 15,
                  repository: "elizaos/eliza",
                  createdAt: "2024-11-15T10:00:00Z",
                },
              ],
              topPRs: [
                {
                  id: "...",
                  title: "PR title",
                  author: "username",
                  number: 456,
                  repository: "elizaos/eliza",
                  createdAt: "2024-11-20T14:30:00Z",
                  mergedAt: "2024-11-21T09:00:00Z",
                  additions: 250,
                  deletions: 100,
                },
              ],
              codeChanges: {
                additions: 15420,
                deletions: 8320,
                files: 432,
                commitCount: 256,
              },
              completedItems: [],
              newPRs: 150,
              mergedPRs: 120,
              newIssues: 80,
              closedIssues: 65,
              activeContributors: 45,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
