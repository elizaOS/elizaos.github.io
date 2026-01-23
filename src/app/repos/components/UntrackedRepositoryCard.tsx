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

  // Check if repo has recent activity (pushed within last 30 days)
  const lastPushedDate = repository.lastPushedAt
    ? new Date(repository.lastPushedAt)
    : null;
  const daysSincePush = lastPushedDate
    ? Math.floor(
        (Date.now() - lastPushedDate.getTime()) / (1000 * 60 * 60 * 24),
      )
    : Infinity;

  // Consider "active" if: recently pushed OR high activity counts
  const hasHighActivity =
    daysSincePush <= 30 ||
    repository.openPrCount + repository.mergedPrCount >= 5 ||
    repository.openIssueCount + repository.closedIssueCount >= 10;

  // Color scheme based on activity level
  const colors = hasHighActivity
    ? {
        // Warm colors for active repos
        card: "border-border/40 bg-background",
        title: "text-primary",
        externalLink: "text-muted-foreground",
        description: "text-muted-foreground",
        badge: "border-amber-500/50 text-amber-600",
        star: "text-amber-500",
        fork: "text-muted-foreground",
        openPr: "text-green-600",
        mergedPr: "text-purple-600",
        issues: "text-orange-600",
        separator: "text-muted-foreground",
        calendar: "text-muted-foreground",
      }
    : {
        // Cool colors for inactive repos
        card: "border-border/30 bg-muted/20",
        title: "text-foreground/80",
        externalLink: "text-muted-foreground/70",
        description: "text-muted-foreground/80",
        badge: "border-cyan-500/50 text-cyan-600",
        star: "text-blue-400",
        fork: "text-slate-400",
        openPr: "text-blue-500",
        mergedPr: "text-slate-500",
        issues: "text-cyan-600",
        separator: "text-muted-foreground/70",
        calendar: "text-muted-foreground/70",
      };

  return (
    <Card
      className={`h-full border transition-colors hover:border-border/80 ${colors.card}`}
    >
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
                <CardTitle
                  className={`truncate text-base font-semibold hover:underline ${colors.title}`}
                >
                  {repository.owner}/{repository.name}
                </CardTitle>
                <ExternalLink
                  className={`h-3 w-3 shrink-0 ${colors.externalLink}`}
                />
              </Link>
            </div>
            {repository.description && (
              <p className={`mt-1 line-clamp-2 text-sm ${colors.description}`}>
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
              <Badge variant="outline" className={`text-xs ${colors.badge}`}>
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
            <Star className={`h-4 w-4 ${colors.star}`} />
            <span>{formatCompactNumber(repository.stars)}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitFork className={`h-4 w-4 ${colors.fork}`} />
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
              <GitPullRequest className={`h-4 w-4 ${colors.openPr}`} />
              <span className={colors.openPr}>{repository.openPrCount}</span>
              <span className={colors.separator}>/</span>
              <GitMerge className={`h-4 w-4 ${colors.mergedPr}`} />
              <span className={colors.mergedPr}>
                {repository.mergedPrCount}
              </span>
              <span className={colors.separator}>/</span>
              <span className={colors.separator}>
                {repository.closedUnmergedPrCount}
              </span>
            </div>

            {/* Issue split: Open / Closed */}
            <div
              className="flex items-center gap-1"
              title="Open / Closed issues (updated in last 30d)"
            >
              <AlertCircle className={`h-4 w-4 ${colors.issues}`} />
              <span className={colors.issues}>{repository.openIssueCount}</span>
              <span className={colors.separator}>/</span>
              <span className={colors.separator}>
                {repository.closedIssueCount}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-1 text-xs ${colors.calendar}`}>
            <Calendar className="h-3 w-3" />
            <span>Pushed {lastPushed}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
