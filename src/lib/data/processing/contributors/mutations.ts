import { db } from "../../db";
import { userDailySummaries } from "../../schema";

/**
 * Store daily summary in the database
 */
export async function storeDailySummary(
  username: string,
  date: string,
  summary: string
): Promise<void> {
  const id = `${username}_${date}`;

  await db
    .insert(userDailySummaries)
    .values({
      id,
      username,
      date,
      summary,
      lastUpdated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: userDailySummaries.id,
      set: {
        summary,
        lastUpdated: new Date().toISOString(),
      },
    });
} // --- Helper functions ---
