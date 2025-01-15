import { Suspense } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { getUsers } from "@/lib/get-users";
import { getDailySummary } from "@/lib/get-daily-summary";

export default async function Home() {
  const [users, summaryData] = await Promise.all([
    getUsers(),
    getDailySummary(),
  ]);

  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const dateMatch = summaryData.title.match(/\(([^)]+)\)/);
  const date = dateMatch ? dateMatch[1] : "";

  return (
    <main className="container mx-auto p-4 space-y-8">
      <Suspense fallback={<div>Loading leaderboard...</div>}>
        <Leaderboard users={users} period="all" />
      </Suspense>
    </main>
  );
}