"use client";

import type { UntrackedRepository } from "../queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  GitFork,
  GitPullRequest,
  GitMerge,
  AlertCircle,
  Calendar,
  ExternalLink,
  Archive,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCompactNumber } from "@/lib/format-number";
import Link from "next/link";

interface Props {
  repository: UntrackedRepository;
}

export function UntrackedRepositoryCard({ repository }: Props) {
  const lastPushed = repository.lastPushedAt
    ? formatDistanceToNow(new Date(repository.lastPushedAt), {
        addSuffix: true,
      })
    : "Unknown";

  const hasHighActivity =
    repository.openPrCount + repository.mergedPrCount >= 5 ||
    repository.openIssueCount + repository.closedIssueCount >= 10;

  return (
    <Card className="h-full border border-border/40 transition-colors hover:border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`https://github.com/${repository.owner}/${repository.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-1"
              >
                <CardTitle className="truncate text-base font-semibold text-primary hover:underline">
                  {repository.owner}/{repository.name}
                </CardTitle>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Link>
            </div>
            {repository.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {repository.description}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
            {repository.isArchived && (
              <Badge variant="secondary" className="text-xs">
                <Archive className="mr-1 h-3 w-3" />
                Archived
              </Badge>
            )}
            {hasHighActivity && (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-xs text-amber-600"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500" />
            <span>{formatCompactNumber(repository.stars)}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            <span>{formatCompactNumber(repository.forks)}</span>
          </div>

          {repository.primaryLanguage && (
            <Badge variant="secondary" className="text-xs">
              {repository.primaryLanguage}
            </Badge>
          )}
        </div>

        {/* Recent Activity Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            {/* PR tri-split: Open / Merged / Closed-unmerged */}
            <div
              className="flex items-center gap-1"
              title="Open / Merged / Closed PRs (updated in last 30d)"
            >
              <GitPullRequest className="h-4 w-4 text-green-600" />
              <span className="text-green-600">{repository.openPrCount}</span>
              <span className="text-muted-foreground">/</span>
              <GitMerge className="h-4 w-4 text-purple-600" />
              <span className="text-purple-600">
                {repository.mergedPrCount}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {repository.closedUnmergedPrCount}
              </span>
            </div>

            {/* Issue split: Open / Closed */}
            <div
              className="flex items-center gap-1"
              title="Open / Closed issues (updated in last 30d)"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">
                {repository.openIssueCount}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {repository.closedIssueCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Pushed {lastPushed}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
