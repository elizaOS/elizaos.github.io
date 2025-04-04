import { getContributorPRs } from "../../queries";
import { createStep, RepoPipelineContext } from "../types";
import { db } from "../../db";
import { tags, userTagScores } from "../../schema";
import { ContributorPipelineContext } from "./context";

// --- Tag processors ---
/**
 * Calculate expertise areas for a contributor
 */

export const calculateTags = createStep(
  "calculateTags",
  async (
    username: string,
    { config, dateRange, logger, repoId }: ContributorPipelineContext
  ) => {
    // Fetch data
    const contributorPRs = await getContributorPRs(username, {
      repository: repoId,
      dateRange,
    });

    // Skip if no PRs found
    if (contributorPRs.length === 0) {
      logger?.info(`${username}: No PRs found, skipping tag calculation`);
      return null;
    }

    // Extract file paths and titles
    const filePaths = contributorPRs.flatMap((pr) =>
      pr.files ? pr.files.map((f) => f.path as string) : []
    );
    const prTitles = contributorPRs.map((pr) => pr.title || "").filter(Boolean);
    logger?.info(
      `${username}: Processing ${filePaths.length} files and ${prTitles.length} PR titles`
    );

    // Calculate tags based on config
    const allTags = [
      ...config.tags.area,
      ...config.tags.role,
      ...config.tags.tech,
    ];
    const tagScores: Record<string, { score: number; category: string }> = {};

    // Apply tag rules to file paths and PR titles
    for (const rule of allTags) {
      let score = 0;

      // Check file paths for matches
      if (rule.category === "AREA" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const filePath of filePaths) {
            if (filePath.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      // Check PR titles for matches
      if (rule.category === "ROLE" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const title of prTitles) {
            if (title.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      if (score > 0) {
        logger?.trace(`Tag ${rule.name} scored ${score} points`);
        tagScores[rule.name] = {
          score,
          category: rule.category,
        };
      }
    }

    // Calculate levels and progress for each tag
    const expertiseAreas = Object.entries(tagScores)
      .map(([tag, { score, category }]) => {
        const level = Math.floor(Math.log(score + 1) / Math.log(2));
        const nextLevelThreshold = Math.pow(2, level + 1) - 1;
        const currentLevelThreshold = Math.pow(2, level) - 1;
        const progress =
          (score - currentLevelThreshold) /
          (nextLevelThreshold - currentLevelThreshold);

        // Store in database
        storeTagScore(
          username,
          tag,
          category,
          score,
          level,
          Math.min(1, progress)
        );

        return {
          tag,
          category,
          score,
          level,
          progress: Math.min(1, progress),
        };
      })
      .sort((a, b) => b.score - a.score);
    // Log summary of expertise areas
    const topAreas = expertiseAreas
      .slice(0, 3)
      .map((area) => `${area.tag} (${area.score})`)
      .join(", ");

    logger?.info(`${username} has ${expertiseAreas.length} expertise areas.`, {
      topAreas,
    });

    const stats = {
      tagCount: expertiseAreas.length,
      numPrsProcessed: prTitles.length,
      topAreas,
    };
    return stats;
  }
);

/**
 * Store tag score in the database
 */
export async function storeTagScore(
  username: string,
  tag: string,
  category: string,
  score: number,
  level: number,
  progress: number
): Promise<void> {
  // Ensure tag exists in database
  await db
    .insert(tags)
    .values({
      name: tag,
      category,
      description: "",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: tags.name,
      set: {
        lastUpdated: new Date().toISOString(),
      },
    });

  // Store user tag score
  await db
    .insert(userTagScores)
    .values({
      id: `${username}_${tag}`,
      username,
      tag,
      score,
      level,
      progress,
      pointsToNext: Math.pow(2, level + 1) - 1,
      lastUpdated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: userTagScores.id,
      set: {
        score,
        level,
        progress,
        pointsToNext: Math.pow(2, level + 1) - 1,
        lastUpdated: new Date().toISOString(),
      },
    });
}
