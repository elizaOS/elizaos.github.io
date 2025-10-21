"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TagData, SkillCard, BadgeData } from "@/components/skill-card";
import { BadgeCheck, Github, Trophy } from "lucide-react";
import { formatCompactNumber } from "@/lib/format-number";
import { DailyActivity } from "@/components/daily-activity";
import { UserActivityHeatmap } from "@/lib/scoring/queries";
import { SummaryCard, Summary } from "@/components/summary-card";
import { WalletAddressBadge } from "@/components/ui/WalletAddressBadge";
import { UserBadge, getTierDefinition } from "@/lib/badges/types";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LinkedWallet } from "@/lib/walletLinking/readmeUtils";
import { SUPPORTED_CHAINS } from "@/lib/walletLinking/chainUtils";

export interface UserStats {
  totalPrs: number;
  mergedPrs: number;
  closedPrs: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

type UserProfileProps = {
  username: string;
  monthlySummaries: Summary[];
  weeklySummaries: Summary[];
  roleTags: TagData[];
  skillTags: TagData[];
  focusAreaTags: TagData[];
  totalXp: number;
  totalLevel: number;
  stats: UserStats;
  dailyActivity: UserActivityHeatmap[];
  linkedWallets: LinkedWallet[];
  userBadges: UserBadge[];
};

export default function UserProfile({
  username,
  monthlySummaries,
  weeklySummaries,
  roleTags,
  skillTags,
  focusAreaTags,
  totalXp,
  totalLevel,
  stats,
  dailyActivity,
  linkedWallets,
  userBadges,
}: UserProfileProps) {
  // Transform user badges into BadgeData format for display
  const badgeDataList: BadgeData[] = userBadges.map((badge) => {
    const tierDef = getTierDefinition(badge.badgeType, badge.tier);
    return {
      badgeType: badge.badgeType,
      tier: badge.tier,
      earnedAt: badge.earnedAt,
      icon: tierDef?.icon || "🏅",
      label: tierDef?.label || badge.badgeType,
      description: tierDef?.description || "",
    };
  });
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:p-4">
      <div className="items-star flex flex-col gap-4 sm:flex-row">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={`https://github.com/${username}.png`}
            alt={username}
          />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-1">
              <h1 className="max-w-full text-lg font-bold sm:text-2xl">
                {username}
              </h1>
              <span className="font-bold text-primary">
                (level-{totalLevel})
              </span>

              {linkedWallets.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BadgeCheck className="ml-1 inline-flex h-5 w-5 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Wallet linked</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center">
                <span className="font-mono text-sm font-medium">
                  {Math.round(totalXp).toLocaleString()} XP
                </span>
              </div>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">View GitHub Profile</span>
              </a>

              {linkedWallets.map((wallet, index) => {
                const IconComponent = SUPPORTED_CHAINS[wallet.chain]?.icon;
                return (
                  <WalletAddressBadge
                    key={index}
                    address={wallet.address}
                    icon={
                      IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : null
                    }
                    label={wallet.chain}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {monthlySummaries.length > 0 && (
          <SummaryCard
            summaries={monthlySummaries}
            intervalType="month"
            className="md:col-span-2"
          />
        )}

        {weeklySummaries.length > 0 && (
          <SummaryCard
            summaries={weeklySummaries}
            intervalType="week"
            className="md:col-span-2"
          />
        )}
        {/* Daily Activity Section */}
        {dailyActivity && dailyActivity.length > 0 && (
          <div className={`md:row-span-2`}>
            <DailyActivity data={dailyActivity} />
          </div>
        )}
        <Card className="overflow-hidden">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pull Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {stats.totalPrs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Total
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {stats.mergedPrs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Merged
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {stats.closedPrs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Closed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Code Contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div className="text-center">
                <div className="font-mono text-lg font-bold sm:text-2xl">
                  {stats.changedFiles}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Files
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-emerald-500 sm:text-2xl">
                  +{formatCompactNumber(stats.additions)}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Additions
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-red-500 sm:text-2xl">
                  -{formatCompactNumber(stats.deletions)}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Deletions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      {badgeDataList.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Achievements</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {badgeDataList.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {badgeDataList.map((badge) => (
              <SkillCard
                key={`${badge.badgeType}_${badge.tier}`}
                mode="badge"
                badgeData={badge}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <h3 className="mb-4 text-lg font-semibold">Roles</h3>
          <div className="flex flex-col gap-2">
            {roleTags.map((tag, index) => (
              <SkillCard
                key={tag.tagName}
                data={tag}
                rank={index < 3 ? index + 1 : undefined}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Focus Areas</h3>
          <div className="grid grid-cols-1 gap-2">
            {focusAreaTags.map((tag, index) => (
              <SkillCard
                key={tag.tagName}
                data={tag}
                rank={index < 3 ? index + 1 : undefined}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Skills</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
            {skillTags.map((tag, index) => (
              <SkillCard
                key={tag.tagName}
                data={tag}
                rank={index < 3 ? index + 1 : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
