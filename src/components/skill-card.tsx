import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { skillIcons } from "@/lib/skill-icons";
import { CircleSlash, Lock } from "lucide-react";

export interface TagData {
  tagName: string;
  score: number;
  level: number;
  progress: number;
  pointsToNext: number;
}

export interface BadgeData {
  badgeType: string;
  tier: string;
  earnedAt: string;
  icon: string;
  label: string;
  description: string;
  // Optional progress fields for locked badges
  isLocked?: boolean;
  progressValue?: number;
  progressTarget?: number;
  progressPercent?: number;
}

export const SkillCard = ({
  data,
  rank,
  mode = "skill",
  badgeData,
}: {
  data?: TagData;
  rank?: number;
  mode?: "skill" | "badge";
  badgeData?: BadgeData;
}) => {
  // Badge mode rendering
  if (mode === "badge" && badgeData) {
    const isLocked = badgeData.isLocked || false;

    const tierColors = {
      beginner:
        "border-l-amber-700 ring-1 ring-amber-600/20 hover:ring-amber-600/50",
      elite: "border-l-zinc-400 ring-1 ring-zinc-300/20 hover:ring-zinc-300/50",
      legend:
        "border-l-yellow-500 ring-1 ring-yellow-400/20 hover:ring-yellow-400/50",
    };

    // Locked badges get muted border styling
    const lockedColors =
      "border-l-muted-foreground/30 border-dashed ring-1 ring-muted/20 hover:ring-muted/40";
    const colorClass = isLocked
      ? lockedColors
      : tierColors[badgeData.tier as keyof typeof tierColors] || "";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              className={`group relative cursor-pointer overflow-hidden border-l-4 transition-all hover:bg-muted/30 ${colorClass} ${isLocked ? "opacity-60" : ""}`}
            >
              <CardContent className="flex items-center gap-2 p-2">
                <span className="relative h-5 w-5 shrink-0 text-primary/80">
                  {badgeData.icon}
                  {isLocked && (
                    <Lock className="absolute -right-1 -top-1 h-3 w-3 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-medium capitalize">
                      {badgeData.label}
                    </p>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {badgeData.tier}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="w-64">
            {isLocked ? (
              // Locked badge tooltip with progress
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">{badgeData.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {badgeData.description}
                  </p>
                </div>
                {badgeData.progressValue !== undefined &&
                  badgeData.progressTarget !== undefined && (
                    <>
                      <Progress
                        value={badgeData.progressPercent || 0}
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">
                          {Math.floor(badgeData.progressValue)} /{" "}
                          {badgeData.progressTarget}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.max(
                            0,
                            badgeData.progressTarget -
                              Math.floor(badgeData.progressValue),
                          )}{" "}
                          to go
                        </span>
                      </div>
                    </>
                  )}
              </div>
            ) : (
              // Earned badge tooltip
              <div className="space-y-2">
                <div>
                  <p className="font-semibold">{badgeData.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {badgeData.description}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Earned on{" "}
                  {new Date(badgeData.earnedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Original skill mode rendering
  if (!data) return null;
  const name = data.tagName.toLowerCase();
  const Icon = skillIcons[name as keyof typeof skillIcons] || CircleSlash;

  const getRankStyles = () => {
    if (!rank) return "";
    const styles = {
      1: "border-l-yellow-500 ring-1 ring-yellow-400/20 hover:ring-yellow-400/50",
      2: "border-l-zinc-400 ring-1 ring-zinc-300/20 hover:ring-zinc-300/50",
      3: "border-l-amber-700 ring-1 ring-amber-600/20 hover:ring-amber-600/50",
    };
    return styles[rank as keyof typeof styles] || "";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`group relative cursor-pointer overflow-hidden border-l-4 transition-all hover:bg-muted/30 ${getRankStyles()}`}
          >
            <CardContent className="flex items-center gap-2 p-2">
              <Icon className="h-5 w-5 shrink-0 text-primary/80" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-medium capitalize">
                    {name}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">LVL</span>
                    <span className="font-mono font-bold tabular-nums">
                      {data.level}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="w-64">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-semibold capitalize">{name}</p>
                <p className="text-sm">Level {data.level}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${data.progress * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current XP</span>
                <span className="font-medium">
                  {data.score.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Level</span>
                <span className="font-medium">
                  {data.pointsToNext.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
