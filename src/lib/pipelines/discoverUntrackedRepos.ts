// ============================================================
// TYPES & INTERFACES
// ============================================================

import { GitHubClient } from "@/lib/data/github";
import { db } from "@/lib/data/db";
import { untrackedRepositories } from "@/lib/data/schema";
import { Logger } from "@/lib/logger";
import { PipelineConfig } from "./pipelineConfig";
import { matchGlob } from "@/lib/matching/matching-logic";
import { sql } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { toUTCMidnight } from "@/lib/date-utils";

export interface UntrackedRepoData {
  repoId: string;
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  isArchived: boolean;
  primaryLanguage: string | null;
  lastUpdatedAt: string | null;
  lastPushedAt: string | null;
  openPrCount: number;
  mergedPrCount: number;
  closedUnmergedPrCount: number;
  openIssueCount: number;
  closedIssueCount: number;
  activityScore: number;
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Check if a repo matches any exclude pattern using robust glob matching
 */
function matchesExcludePattern(repoName: string, patterns: string[]): boolean {
  return patterns.some((pattern) =>
    matchGlob(pattern, repoName, { caseSensitive: false }),
  );
}

/**
 * Calculate activity score with log-scale and recency weighting
 */
export function calculateActivityScore(
  stars: number,
  watchers: number,
  openPrCount: number,
  mergedPrCount: number,
  closedUnmergedPrCount: number,
  openIssueCount: number,
  closedIssueCount: number,
  lastUpdatedAt: string | null,
  isArchived: boolean,
): number {
  // Log-scale stars/watchers to prevent "big repo always wins"
  const starScore = Math.log1p(stars);
  const watcherScore = Math.log1p(watchers);

  // Total activity
  const totalActivity =
    openPrCount +
    mergedPrCount +
    closedUnmergedPrCount +
    openIssueCount +
    closedIssueCount;

  // Recency bonus: 14 points max, decays to 0 over 14 days
  // ONLY apply if there's actual activity (prevents metadata churn from floating to top)
  let recencyBonus = 0;
  if (totalActivity > 0 && lastUpdatedAt) {
    const daysSinceUpdate = differenceInDays(
      new UTCDate(),
      new UTCDate(lastUpdatedAt),
    );
    recencyBonus = Math.max(0, 14 - daysSinceUpdate);
  }

  // Archive penalty
  const archivePenalty = isArchived ? 0.5 : 1.0;

  const baseScore =
    starScore * 1.0 +
    watcherScore * 1.5 +
    openPrCount * 3 +
    mergedPrCount * 2 +
    closedUnmergedPrCount * 1 +
    openIssueCount * 2 +
    closedIssueCount * 1 +
    recencyBonus;

  return baseScore * archivePenalty;
}

// ============================================================
// DATABASE OPERATIONS (Efficient batch upsert)
// ============================================================

/**
 * Batch upsert untracked repositories (single DB query)
 */
async function batchUpsertUntrackedRepos(repos: UntrackedRepoData[]) {
  if (repos.length === 0) return;

  const now = new Date().toISOString();

  const reposToInsert = repos.map((data) => ({
    repoId: data.repoId,
    owner: data.owner,
    name: data.name,
    description: data.description,
    stars: data.stars,
    forks: data.forks,
    watchers: data.watchers,
    isArchived: data.isArchived,
    primaryLanguage: data.primaryLanguage,
    lastUpdatedAt: data.lastUpdatedAt,
    lastPushedAt: data.lastPushedAt,
    openPrCount: data.openPrCount,
    mergedPrCount: data.mergedPrCount,
    closedUnmergedPrCount: data.closedUnmergedPrCount,
    openIssueCount: data.openIssueCount,
    closedIssueCount: data.closedIssueCount,
    activityScore: data.activityScore,
    lastFetchedAt: now,
  }));

  await db
    .insert(untrackedRepositories)
    .values(reposToInsert)
    .onConflictDoUpdate({
      target: untrackedRepositories.repoId,
      set: {
        owner: sql`excluded.owner`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        stars: sql`excluded.stars`,
        forks: sql`excluded.forks`,
        watchers: sql`excluded.watchers`,
        isArchived: sql`excluded.is_archived`,
        primaryLanguage: sql`excluded.primary_language`,
        lastUpdatedAt: sql`excluded.last_updated_at`,
        lastPushedAt: sql`excluded.last_pushed_at`,
        openPrCount: sql`excluded.open_pr_count`,
        mergedPrCount: sql`excluded.merged_pr_count`,
        closedUnmergedPrCount: sql`excluded.closed_unmerged_pr_count`,
        openIssueCount: sql`excluded.open_issue_count`,
        closedIssueCount: sql`excluded.closed_issue_count`,
        activityScore: sql`excluded.activity_score`,
        lastFetchedAt: sql`excluded.last_fetched_at`,
      },
    });
}

/**
 * Get existing repos for delta detection
 */
async function getExistingUntrackedRepos() {
  return await db
    .select({
      repoId: untrackedRepositories.repoId,
      lastUpdatedAt: untrackedRepositories.lastUpdatedAt,
      lastFetchedAt: untrackedRepositories.lastFetchedAt,
    })
    .from(untrackedRepositories);
}

// ============================================================
// MAIN DISCOVERY FUNCTION
// ============================================================

/**
 * Discover and store untracked repositories from organizations
 */
export async function discoverUntrackedRepos(
  config: PipelineConfig,
  logger: Logger,
  githubToken: string,
): Promise<{
  totalUntracked: number;
  totalUpdated: number;
  totalSkipped: number;
  organizations: Array<{
    org: string;
    total: number;
    updated: number;
    skipped: number;
    error?: string;
  }>;
}> {
  const untrackedConfig = config.untrackedRepos;

  if (!untrackedConfig?.enabled) {
    throw new Error("Untracked repos feature not enabled in config");
  }

  const github = new GitHubClient(githubToken, logger.child("GitHub"));

  // Build set of tracked repos
  const trackedRepos = new Set(
    config.repositories.map((r) => `${r.owner}/${r.name}`),
  );

  const results = [];

  for (const org of untrackedConfig.organizations) {
    try {
      logger.info(`Fetching repositories from organization: ${org}`);

      // 1. Fetch all repos in org
      const repos = await github.fetchOrganizationRepos(org);
      logger.info(`Found ${repos.length} total repos in ${org}`);

      // 2. Filter untracked repos
      const untracked = repos.filter((repo) => {
        const repoId = `${repo.owner}/${repo.name}`;

        if (trackedRepos.has(repoId)) return false;
        if (untrackedConfig.excludeArchived && repo.isArchived) return false;
        if (matchesExcludePattern(repo.name, untrackedConfig.excludePatterns))
          return false;

        return true;
      });

      logger.info(
        `Filtered to ${untracked.length} untracked repos (excluded ${repos.length - untracked.length})`,
      );

      // 3. Delta detection: check which repos need activity fetch
      const dbRepos = await getExistingUntrackedRepos();
      const dbMap = new Map(
        dbRepos.map((r) => [r.repoId, { lastUpdatedAt: r.lastUpdatedAt }]),
      );

      const needsUpdate = untracked.filter((repo) => {
        const repoId = `${repo.owner}/${repo.name}`;
        const dbRecord = dbMap.get(repoId);

        if (!dbRecord) return true; // New repo

        // updatedAt changed (delta detection)
        if (!repo.updatedAt || !dbRecord.lastUpdatedAt) return true;
        const repoUpdated = toUTCMidnight(new Date(repo.updatedAt));
        const dbUpdated = toUTCMidnight(new Date(dbRecord.lastUpdatedAt));
        if (repoUpdated > dbUpdated) return true;

        return false;
      });

      logger.info(
        `Conditional check: ${needsUpdate.length}/${untracked.length} repos need activity fetch ` +
          `(${untracked.length - needsUpdate.length} skipped)`,
      );

      // 4. Fetch activity for repos that need it
      const reposWithActivity = await Promise.all(
        needsUpdate.map(async (repo) => {
          const {
            openPrCount,
            mergedPrCount,
            closedUnmergedPrCount,
            openIssueCount,
            closedIssueCount,
          } = await github.fetchRecentActivityCounts(repo.owner, repo.name, 30);

          const activityScore = calculateActivityScore(
            repo.stars,
            repo.watchers,
            openPrCount,
            mergedPrCount,
            closedUnmergedPrCount,
            openIssueCount,
            closedIssueCount,
            repo.updatedAt,
            repo.isArchived,
          );

          logger.debug(
            `${repo.owner}/${repo.name}: ${openPrCount}/${mergedPrCount}/${closedUnmergedPrCount} PRs, ` +
              `${openIssueCount}/${closedIssueCount} issues, score: ${activityScore.toFixed(1)}`,
          );

          return {
            repoId: `${repo.owner}/${repo.name}`,
            owner: repo.owner,
            name: repo.name,
            description: repo.description,
            stars: repo.stars,
            forks: repo.forks,
            watchers: repo.watchers,
            isArchived: repo.isArchived,
            primaryLanguage: repo.primaryLanguage,
            lastUpdatedAt: repo.updatedAt,
            lastPushedAt: repo.pushedAt,
            openPrCount,
            mergedPrCount,
            closedUnmergedPrCount,
            openIssueCount,
            closedIssueCount,
            activityScore,
          };
        }),
      );

      // 5. Store in database (single batch query)
      await batchUpsertUntrackedRepos(reposWithActivity);
      logger.info(
        `Updated ${reposWithActivity.length} repos in database ` +
          `(${untracked.length} total untracked, ${untracked.length - reposWithActivity.length} unchanged)`,
      );

      results.push({
        org,
        total: untracked.length,
        updated: reposWithActivity.length,
        skipped: untracked.length - reposWithActivity.length,
      });
    } catch (error) {
      logger.error(`Failed to process organization ${org}`, {
        error: String(error),
      });
      results.push({
        org,
        total: 0,
        updated: 0,
        skipped: 0,
        error: String(error),
      });
    }
  }

  const totalUntracked = results.reduce((sum, r) => sum + r.total, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  logger.info(
    `Completed untracked repos scan: ${totalUntracked} total untracked repos ` +
      `(${totalUpdated} updated, ${totalSkipped} unchanged)`,
  );

  return {
    totalUntracked,
    totalUpdated,
    totalSkipped,
    organizations: results,
  };
}
