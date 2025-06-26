"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";
import {
  Users,
  Star,
  TrendingUp,
  CircleDot,
  GitMerge,
  CheckCircle,
} from "lucide-react";
import { CounterWithIcon } from "@/components/counter-with-icon";
import Link from "next/link";
import PullRequestsListModalContent from "./PullRequestsListModalContent";
import IssuesListModalContent from "./IssuesListModalContent";
import ContributorsListModalContent from "./ContributorsListModalContent";
import { formatTimeframeTitle } from "@/lib/date-utils";

interface LeftSidebarProps {
  metrics: IntervalMetrics;
}

interface Contributor {
  username: string;
  totalScore: number;
  summary?: string | null;
}

export function LeftSidebar({ metrics }: LeftSidebarProps) {
  const timeframeTitle = formatTimeframeTitle(
    metrics.interval.intervalStart,
    metrics.interval.intervalType,
  );

  return (
    <>
      {/* Top Contributors Card */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="h-fit cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Contributors ({metrics.activeContributors})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ScrollArea className="h-80">
                <div className="space-y-2 pr-2">
                  {metrics.topContributors
                    .slice(0, 10)
                    .map((contributor: Contributor, index) => (
                      <Link
                        key={contributor.username}
                        href={`/profile/${contributor.username}`}
                        className="block rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarImage
                              src={`https://github.com/${contributor.username}.png`}
                              alt={contributor.username}
                            />
                            <AvatarFallback className="text-xs">
                              {contributor.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="truncate text-sm font-medium hover:text-primary">
                                {contributor.username}
                              </p>
                              <Badge
                                variant="outline"
                                className="ml-2 flex-shrink-0 text-xs"
                              >
                                #{index + 1}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-muted-foreground">
                                {contributor.totalScore.toFixed(1)} pts
                              </span>
                            </div>
                            {contributor.summary && (
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {contributor.summary.replace(
                                  `${contributor.username}: `,
                                  "",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  {metrics.topContributors.length > 10 && (
                    <div className="border-t pt-2 text-center text-xs text-muted-foreground">
                      +{metrics.topContributors.length - 10} more contributors
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contributors</DialogTitle>
          </DialogHeader>
          <ContributorsListModalContent
            contributors={metrics.topContributors}
          />
        </DialogContent>
      </Dialog>

      {/* Pull Requests Card */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="flex cursor-pointer flex-col transition-colors hover:bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500"
                  >
                    <circle cx="18" cy="18" r="3"></circle>
                    <circle cx="6" cy="6" r="3"></circle>
                    <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                    <line x1="6" x2="6" y1="9" y2="21"></line>
                  </svg>
                  Pull Requests ({metrics.pullRequests.new})
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs">
                    <CircleDot className="h-3 w-3 text-green-500" />
                    <span className="font-medium">
                      {metrics.pullRequests.new}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <GitMerge className="h-3 w-3 text-purple-500" />
                    <span className="font-medium">
                      {metrics.pullRequests.merged}
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-2">
                  {metrics.topPullRequests.slice(0, 10).map((pr, index) => (
                    <div
                      key={pr.id}
                      className="group flex items-center gap-2 rounded-lg border border-border/50 p-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${pr.mergedAt ? "bg-purple-500" : "bg-green-500"}`}
                      ></div>
                      <p className="min-w-0 flex-1 truncate text-xs group-hover:text-primary">
                        #{pr.number} {pr.title}
                      </p>
                    </div>
                  ))}
                  {metrics.topPullRequests.length > 10 && (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      +{metrics.topPullRequests.length - 10} more pull requests
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pull Requests</DialogTitle>
          </DialogHeader>
          <PullRequestsListModalContent
            pullRequests={metrics.topPullRequests}
          />
        </DialogContent>
      </Dialog>

      {/* Issues Card */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="flex cursor-pointer flex-col transition-colors hover:bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-500"
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                    <path d="M12 8v4"></path>
                    <path d="M12 16h.01"></path>
                  </svg>
                  Issues ({metrics.issues.new})
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs">
                    <CircleDot className="h-3 w-3 text-amber-500" />
                    <span className="font-medium">{metrics.issues.new}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="font-medium">{metrics.issues.closed}</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-2">
                  {metrics.topIssues.slice(0, 10).map((issue, index) => (
                    <div
                      key={issue.id}
                      className="group flex items-center gap-2 rounded-lg border border-border/50 p-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${issue.state === "open" ? "bg-green-500" : "bg-purple-500"}`}
                      ></div>
                      <p className="min-w-0 flex-1 truncate text-xs group-hover:text-primary">
                        #{issue.number} {issue.title}
                      </p>
                    </div>
                  ))}
                  {metrics.topIssues.length > 10 && (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      +{metrics.topIssues.length - 10} more issues
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issues</DialogTitle>
          </DialogHeader>
          <IssuesListModalContent issues={metrics.topIssues} />
        </DialogContent>
      </Dialog>
    </>
  );
}
