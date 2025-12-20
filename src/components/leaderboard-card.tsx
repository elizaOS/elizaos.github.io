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
      <div className="h-[72px] transition-colors hover:bg-accent/50">
        <div className="grid h-full grid-cols-[3rem_2fr_1fr_1fr] items-center px-4">
          {/* Rank */}
          <span className="text-lg font-semibold text-muted-foreground">
            {rank}
          </span>

          {/* Avatar + Username */}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
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
          <div className="text-center text-lg font-bold">{user.totalLevel}</div>

          {/* XP */}
          <div className="text-right text-lg font-bold tabular-nums">
            {user.totalXp.toLocaleString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
