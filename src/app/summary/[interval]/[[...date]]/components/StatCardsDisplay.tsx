"use client";

import { StatCard } from "@/components/stat-card";
import { CounterWithIcon } from "@/components/counter-with-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IntervalMetrics } from "@/app/summary/[interval]/[[...date]]/queries";
import {
  Users,
  GitPullRequest,
  MessageCircleWarning,
  CircleDot,
  GitMerge,
  CheckCircle,
} from "lucide-react";
import { formatTimeframeTitle } from "@/lib/date-utils";
import React from "react";
import ContributorsListModalContent from "./ContributorsListModalContent";
import PullRequestsListModalContent from "./PullRequestsListModalContent";
import IssuesListModalContent from "./IssuesListModalContent";

interface StatCardsDisplayProps {
  metrics: IntervalMetrics;
}

interface Contributor {
  username: string;
  totalScore: number;
}

export function StatCardsDisplay({ metrics }: StatCardsDisplayProps) {
  const timeframeTitle = formatTimeframeTitle(
    metrics.interval.intervalStart,
    metrics.interval.intervalType,
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard
        title="Contributors"
        icon={Users}
        modalTitle="Contributors"
        modalDescription={timeframeTitle}
        modalContent={
          <ContributorsListModalContent
            contributors={metrics.topContributors}
          />
        }
      >
        <div className="flex w-full items-center justify-between">
          <div className="text-3xl font-bold">{metrics.activeContributors}</div>
          <div className="flex -space-x-2">
            {metrics.topContributors
              .slice(0, 3)
              .map((contributor: Contributor) => (
                <Avatar
                  key={contributor.username}
                  className="h-8 w-8 border-2 border-background"
                >
                  <AvatarImage
                    src={`https://github.com/${contributor.username}.png`}
                    alt={contributor.username}
                  />
                  <AvatarFallback>
                    {contributor.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            {metrics.topContributors.length > 3 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                +{metrics.topContributors.length - 3}
              </div>
            )}
          </div>
        </div>
      </StatCard>
      <StatCard
        title="Pull Requests"
        icon={GitPullRequest}
        bgColor="bg-blue-500/10 group-hover:bg-blue-500/20"
        modalTitle="Pull Requests"
        modalDescription={timeframeTitle}
        modalContent={
          <PullRequestsListModalContent
            pullRequests={metrics.topPullRequests}
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{metrics.pullRequests.total}</div>
          <div className="flex flex-col space-y-1">
            <CounterWithIcon
              icon={CircleDot}
              label="New"
              value={metrics.pullRequests.new}
              iconClassName="text-green-500"
            />
            <CounterWithIcon
              icon={GitMerge}
              label="Merged"
              value={metrics.pullRequests.merged}
              iconClassName="text-purple-500"
            />
          </div>
        </div>
      </StatCard>
      <StatCard
        title="Issues"
        icon={MessageCircleWarning}
        bgColor="bg-amber-500/10 group-hover:bg-amber-500/20"
        modalTitle="Issues"
        modalDescription={timeframeTitle}
        modalContent={<IssuesListModalContent issues={metrics.topIssues} />}
      >
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{metrics.issues.total}</div>
          <div className="flex flex-col space-y-1">
            <CounterWithIcon
              icon={CircleDot}
              label="New"
              value={metrics.issues.new}
              iconClassName="text-amber-500"
            />
            <CounterWithIcon
              icon={CheckCircle}
              label="Closed"
              value={metrics.issues.closed}
              iconClassName="text-green-500"
            />
          </div>
        </div>
      </StatCard>
    </div>
  );
}
