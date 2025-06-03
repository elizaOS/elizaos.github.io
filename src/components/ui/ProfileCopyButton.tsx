import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserProfileData } from "@/app/profile/[username]/queries";
import { formatProfileDataForCopy, FormatProfileOptions } from "@/lib/profile-formatter";

interface ProfileCopyButtonProps {
  profileData: UserProfileData;
}

export function ProfileCopyButton({ profileData }: ProfileCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [includeBasicInfo, setIncludeBasicInfo] = useState(true);
  const [includeMonthlySummaries, setIncludeMonthlySummaries] = useState(true);
  const [includeWeeklySummaries, setIncludeWeeklySummaries] = useState(true);
  const [includeContributionStats, setIncludeContributionStats] = useState(true);
  const [includeRoles, setIncludeRoles] = useState(true);
  const [includeFocusAreas, setIncludeFocusAreas] = useState(true);
  const [includeSkills, setIncludeSkills] = useState(true);
  const [includeDailyActivitySummary, setIncludeDailyActivitySummary] = useState(true);

  const handleCopy = async () => {
    const options: FormatProfileOptions = {
      includeBasicInfo,
      includeMonthlySummaries,
      includeWeeklySummaries,
      includeContributionStats,
      includeRoles,
      includeFocusAreas,
      includeSkills,
      includeDailyActivitySummary,
    };

    try {
      const formattedData = formatProfileDataForCopy(profileData, options);
      await navigator.clipboard.writeText(formattedData);
      setCopied(true);
      toast.success("Profile data copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy profile data:", error);
      toast.error("Failed to copy profile data. Check console for details.");
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="px-3"
        onClick={handleCopy}
      >
        <span className="sr-only">Copy</span>
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="px-2">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="grid gap-4 p-2">
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeBasicInfo"
                checked={includeBasicInfo}
                onCheckedChange={(checked) => setIncludeBasicInfo(!!checked)}
              />
              <Label htmlFor="includeBasicInfo">Basic Info</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeMonthlySummaries"
                checked={includeMonthlySummaries}
                onCheckedChange={(checked) => setIncludeMonthlySummaries(!!checked)}
              />
              <Label htmlFor="includeMonthlySummaries">Monthly Summaries</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeWeeklySummaries"
                checked={includeWeeklySummaries}
                onCheckedChange={(checked) => setIncludeWeeklySummaries(!!checked)}
              />
              <Label htmlFor="includeWeeklySummaries">Weekly Summaries</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeContributionStats"
                checked={includeContributionStats}
                onCheckedChange={(checked) => setIncludeContributionStats(!!checked)}
              />
              <Label htmlFor="includeContributionStats">Contribution Stats</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeRoles"
                checked={includeRoles}
                onCheckedChange={(checked) => setIncludeRoles(!!checked)}
              />
              <Label htmlFor="includeRoles">Roles</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeFocusAreas"
                checked={includeFocusAreas}
                onCheckedChange={(checked) => setIncludeFocusAreas(!!checked)}
              />
              <Label htmlFor="includeFocusAreas">Focus Areas</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeSkills"
                checked={includeSkills}
                onCheckedChange={(checked) => setIncludeSkills(!!checked)}
              />
              <Label htmlFor="includeSkills">Skills</Label>
            </div>
            <div className="flex items-center space-x-4">
              <Checkbox
                id="includeDailyActivitySummary"
                checked={includeDailyActivitySummary}
                onCheckedChange={(checked) => setIncludeDailyActivitySummary(!!checked)}
              />
              <Label htmlFor="includeDailyActivitySummary">Daily Activity Summary</Label>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
