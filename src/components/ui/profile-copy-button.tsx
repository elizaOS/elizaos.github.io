"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Check, ChevronDown } from "lucide-react";
import { formatProfileForLLM, type ProfileData } from "@/lib/profile-formatter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TagData } from "@/components/skill-card";
import type { Summary } from "@/components/summary-card";
import type { UserActivityHeatmap } from "@/lib/scoring/queries";
import type { UserBadge } from "@/lib/badges/types";
import type { UserStats } from "@/app/profile/[username]/components/UserProfile";

interface ProfileCopyButtonProps {
  username: string;
  stats: UserStats;
  monthlySummaries: Summary[];
  weeklySummaries: Summary[];
  roleTags: TagData[];
  skillTags: TagData[];
  focusAreaTags: TagData[];
  totalXp: number;
  totalLevel: number;
  dailyActivity: UserActivityHeatmap[];
  userBadges: UserBadge[];
  badgeProgress: Record<string, number>;
  className?: string;
}

export function ProfileCopyButton({
  username,
  stats,
  monthlySummaries,
  weeklySummaries,
  roleTags,
  skillTags,
  focusAreaTags,
  totalXp,
  totalLevel,
  dailyActivity,
  userBadges,
  badgeProgress,
  className,
}: ProfileCopyButtonProps) {
  const [includeStats, setIncludeStats] = useState(true);
  const [includeSummaries, setIncludeSummaries] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeBadges, setIncludeBadges] = useState(true);
  const [includeActivity, setIncludeActivity] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const profileData: ProfileData = {
        username,
        totalLevel,
        totalXp,
        stats,
        monthlySummaries,
        weeklySummaries,
        roleTags,
        skillTags,
        focusAreaTags,
        dailyActivity,
        userBadges,
        badgeProgress,
      };

      const formattedData = formatProfileForLLM(profileData, {
        includeStats,
        includeSummaries,
        includeTags,
        includeBadges,
        includeActivity,
      });

      await navigator.clipboard.writeText(formattedData);

      setCopied(true);
      toast.success("Profile copied to clipboard", {
        description:
          "The formatted profile data is ready to paste into an LLM.",
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Copy failed", {
        description: "There was an error copying the data to your clipboard.",
      });
    }
  };

  return (
    <div className={cn("flex", className)}>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 rounded-r-none border-r-0 px-2.5"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="text-xs">Copy</span>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-l-none px-1.5">
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="sr-only">Options</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <div className="grid gap-3 p-2">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="includeStats"
                checked={includeStats}
                onCheckedChange={(checked) => setIncludeStats(Boolean(checked))}
              />
              <Label htmlFor="includeStats" className="text-sm">
                Include Stats
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="includeSummaries"
                checked={includeSummaries}
                onCheckedChange={(checked) =>
                  setIncludeSummaries(Boolean(checked))
                }
              />
              <Label htmlFor="includeSummaries" className="text-sm">
                Include Summaries
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="includeTags"
                checked={includeTags}
                onCheckedChange={(checked) => setIncludeTags(Boolean(checked))}
              />
              <Label htmlFor="includeTags" className="text-sm">
                Include Tags
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="includeBadges"
                checked={includeBadges}
                onCheckedChange={(checked) =>
                  setIncludeBadges(Boolean(checked))
                }
              />
              <Label htmlFor="includeBadges" className="text-sm">
                Include Badges
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="includeActivity"
                checked={includeActivity}
                onCheckedChange={(checked) =>
                  setIncludeActivity(Boolean(checked))
                }
              />
              <Label htmlFor="includeActivity" className="text-sm">
                Include Activity
              </Label>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
