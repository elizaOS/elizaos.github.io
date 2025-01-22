import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, userDailySummaries, userStats } from "./schema";

export async function getAllDailySummaryDates(): Promise<string[]> {
  const results = await db
    .select({
      date: userDailySummaries.date,
    })
    .from(userDailySummaries)
    .groupBy(userDailySummaries.date)
    .orderBy(desc(userDailySummaries.date));

  return results
    .map((r) => r.date)
    .filter((date): date is string => date !== null);
}

export async function getContributorProfile(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return user;
}

export async function getContributorRecentPRs(username: string, limit = 5) {
  const [summary] = await db
    .select({
      pullRequests: userDailySummaries.pullRequests,
    })
    .from(userDailySummaries)
    .where(eq(userDailySummaries.username, username))
    .orderBy(desc(userDailySummaries.date))
    .limit(1);

  if (!summary) return [];

  const prs = JSON.parse(summary.pullRequests);
  return prs.slice(0, limit);
}

export async function getContributorRecentCommits(
  username: string,
  limit = 10
) {
  const [summary] = await db
    .select({
      commits: userDailySummaries.commits,
    })
    .from(userDailySummaries)
    .where(eq(userDailySummaries.username, username))
    .orderBy(desc(userDailySummaries.date))
    .limit(1);

  if (!summary) return [];

  const commits = JSON.parse(summary.commits);
  return commits.slice(0, limit);
}

export async function getContributorStats(username: string) {
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.username, username))
    .limit(1);

  return stats;
}

export async function getTopContributors(limit = 10) {
  // Get latest summary for each user using a correlated subquery
  const latestSummaries = await db
    .select({
      username: userDailySummaries.username,
      avatarUrl: users.avatarUrl,
      score: userDailySummaries.score,
      summary: userDailySummaries.summary,
    })
    .from(userDailySummaries)
    .innerJoin(users, eq(users.username, userDailySummaries.username))
    .where(
      sql`${userDailySummaries.date} = (
      SELECT MAX(date) 
      FROM ${userDailySummaries} AS u2 
      WHERE u2.username = ${userDailySummaries.username}
    )`
    )
    .orderBy(desc(userDailySummaries.score))
    .limit(limit);

  return latestSummaries;
}

export async function getContributorDailySummaries(
  username: string,
  limit?: number
) {
  const query = db
    .select()
    .from(userDailySummaries)
    .where(eq(userDailySummaries.username, username))
    .orderBy(desc(userDailySummaries.date));

  if (limit) {
    query.limit(limit);
  }

  return query;
}
