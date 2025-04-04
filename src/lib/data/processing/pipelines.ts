/**
 * Predefined pipelines for common data processing flows
 */
import {
  pipe,
  mapStep,
  createStep,
  RepoPipelineContext,
  parallel,
} from "./types";
import { processContributorTags } from "./contributors";
import {
  generateDailyRepoSummaries,
  generateWeeklyRepoSummaries,
} from "./export/generateSummary";
import { db } from "../db";
import { repositories } from "../schema";
import { eq } from "drizzle-orm";
/**
 * Common pipeline step to fetch and filter repositories based on context
 */
export const getSelectedRepositories = createStep(
  "getSelectedRepositories",
  async (_, { repoId, logger, config }: RepoPipelineContext) => {
    // Fetch all repositories
    const repos = await db
      .select({ repoId: repositories.repoId })
      .from(repositories)
      .where(repoId ? eq(repositories.repoId, repoId) : undefined);
    logger?.info(`Found ${repos.length} repositories in DB`, {
      repos: repos.map((r) => r.repoId),
    });

    // Filter repositories
    const configRepos = config.repositories.map((r) => r.repoId);
    logger?.info(`Found ${configRepos.length} configured repositories`, {
      configRepos,
    });
    const selectedRepos = repos.filter(
      (repo) => configRepos.indexOf(repo.repoId) >= 0
    );
    logger?.info(`Filtering for configured repositories`, { selectedRepos });

    return selectedRepos;
  }
);

export const contributorTagsPipeline = pipe(
  getSelectedRepositories,
  mapStep(processContributorTags)
);

export const generateRepositorySummaries = pipe(
  getSelectedRepositories,
  mapStep(parallel(generateDailyRepoSummaries, generateWeeklyRepoSummaries))
);
