import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { db } from "./db";
import {
  users,
  userDailySummaries,
  userStats,
  tags,
  userTagScores,
} from "./schema";
import { extractDateFromFilename } from "@/lib/date-utils";
import { ContributorDataSchema, AnalysisDataSchema } from "@/lib/data/types";
import { calculateScore } from "@/lib/data/scoring";
import { z } from "zod";

export async function ingestHistoricalData() {
  console.log("Starting data ingestion...");
  const historyDir = path.join(process.cwd(), "data/daily/history");

  // Process contributors files
  const contributorFiles = await glob("contributors_*.json", {
    cwd: historyDir,
  });
  console.log(`Found ${contributorFiles.length} contributor files to process`);

  let processedFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;

  for (const file of contributorFiles) {
    const date = extractDateFromFilename(file);
    if (!date) {
      console.warn(`Skipping ${file}: Could not extract date from filename`);
      skippedFiles++;
      continue;
    }

    try {
      const content = await fs.readFile(path.join(historyDir, file), "utf-8");
      const rawData = JSON.parse(content);
      const contributors = z.array(ContributorDataSchema).parse(rawData);

      console.log(
        `Processing ${file} with ${contributors.length} contributors...`
      );

      for (const contributor of contributors) {
        try {
          const score = calculateScore(contributor);
          const now = new Date().toISOString();

          // Upsert user
          await db
            .insert(users)
            .values({
              username: contributor.contributor,
              avatarUrl: contributor.avatar_url ?? "",
              score,
              lastUpdated: now,
            })
            .onConflictDoUpdate({
              target: users.username,
              set: {
                avatarUrl: contributor.avatar_url ?? "",
                score,
                lastUpdated: now,
              },
            });

          // Insert daily summary
          const totalAdditions =
            contributor.activity.code.commits?.reduce(
              (sum, commit) => sum + commit.additions,
              0
            ) ?? 0;
          const totalDeletions =
            contributor.activity.code.commits?.reduce(
              (sum, commit) => sum + commit.deletions,
              0
            ) ?? 0;
          const totalChangedFiles =
            contributor.activity.code.commits?.reduce(
              (sum, commit) => sum + commit.changed_files,
              0
            ) ?? 0;

          await db
            .insert(userDailySummaries)
            .values({
              id: `${contributor.contributor}_${date}`,
              username: contributor.contributor,
              date,
              score,
              summary: contributor.summary,
              totalCommits: contributor.activity.code.total_commits,
              totalPRs: contributor.activity.code.total_prs,
              additions: totalAdditions,
              deletions: totalDeletions,
              changedFiles: totalChangedFiles,
              commits: JSON.stringify(contributor.activity.code.commits ?? []),
              pullRequests: JSON.stringify(
                contributor.activity.code.pull_requests ?? []
              ),
              issues: JSON.stringify(contributor.activity.issues?.opened ?? []),
            })
            .onConflictDoUpdate({
              target: userDailySummaries.id,
              set: {
                score,
                summary: contributor.summary,
                totalCommits: contributor.activity.code.total_commits,
                totalPRs: contributor.activity.code.total_prs,
                additions: totalAdditions,
                deletions: totalDeletions,
                changedFiles: totalChangedFiles,
                commits: JSON.stringify(
                  contributor.activity.code.commits ?? []
                ),
                pullRequests: JSON.stringify(
                  contributor.activity.code.pull_requests ?? []
                ),
                issues: JSON.stringify(
                  contributor.activity.issues?.opened ?? []
                ),
              },
            });
        } catch (contributorError) {
          console.error(
            `Error processing contributor ${contributor.contributor} in ${file}:`,
            contributorError
          );
          continue;
        }
      }
      processedFiles++;
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
      errorFiles++;
    }
  }

  console.log(
    `\nContributor files summary:\n` +
      `- Processed: ${processedFiles}\n` +
      `- Skipped: ${skippedFiles}\n` +
      `- Errors: ${errorFiles}\n` +
      `- Total: ${contributorFiles.length}`
  );

  // Process analysis data
  try {
    console.log("\nProcessing analysis data...");
    const analysisContent = await fs.readFile(
      path.join(process.cwd(), "data/analysis.json"),
      "utf-8"
    );
    const rawAnalysis = JSON.parse(analysisContent);
    const analysis = z
      .object({
        contributors: z.array(AnalysisDataSchema),
      })
      .parse(rawAnalysis);

    // First, collect all unique tags and insert them
    const uniqueTags = new Set<string>();
    for (const contributor of analysis.contributors) {
      contributor.tags.forEach((tag) => uniqueTags.add(tag));
    }

    console.log(`Inserting ${uniqueTags.size} unique tags...`);
    const now = new Date().toISOString();

    // Insert all tags
    for (const tagName of uniqueTags) {
      await db
        .insert(tags)
        .values({
          name: tagName,
          description: "",
          createdAt: now,
          lastUpdated: now,
        })
        .onConflictDoUpdate({
          target: tags.name,
          set: {
            lastUpdated: now,
          },
        });
    }

    for (const contributor of analysis.contributors) {
      // Insert user stats
      await db
        .insert(userStats)
        .values({
          username: contributor.username,
          totalPRs: contributor.stats.total_prs,
          mergedPRs: contributor.stats.merged_prs,
          closedPRs: contributor.stats.closed_prs,
          totalFiles: contributor.stats.total_files,
          totalAdditions: contributor.stats.total_additions,
          totalDeletions: contributor.stats.total_deletions,
          filesByType: JSON.stringify(contributor.stats.files_by_type),
          prsByMonth: JSON.stringify(contributor.stats.prs_by_month),
          focusAreas: JSON.stringify(contributor.focus_areas),
          lastUpdated: now,
        })
        .onConflictDoUpdate({
          target: userStats.username,
          set: {
            totalPRs: contributor.stats.total_prs,
            mergedPRs: contributor.stats.merged_prs,
            closedPRs: contributor.stats.closed_prs,
            totalFiles: contributor.stats.total_files,
            totalAdditions: contributor.stats.total_additions,
            totalDeletions: contributor.stats.total_deletions,
            filesByType: JSON.stringify(contributor.stats.files_by_type),
            prsByMonth: JSON.stringify(contributor.stats.prs_by_month),
            focusAreas: JSON.stringify(contributor.focus_areas),
            lastUpdated: now,
          },
        });

      // Insert user tag scores
      for (const tag of contributor.tags) {
        const score = contributor.tag_scores[tag] || 0;
        const level = contributor.tag_levels[tag];
        if (!level) continue;

        await db
          .insert(userTagScores)
          .values({
            id: `${contributor.username}_${tag}`,
            username: contributor.username,
            tag,
            score,
            level: level.level,
            progress: level.progress,
            pointsToNext: level.points_next_level,
            lastUpdated: now,
          })
          .onConflictDoUpdate({
            target: userTagScores.id,
            set: {
              score,
              level: level.level,
              progress: level.progress,
              pointsToNext: level.points_next_level,
              lastUpdated: now,
            },
          });
      }
    }
  } catch (error) {
    console.error("Error processing analysis data:", error);
    throw new Error("Failed to process analysis data. Ingestion incomplete.");
  }

  if (errorFiles > 0) {
    console.warn(`\nCompleted with ${errorFiles} file(s) containing errors`);
  } else {
    console.log("\nData ingestion completed successfully!");
  }
}
