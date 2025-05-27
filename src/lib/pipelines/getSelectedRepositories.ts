import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { repositories } from "@/lib/data/schema";
import { createStep, RepoPipelineContext } from "./types";
import { isNotNullOrUndefined } from "../typeHelpers";
import { UTCDate } from "@date-fns/utc";

/**
 * Common pipeline step to fetch and filter repositories based on context
 */
export const getSelectedRepositories = createStep(
  "getSelectedRepositories",
  async (_, { repoId, logger, config }: RepoPipelineContext) => {
    // Filter repositories
    const configRepos = config.repositories;
    logger?.info(`Found ${configRepos.length} configured repositories`, {
      configRepos,
    });
    for (const repo of configRepos) {
      await registerRepository(repo.owner, repo.repoId);
    }
    // Fetch all repositories
    const repos = await db
      .select({ repoId: repositories.repoId })
      .from(repositories)
      .where(repoId ? eq(repositories.repoId, repoId) : undefined);
    logger?.info(`Found ${repos.length} repositories in DB`, {
      repos: repos.map((r) => r.repoId),
    });

    const selectedRepos = repos
      .map((repo) => {
        const configRepo = configRepos.find((r) => r.repoId === repo.repoId);
        if (!configRepo) {
          logger?.warn(`Repository ${repo.repoId} not found in config`, {
            repo,
          });
          return null;
        }
        return {
          repoId: configRepo.repoId,
          org: configRepo.owner,
          name: configRepo.name,
          defaultBranch: configRepo.defaultBranch,
        };
      })
      .filter(isNotNullOrUndefined);
    logger?.info(`Filtering for configured repositories`, { selectedRepos });

    return selectedRepos;
  },
); /**
 * Register or update a repository in the database
 */

export async function registerRepository(org: string, repoId: string) {
  await db
    .insert(repositories)
    .values({
      org,
      repoId,
      lastUpdated: new UTCDate().toISOString(),
    })
    .onConflictDoNothing({
      target: repositories.repoId,
    });

  return { repoId };
}
