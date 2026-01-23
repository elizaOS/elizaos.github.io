"use client";

import type { Repository } from "../queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export function RepositoryCard({ repository }: { repository: Repository }) {
  const lastUpdated = new Date(repository.lastUpdated);
  const timeAgo = formatDistanceToNow(lastUpdated, { addSuffix: true });

  // Check if repo has recent activity (updated within last 30 days)
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
  );
  const hasRecentActivity = daysSinceUpdate <= 30;

  // Color scheme based on activity level
  const colors = hasRecentActivity
    ? {
        // Warm colors for active repos (current default)
        card: "border-border/40 bg-background",
        title: "text-primary",
        star: "text-muted-foreground",
        description: "text-muted-foreground",
        issueIcon: "text-amber-600",
        openPrIcon: "text-green-600",
        mergedPrIcon: "text-purple-600",
        contributors: "text-muted-foreground",
        calendar: "text-muted-foreground",
      }
    : {
        // Cool colors for inactive repos
        card: "border-border/30 bg-muted/20",
        title: "text-foreground/80",
        star: "text-blue-400",
        description: "text-muted-foreground/80",
        issueIcon: "text-cyan-600",
        openPrIcon: "text-blue-500",
        mergedPrIcon: "text-slate-500",
        contributors: "text-muted-foreground/80",
        calendar: "text-muted-foreground/70",
      };

  return (
    <Card
      className={`h-full border transition-colors hover:border-border/80 ${colors.card}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`https://github.com/${repository.owner}/${repository.name}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CardTitle
                  className={`text-lg font-semibold hover:underline ${colors.title}`}
                >
                  {repository.owner}/{repository.name}
                </CardTitle>
              </Link>
              <div className={`flex items-center gap-1 text-sm ${colors.star}`}>
                <Star className="h-4 w-4" />
                <span>{formatCompactNumber(repository.stars)}</span>
              </div>
            </div>
            {repository.description && (
              <p className={`mt-1 line-clamp-2 text-sm ${colors.description}`}>
                {repository.description}
              </p>
            )}
          </div>

          {/* Activity Chart - GitHub pulse style */}
          <div className="ml-4">
            <div className="h-[64px] w-[155px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart
                  data={repository.weeklyCommitCounts}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
                          const firstPayload = payload?.[0]?.payload;
                          if (firstPayload) {
                            const [year, week] = firstPayload.week.split("-");
                            const date = parseISO(
                              `${year}-W${week.padStart(2, "0")}`,
                            );
                            return `Week of ${date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}`;
                          }
                          return value;
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="commitCount"
                    stroke="var(--color-commitCount)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "var(--color-commitCount)" }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span>{repository.openIssues}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitPullRequest className="h-4 w-4 text-green-600" />
            <span>{repository.openPullRequests}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitMerge className="h-4 w-4 text-purple-600" />
            <span>{repository.mergedPullRequests}</span>
          </div>
        </div>

        {/* Contributors Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {repository.totalContributors} contributors
            </span>
            {repository.topContributors.length > 0 && (
              <div className="ml-2 flex -space-x-1">
                {repository.topContributors.slice(0, 3).map((contributor) => (
                  <Avatar
                    key={contributor.username}
                    className="h-5 w-5 border border-background"
                  >
                    <AvatarImage
                      src={contributor.avatarUrl ?? undefined}
                      alt={contributor.username}
                    />
                    <AvatarFallback className="text-xs">
                      {contributor.username.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Updated {timeAgo}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
