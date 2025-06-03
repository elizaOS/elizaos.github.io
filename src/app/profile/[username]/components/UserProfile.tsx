"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TagData, SkillCard } from "@/components/skill-card";
import { Github } from "lucide-react";
import { formatCompactNumber } from "@/lib/format-number";
import { DailyActivity } from "@/components/daily-activity";
import { UserActivityHeatmap } from "@/lib/scoring/queries";
import { SummaryCard, Summary } from "@/components/summary-card";
import EthereumIcon from "@/components/icons/EthereumIcon";
import SolanaIcon from "@/components/icons/SolanaIcon";
import { WalletAddressBadge } from "@/components/ui/WalletAddressBadge";
import { getUserWalletData } from "@/lib/walletLinking/getUserWalletAddresses";
import { ProfileCopyButton } from "@/components/ui/ProfileCopyButton";
import { UserProfileData } from "@/app/profile/[username]/queries";

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
  ethAddress?: string;
  solAddress?: string;
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
}: UserProfileProps) {
  const [ethAddress, setEthAddress] = useState<string | undefined>(undefined);
  const [solAddress, setSolAddress] = useState<string | undefined>(undefined);

  const profileDataForButton: UserProfileData = {
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
    score: totalXp, // Mapping totalXp to score as per plan
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchWalletData = async () => {
      try {
        const walletData = await getUserWalletData(username);
        if (walletData && !isCancelled) {
          setEthAddress(
            walletData.wallets.find((wallet) => wallet.chain === "ethereum")
              ?.address,
          );
          setSolAddress(
            walletData.wallets.find((wallet) => wallet.chain === "solana")
              ?.address,
          );
        }
      } catch (error) {
        if (!isCancelled) {
          console.warn(
            `Failed to fetch GitHub wallet data for ${username}:`,
            error,
          );
        }
      }
    };

    fetchWalletData();

    return () => {
      isCancelled = true;
    };
  }, [username]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:p-4">
      <div className="items-star flex flex-row gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={`https://github.com/${username}.png`}
            alt={username}
          />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <div className="flex flex-col gap-2">
            <h1 className="max-w-full text-lg font-bold sm:text-2xl">
              {username}{" "}
              <span className="text-primary">(level-{totalLevel})</span>
            </h1>
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

              {ethAddress && (
                <WalletAddressBadge
                  address={ethAddress}
                  icon={
                    <EthereumIcon className="h-4 w-4 fill-muted-foreground" />
                  }
                  label="ETH"
                />
              )}
              {solAddress && (
                <WalletAddressBadge
                  address={solAddress}
                  icon={<SolanaIcon className="h-4 w-4" />}
                  label="SOL"
                />
              )}
              <ProfileCopyButton profileData={profileDataForButton} />
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
