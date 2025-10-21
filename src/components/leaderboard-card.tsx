import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LeaderboardUser } from "./leaderboard";
import { StatBadge } from "./stat-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeCheck, Trophy } from "lucide-react";

export function LeaderboardCard({
  user,
  rank,
  // onSkillClick,
  showScore,
}: {
  user: LeaderboardUser;
  rank: number;
  onSkillClick: (skill: string) => void;
  showScore: boolean;
}) {
  // // Combine all tags for display
  // const allTags = [...user.roleTags, ...user.skillTags, ...user.focusAreaTags];

  // // Get top 3 skills across all categories
  // const topSkills = allTags.sort((a, b) => b.level - a.level).slice(0, 3);

  // const handleSkillClick = (skill: string, e: React.MouseEvent) => {
  //   e.preventDefault();
  //   onSkillClick(skill.toLowerCase());
  // };

  return (
    <Link href={`/profile/${user.username}`}>
      <div className="h-[72px] px-3 transition-colors hover:bg-accent/50 sm:px-5">
        <div className="flex h-full items-center">
          <span className="mr-4 hidden w-8 items-center text-xl font-semibold text-muted-foreground md:flex">
            {rank}
          </span>
          <div className="flex min-w-0 flex-1 items-center">
            <div className="mr-3 flex items-center">
              <span className="mr-3 text-sm font-medium text-muted-foreground md:hidden">
                {rank}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://github.com/${user.username}.png`}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate font-medium">
                {user.username}
                {user.linkedWallets.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 inline-block align-middle">
                          <BadgeCheck className="h-4 w-4 text-yellow-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Wallet linked</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </h3>
              <div className="flex gap-2">
                <StatBadge
                  labelEnd="XP"
                  value={user.totalXp.toLocaleString()}
                  className="px-2 text-xs"
                />
                <StatBadge
                  labelStart="LVL"
                  value={user.totalLevel}
                  className="px-2 text-xs"
                />
                {user.badgeCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-500">
                          <Trophy className="h-3 w-3" />
                          <span>{user.badgeCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {user.badgeCount} badge
                          {user.badgeCount !== 1 ? "s" : ""} earned
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            {/* <div className="hidden items-center gap-2 md:flex">
              {topSkills.map((tag) => (
                <Badge
                  key={tag.tagName}
                  variant="outline"
                  className="flex cursor-pointer items-center gap-1 whitespace-nowrap font-mono text-xs hover:border-primary"
                  onClick={(e) => handleSkillClick(tag.tagName, e)}
                >
                  <span>{tag.tagName}</span>
                  <span className="-my-0.5 -mr-2.5 rounded-r-[inherit] bg-secondary-foreground/10 px-1.5 py-0.5">
                  {tag.level}
                  </span>
                </Badge>
              ))}
            </div> */}
            {showScore ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 font-mono"
                >
                  <span className="text-primary/80">
                    {user.points.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">Points</span>
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
