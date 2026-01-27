"use client";

import { useMemo } from "react";
import type { Repository, UntrackedRepository } from "@/lib/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis } from "recharts";
import {
  AlertCircle,
  GitPullRequest,
  Users,
  Calendar,
  Star,
  GitMerge,
  GitFork,
  ExternalLink,
  Archive,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { formatCompactNumber } from "@/lib/format-number";
import Link from "next/link";

const chartConfig = {
  commitCount: {
    label: "Commits",
    color: "hsl(142, 76%, 36%)", // GitHub green
  },
} satisfies ChartConfig;

type RepositoryCardProps = {
  repository: Repository | UntrackedRepository;
  type: "tracked" | "untracked";
};

export function RepositoryCard({ repository, type }: RepositoryCardProps) {
  const isTracked = type === "tracked";

  // Determine activity status
  const hasRecentActivity = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- Date.now() is stable during SSG build
    const now = Date.now();

    if (isTracked) {
      const lastUpdated = new Date((repository as Repository).lastUpdated);
      const daysSinceUpdate = Math.floor(
        (now - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysSinceUpdate <= 30;
    } else {
      const untrackedRepo = repository as UntrackedRepository;
      const lastPushedDate = untrackedRepo.lastPushedAt
        ? new Date(untrackedRepo.lastPushedAt)
        : null;
      const daysSincePush = lastPushedDate
        ? Math.floor((now - lastPushedDate.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      return (
        daysSincePush <= 30 ||
        untrackedRepo.openPrCount + untrackedRepo.mergedPrCount >= 5 ||
        untrackedRepo.openIssueCount + untrackedRepo.closedIssueCount >= 10
      );
    }
  }, [isTracked, repository]);

  const timeAgo = isTracked
    ? formatDistanceToNow(new Date((repository as Repository).lastUpdated), {
        addSuffix: true,
      })
    : (repository as UntrackedRepository).lastPushedAt
      ? formatDistanceToNow(
          new Date((repository as UntrackedRepository).lastPushedAt!),
          { addSuffix: true },
        )
      : "Unknown";

  // Color scheme based on activity level and tracking status
  const colors =
    isTracked && hasRecentActivity
      ? {
          card: "bg-green-500/[0.03]",
          border: "border-green-500/30 hover:border-green-500/50",
          title: "text-primary",
          star: "text-muted-foreground",
          description: "text-muted-foreground",
          issueIcon: "text-amber-600",
          openPrIcon: "text-green-600",
          mergedPrIcon: "text-purple-600",
          contributors: "text-muted-foreground",
          calendar: "text-muted-foreground",
        }
      : isTracked && !hasRecentActivity
        ? {
            card: "bg-blue-500/[0.03]",
            border: "border-blue-500/20 hover:border-blue-500/40",
            title: "text-foreground/80",
            star: "text-blue-400",
            description: "text-muted-foreground/80",
            issueIcon: "text-cyan-600",
            openPrIcon: "text-blue-500",
            mergedPrIcon: "text-slate-500",
            contributors: "text-muted-foreground/80",
            calendar: "text-muted-foreground/70",
          }
        : !isTracked && hasRecentActivity
          ? {
              card: "bg-muted/30",
              border: "border-border/40 hover:border-border/60",
              title: "text-foreground/70",
              star: "text-amber-500",
              fork: "text-muted-foreground",
              description: "text-muted-foreground",
              badge: "border-amber-500/50 text-amber-600",
              externalLink: "text-muted-foreground",
              openPr: "text-green-600",
              mergedPr: "text-purple-600",
              issues: "text-orange-600",
              separator: "text-muted-foreground",
              calendar: "text-muted-foreground",
            }
          : {
              card: "bg-muted/20",
              border: "border-border/40 hover:border-border/60",
              title: "text-muted-foreground/70",
              star: "text-blue-400",
              fork: "text-slate-400",
              description: "text-muted-foreground/80",
              badge: "border-cyan-500/50 text-cyan-600",
              externalLink: "text-muted-foreground/70",
              openPr: "text-blue-500",
              mergedPr: "text-slate-500",
              issues: "text-cyan-600",
              separator: "text-muted-foreground/70",
              calendar: "text-muted-foreground/70",
            };

  return (
    <Card
      className={`group flex h-full flex-col transition-all ${isTracked ? "border-2 shadow-sm hover:shadow-md" : "border border-dashed"} ${colors.border} ${colors.card}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`https://github.com/${repository.owner}/${repository.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`group/link flex min-w-0 items-center gap-1.5 ${!isTracked ? "min-w-0" : ""}`}
            >
              <CardTitle
                className={`truncate text-base font-semibold group-hover/link:underline ${colors.title}`}
              >
                {repository.owner}/{repository.name}
              </CardTitle>
              {!isTracked && (
                <ExternalLink
                  className={`h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100 ${colors.externalLink}`}
                />
              )}
            </Link>
            <div
              className={`mt-1.5 min-h-[2.5rem] text-sm ${colors.description}`}
            >
              {repository.description ? (
                <p className="line-clamp-2">{repository.description}</p>
              ) : (
                <p className="italic opacity-50">No description</p>
              )}
            </div>
          </div>

          {/* Tracked: Activity Chart | Untracked: Badges */}
          {isTracked ? (
            <div className="shrink-0">
              <div className="h-12 w-24">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart
                    data={(repository as Repository).weeklyCommitCounts}
                    margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                  >
                    <XAxis
                      dataKey="week"
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value, payload) => {
                            const firstPayload = payload?.[0]?.payload as
                              | Record<string, unknown>
                              | undefined;
                            if (
                              firstPayload &&
                              typeof firstPayload.week === "string"
                            ) {
                              const [year, week] = firstPayload.week.split("-");
                              const date = parseISO(
                                `${year}-W${week.padStart(2, "0")}`,
                              );
                              return `Week of ${date.toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}`;
                            }
                            return value as React.ReactNode;
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="commitCount"
                      stroke="var(--color-commitCount)"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 2.5, fill: "var(--color-commitCount)" }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          ) : (
            ((repository as UntrackedRepository).isArchived ||
              hasRecentActivity) && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                {(repository as UntrackedRepository).isArchived && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    <Archive className="mr-1 h-2.5 w-2.5" />
                    Archived
                  </Badge>
                )}
                {hasRecentActivity &&
                  !(repository as UntrackedRepository).isArchived && (
                    <Badge
                      variant="outline"
                      className={`h-5 text-[10px] ${colors.badge}`}
                    >
                      <Sparkles className="mr-1 h-2.5 w-2.5" />
                      Active
                    </Badge>
                  )}
              </div>
            )
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-end pt-0">
        {/* Stats Row */}
        {isTracked ? (
          <div className="mb-2.5 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <AlertCircle className={`h-3.5 w-3.5 ${colors.issueIcon}`} />
              <span>{(repository as Repository).openIssues}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitPullRequest className={`h-3.5 w-3.5 ${colors.openPrIcon}`} />
              <span>{(repository as Repository).openPullRequests}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitMerge className={`h-3.5 w-3.5 ${colors.mergedPrIcon}`} />
              <span>{(repository as Repository).mergedPullRequests}</span>
            </div>
          </div>
        ) : (
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5 text-sm">
            <div className="flex items-center gap-1">
              <Star className={`h-3.5 w-3.5 ${colors.star}`} />
              <span className="text-xs">
                {formatCompactNumber((repository as UntrackedRepository).stars)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className={`h-3.5 w-3.5 ${colors.fork}`} />
              <span className="text-xs">
                {formatCompactNumber((repository as UntrackedRepository).forks)}
              </span>
            </div>
            {(repository as UntrackedRepository).primaryLanguage && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {(repository as UntrackedRepository).primaryLanguage}
              </Badge>
            )}
          </div>
        )}

        {/* Bottom Row */}
        {isTracked ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Users
                className={`h-3.5 w-3.5 shrink-0 ${colors.contributors}`}
              />
              <span className={`truncate text-xs ${colors.contributors}`}>
                {(repository as Repository).totalContributors}
              </span>
              {(repository as Repository).topContributors.length > 0 && (
                <div className="flex shrink-0 -space-x-1">
                  {(repository as Repository).topContributors
                    .slice(0, 3)
                    .map((contributor) => (
                      <Avatar
                        key={contributor.username}
                        className="h-4 w-4 border border-background"
                      >
                        <AvatarImage
                          src={contributor.avatarUrl ?? undefined}
                          alt={contributor.username}
                        />
                        <AvatarFallback className="text-[10px]">
                          {contributor.username.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                </div>
              )}
            </div>
            <div
              className={`flex shrink-0 items-center gap-1 text-xs ${colors.calendar}`}
            >
              <Calendar className="h-3 w-3" />
              <span className="whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-xs">
              <div
                className="flex items-center gap-0.5"
                title="Open / Merged / Closed PRs (updated in last 30d)"
              >
                <GitPullRequest className={`h-3 w-3 ${colors.openPr}`} />
                <span className={colors.openPr}>
                  {(repository as UntrackedRepository).openPrCount}
                </span>
                <span className={`${colors.separator} mx-0.5`}>/</span>
                <GitMerge className={`h-3 w-3 ${colors.mergedPr}`} />
                <span className={colors.mergedPr}>
                  {(repository as UntrackedRepository).mergedPrCount}
                </span>
                <span className={`${colors.separator} mx-0.5`}>/</span>
                <span className={colors.separator}>
                  {(repository as UntrackedRepository).closedUnmergedPrCount}
                </span>
              </div>
              <div
                className="flex items-center gap-0.5"
                title="Open / Closed issues (updated in last 30d)"
              >
                <AlertCircle className={`h-3 w-3 ${colors.issues}`} />
                <span className={colors.issues}>
                  {(repository as UntrackedRepository).openIssueCount}
                </span>
                <span className={`${colors.separator} mx-0.5`}>/</span>
                <span className={colors.separator}>
                  {(repository as UntrackedRepository).closedIssueCount}
                </span>
              </div>
            </div>
            <div
              className={`flex shrink-0 items-center gap-1 text-xs ${colors.calendar}`}
            >
              <Calendar className="h-3 w-3" />
              <span className="whitespace-nowrap">Pushed {timeAgo}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
