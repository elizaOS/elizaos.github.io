import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardUser } from "./leaderboard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeCheck } from "lucide-react";

export function LeaderboardCard({
  user,
  rank,
}: {
  user: LeaderboardUser;
  rank: number;
  onSkillClick: (skill: string) => void;
  showScore: boolean;
}) {
  return (
    <Link href={`/profile/${user.username}`}>
      <div className="h-[72px] px-3 transition-colors hover:bg-accent/50 sm:px-5">
        <div className="grid h-full grid-cols-[auto_1fr_80px_100px] items-center gap-4 md:grid-cols-[40px_1fr_100px_120px]">
          {/* Rank */}
          <span className="text-center text-sm font-semibold text-muted-foreground md:text-xl">
            {rank}
          </span>

          {/* Avatar + Username */}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={`https://github.com/${user.username}.png`}
                alt={user.username}
              />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">
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
            </span>
          </div>

          {/* Level */}
          <div className="text-right">
            <div className="text-lg font-bold">{user.totalLevel}</div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>

          {/* XP */}
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">
              {user.totalXp.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">XP</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
