import { IntervalType } from "@/lib/date-utils";
import { db } from "@/lib/data/db";
import {
  userSummaries,
  repoSummaries,
  overallSummaries,
} from "@/lib/data/schema";
import { UTCDate } from "@date-fns/utc";

/**
 * Store daily summary in the database
 */
export async function storeDailySummary(
  username: string,
  date: string,
  summary: string,
  intervalType: IntervalType,
): Promise<void> {
  const id = `${username}_${intervalType}_${date}`;

  await db
    .insert(userSummaries)
    .values({
      id,
      username,
      date,
      summary,
      intervalType,
      lastUpdated: new UTCDate().toISOString(),
    })
    .onConflictDoUpdate({
      target: userSummaries.id,
      set: {
        summary,
        lastUpdated: new UTCDate().toISOString(),
      },
    });
}

/**
 * Store repository summary in the database
 */
export async function storeRepoSummary(
  repoId: string,
  date: string,
  summary: string,
  intervalType: IntervalType,
): Promise<void> {
  const id = `${repoId}_${intervalType}_${date}`;

  await db
    .insert(repoSummaries)
    .values({
      id,
      repoId,
      date,
      summary,
      intervalType,
      lastUpdated: new UTCDate().toISOString(),
    })
    .onConflictDoUpdate({
      target: repoSummaries.id,
      set: {
        summary,
        lastUpdated: new UTCDate().toISOString(),
      },
    });
}

/**
 * Store overall summary in the database
 */
export async function storeOverallSummary(
  date: string,
  summary: string,
  intervalType: IntervalType,
): Promise<void> {
  const id = `${intervalType}_${date}`;

  await db
    .insert(overallSummaries)
    .values({
      id,
      date,
      summary,
      intervalType,
      lastUpdated: new UTCDate().toISOString(),
    })
    .onConflictDoUpdate({
      target: overallSummaries.id,
      set: {
        summary,
        lastUpdated: new UTCDate().toISOString(),
      },
    });
} // --- Helper functions ---
