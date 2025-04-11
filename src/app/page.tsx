import { Leaderboard, LeaderboardFallback } from "@/components/leaderboard";
import { Suspense } from "react";
import { LeaderboardPeriod } from "@/types/user-profile";
import { getLeaderboard } from "@/app/leaderboard/queries";

interface LeaderboardTab {
  id: LeaderboardPeriod;
  title: string;
  users: Awaited<ReturnType<typeof getLeaderboard>>;
}

export default async function Home() {
  // Fetch leaderboard data for all time periods using the new DB-based query
  const [allTimeUsers, monthlyUsers, weeklyUsers] = await Promise.all([
    getLeaderboard("all"),
    getLeaderboard("monthly"),
    getLeaderboard("weekly"),
  ]);

  const tabs: LeaderboardTab[] = [
    { id: "all", title: "All Time", users: allTimeUsers },
    { id: "monthly", title: "Monthly", users: monthlyUsers },
    { id: "weekly", title: "Weekly", users: weeklyUsers },
  ];

  return (
    <main className="container mx-auto space-y-8 p-4">
      <Suspense fallback={<LeaderboardFallback />}>
        <Leaderboard tabs={tabs} />
      </Suspense>
    </main>
  );
}
