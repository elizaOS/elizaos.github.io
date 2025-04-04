import { db } from "./db";
import {
  rawPullRequests,
  rawPullRequestFiles,
  rawIssues,
  rawCommits,
  prReviews,
  prComments,
  issueComments,
  repositories,
  users,
  labels,
  pullRequestLabels,
  issueLabels,
} from "./schema";
import { GitHubClient } from "./github";
import { PipelineConfig, RepositoryConfig } from "./pipelineConfig";
import { eq, sql } from "drizzle-orm";
import { Logger, createLogger } from "./processing/logger";

export class DataIngestion {
  private logger: Logger;
  private config: PipelineConfig;
  private github: GitHubClient;

  constructor(config: PipelineConfig, logger?: Logger) {
    this.config = config;
    this.logger =
      logger?.child("Ingestion") ||
      createLogger({ minLevel: "info", nameSegments: ["Ingestion"] });
    this.github = new GitHubClient(this.logger.child("GitHub"));
  }

  /**
   * Register a repository for tracking
   */
  async registerRepository(
    repository: RepositoryConfig
  ): Promise<{ repoId: string }> {
    const { repoId } = repository;

    this.logger.info(`Registering repository: ${repoId}`);

    await db
      .insert(repositories)
      .values({
        repoId,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: repositories.repoId,
        set: {
          lastUpdated: new Date().toISOString(),
        },
      });

    return { repoId };
  }

  /**
   * Ensure multiple users exist in the users table
   */
  private async ensureUsersExist(
    userData: Map<string, { avatarUrl?: string }>
  ) {
    // Filter out unknown or empty usernames
    const validUsers = Array.from(userData.entries())
      .filter(([username]) => username && username !== "unknown")
      .map(([username, { avatarUrl }]) => ({
        username,
        avatarUrl: avatarUrl || "",
        isBot: this.config.botUsers?.includes(username) ? 1 : 0,
        lastUpdated: new Date().toISOString(),
      }));

    if (validUsers.length === 0) return;

    this.logger.debug(`Ensuring ${validUsers.length} users exist`);

    await db
      .insert(users)
      .values(validUsers)
      .onConflictDoUpdate({
        target: users.username,
        set: {
          avatarUrl: sql`COALESCE(excluded.avatar_url, ${users.avatarUrl})`,
          isBot: sql`excluded.is_bot`,
          lastUpdated: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  /**
   * Ensure labels exist and return a map of label IDs
   */
  private async ensureLabelsExist(
    labelData: Array<{
      id: string;
      name: string;
      color: string;
      description?: string | null;
    }>
  ): Promise<Map<string, string>> {
    if (labelData.length === 0) return new Map();

    this.logger.debug(`Ensuring ${labelData.length} labels exist`);

    const labelsToInsert = labelData.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description || "",
      lastUpdated: new Date().toISOString(),
    }));

    await db
      .insert(labels)
      .values(labelsToInsert)
      .onConflictDoUpdate({
        target: labels.id,
        set: {
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          description: sql`excluded.description`,
          lastUpdated: sql`CURRENT_TIMESTAMP`,
        },
      });

    return new Map(labelData.map((label) => [label.id, label.name]));
  }

  /**
   * Store PR-Label relationships
   */
  private async storePRLabels(prId: string, labelIds: string[]) {
    if (labelIds.length === 0) return;

    const relationships = labelIds.map((labelId) => ({
      prId,
      labelId,
      lastUpdated: new Date().toISOString(),
    }));

    await db
      .insert(pullRequestLabels)
      .values(relationships)
      .onConflictDoUpdate({
        target: [pullRequestLabels.prId, pullRequestLabels.labelId],
        set: {
          lastUpdated: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  /**
   * Store Issue-Label relationships
   */
  private async storeIssueLabels(issueId: string, labelIds: string[]) {
    if (labelIds.length === 0) return;

    const relationships = labelIds.map((labelId) => ({
      issueId,
      labelId,
      lastUpdated: new Date().toISOString(),
    }));

    await db
      .insert(issueLabels)
      .values(relationships)
      .onConflictDoUpdate({
        target: [issueLabels.issueId, issueLabels.labelId],
        set: {
          lastUpdated: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  /**
   * Fetch and store pull requests for a repository
   */
  async fetchAndStorePullRequests(
    repository: RepositoryConfig,
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<number> {
    const { repoId } = repository;

    try {
      const prs = await this.github.fetchPullRequests(repository, options);
      this.logger.info(`Storing ${prs.length} PRs for ${repoId}`);

      // Filter out undefined values
      const validPRs = prs.filter(
        (pr): pr is NonNullable<typeof pr> => pr !== undefined
      );

      // Collect all users that need to be created/updated
      const userData = new Map<string, { avatarUrl?: string }>();
      for (const pr of validPRs) {
        // PR author
        if (pr.author?.login) {
          userData.set(pr.author.login, {
            avatarUrl: pr.author.avatarUrl || undefined,
          });
        }

        // Review authors
        pr.reviews?.nodes?.forEach((review) => {
          if (review.author?.login) {
            userData.set(review.author.login, {
              avatarUrl: review.author.avatarUrl || undefined,
            });
          }
        });

        // Comment authors
        pr.comments?.nodes?.forEach((comment) => {
          if (comment.author?.login) {
            userData.set(comment.author.login, {
              avatarUrl: comment.author.avatarUrl || undefined,
            });
          }
        });

        // Commit authors
        pr.commits?.nodes?.forEach((node) => {
          if (node.commit.author.user?.login) {
            userData.set(node.commit.author.user.login, {
              avatarUrl: node.commit.author.user.avatarUrl || undefined,
            });
          }
        });
      }

      // Ensure all users exist in a single batch operation
      await this.ensureUsersExist(userData);

      // Process all labels first
      const allLabels = validPRs.flatMap((pr) => pr.labels?.nodes || []);
      await this.ensureLabelsExist(allLabels);

      // Batch insert PRs
      if (validPRs.length > 0) {
        const prsToInsert = validPRs.map((pr) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body ?? "",
          state: pr.state,
          merged: pr.merged ? 1 : 0,
          author: pr.author?.login || "unknown",
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          closedAt: pr.closedAt || null,
          mergedAt: pr.mergedAt || null,
          repository: repoId,
          headRefOid: pr.headRefOid,
          baseRefOid: pr.baseRefOid,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
        }));

        await db
          .insert(rawPullRequests)
          .values(prsToInsert)
          .onConflictDoUpdate({
            target: rawPullRequests.id,
            set: {
              state: sql`excluded.state`,
              merged: sql`excluded.merged`,
              updatedAt: sql`excluded.updated_at`,
              closedAt: sql`excluded.closed_at`,
              mergedAt: sql`excluded.merged_at`,
              additions: sql`excluded.additions`,
              deletions: sql`excluded.deletions`,
              changedFiles: sql`excluded.changed_files`,
              lastUpdated: sql`CURRENT_TIMESTAMP`,
            },
          });

        // Store PR-Label relationships
        for (const pr of validPRs) {
          const labelIds = pr.labels?.nodes?.map((label) => label.id) || [];
          await this.storePRLabels(pr.id, labelIds);
        }
      }

      // Batch insert PR files
      for (const pr of validPRs) {
        if (pr.files?.nodes?.length) {
          const filesToInsert = pr.files.nodes.map((file) => ({
            id: `${pr.id}_${file.path}`,
            prId: pr.id,
            path: file.path,
            additions: file.additions,
            deletions: file.deletions,
            changeType: file.changeType,
          }));

          await db
            .insert(rawPullRequestFiles)
            .values(filesToInsert)
            .onConflictDoUpdate({
              target: rawPullRequestFiles.id,
              set: {
                additions: sql`excluded.additions`,
                deletions: sql`excluded.deletions`,
                changeType: sql`excluded.changeType`,
                lastUpdated: sql`CURRENT_TIMESTAMP`,
              },
            });
        }
      }

      // Batch insert commits
      for (const pr of validPRs) {
        if (pr.commits?.nodes?.length) {
          const commitsToInsert = pr.commits.nodes.map((node) => ({
            oid: node.commit.oid,
            message: node.commit.message,
            messageHeadline: node.commit.messageHeadline,
            committedDate: node.commit.committedDate,
            authorName: node.commit.author.name,
            authorEmail: node.commit.author.email,
            authorDate: node.commit.author.date,
            author: node.commit.author.user?.login,
            repository: repoId,
            additions: node.commit.additions,
            deletions: node.commit.deletions,
            changedFiles: node.commit.changedFiles,
            pullRequestId: pr.id,
          }));

          await db
            .insert(rawCommits)
            .values(commitsToInsert)
            .onConflictDoUpdate({
              target: [rawCommits.oid],
              set: {
                message: sql`excluded.message`,
                messageHeadline: sql`excluded.message_headline`,
                author: sql`excluded.author`,
                additions: sql`excluded.additions`,
                deletions: sql`excluded.deletions`,
                changedFiles: sql`excluded.changed_files`,
                lastUpdated: sql`CURRENT_TIMESTAMP`,
              },
            });
        }
      }

      // Batch insert reviews
      for (const pr of validPRs) {
        if (pr.reviews?.nodes?.length) {
          const reviewsToInsert = pr.reviews.nodes.map((review) => ({
            id: review.id,
            prId: pr.id,
            state: review.state,
            body: review.body ?? "",
            createdAt: review.createdAt || pr.updatedAt,
            author: review.author?.login || "unknown",
          }));

          await db
            .insert(prReviews)
            .values(reviewsToInsert)
            .onConflictDoUpdate({
              target: [prReviews.id],
              set: {
                state: sql`excluded.state`,
                body: sql`excluded.body`,
                createdAt: sql`excluded.created_at`,
                lastUpdated: sql`CURRENT_TIMESTAMP`,
              },
            });
        }
      }

      // Batch insert PR comments
      for (const pr of validPRs) {
        if (pr.comments?.nodes?.length) {
          const commentsToInsert = pr.comments.nodes.map((comment) => ({
            id: comment.id,
            prId: pr.id,
            body: comment.body ?? "",
            createdAt: comment.createdAt || pr.updatedAt,
            updatedAt: comment.updatedAt,
            author: comment.author?.login || "unknown",
          }));

          await db
            .insert(prComments)
            .values(commentsToInsert)
            .onConflictDoUpdate({
              target: [prComments.id],
              set: {
                body: sql`excluded.body`,
                updatedAt: sql`excluded.updated_at`,
                lastUpdated: sql`CURRENT_TIMESTAMP`,
              },
            });
        }
      }

      // Update repository lastFetchedAt
      await db
        .update(repositories)
        .set({
          lastFetchedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(repositories.repoId, repoId));

      return prs.length;
    } catch (error: unknown) {
      this.logger.error(`Error fetching PRs for ${repoId}`, {
        error: String(error),
      });
      throw new Error(
        `Failed to fetch PRs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch and store issues for a repository
   */
  async fetchAndStoreIssues(
    repository: RepositoryConfig,
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<number> {
    const { repoId } = repository;
    this.logger.info(`Fetching issues for ${repoId}`, options);

    try {
      const issues = await this.github.fetchIssues(repository, options);
      this.logger.info(`Storing ${issues.length} issues for ${repoId}`);

      // Filter out undefined values
      const validIssues = issues.filter(
        (issue): issue is NonNullable<typeof issue> => issue !== undefined
      );

      // Collect all users that need to be created/updated
      const userData = new Map<string, { avatarUrl?: string }>();
      for (const issue of validIssues) {
        // Issue author
        if (issue.author?.login) {
          userData.set(issue.author.login, {
            avatarUrl: issue.author.avatarUrl || undefined,
          });
        }

        // Comment authors
        issue.comments?.nodes?.forEach((comment) => {
          if (comment.author?.login) {
            userData.set(comment.author.login, {
              avatarUrl: comment.author.avatarUrl || undefined,
            });
          }
        });
      }

      // Ensure all users exist in a single batch operation
      await this.ensureUsersExist(userData);

      // Process all labels first
      const allLabels = validIssues.flatMap(
        (issue) => issue.labels?.nodes || []
      );
      await this.ensureLabelsExist(allLabels);

      // Batch insert issues
      if (validIssues.length > 0) {
        const issuesToInsert = validIssues.map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body ?? "",
          state: issue.state,
          locked: issue.locked ? 1 : 0,
          author: issue.author?.login || "unknown",
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          closedAt: issue.closedAt || null,
          repository: repoId,
        }));

        await db
          .insert(rawIssues)
          .values(issuesToInsert)
          .onConflictDoUpdate({
            target: rawIssues.id,
            set: {
              state: sql`excluded.state`,
              locked: sql`excluded.locked`,
              updatedAt: sql`excluded.updated_at`,
              closedAt: sql`excluded.closed_at`,
              lastUpdated: sql`CURRENT_TIMESTAMP`,
            },
          });

        // Store Issue-Label relationships
        for (const issue of validIssues) {
          const labelIds = issue.labels?.nodes?.map((label) => label.id) || [];
          await this.storeIssueLabels(issue.id, labelIds);
        }
      }

      // Batch insert issue comments
      for (const issue of validIssues) {
        if (issue.comments?.nodes?.length) {
          const commentsToInsert = issue.comments.nodes.map((comment) => ({
            id: comment.id,
            issueId: issue.id,
            body: comment.body ?? "",
            createdAt: comment.createdAt || issue.updatedAt,
            updatedAt: comment.updatedAt,
            author: comment.author?.login || "unknown",
          }));

          await db
            .insert(issueComments)
            .values(commentsToInsert)
            .onConflictDoUpdate({
              target: [issueComments.id],
              set: {
                body: sql`excluded.body`,
                updatedAt: sql`excluded.updated_at`,
                lastUpdated: sql`CURRENT_TIMESTAMP`,
              },
            });
        }
      }

      // Update repository lastFetchedAt
      await db
        .update(repositories)
        .set({
          lastFetchedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(repositories.repoId, repoId));

      return issues.length;
    } catch (error: unknown) {
      this.logger.error(`Error fetching issues for ${repoId}`, {
        error: String(error),
      });
      throw new Error(
        `Failed to fetch issues: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch all GitHub data for all configured repositories
   */
  async fetchAllData(
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<Array<{ repository: string; prs: number; issues: number }>> {
    const results = [];

    // Process all repositories from config
    for (const repository of this.config.repositories) {
      const { repoId } = repository;
      this.logger.info(`Processing repository: ${repoId}`, options);

      // Register/update repository in database
      await this.registerRepository(repository);

      // Fetch data for repository
      const prs = await this.fetchAndStorePullRequests(repository, options);
      const issues = await this.fetchAndStoreIssues(repository, options);

      results.push({ repository: repoId, prs, issues });
    }

    this.logger.info("Completed fetching all data", {
      repositoryCount: this.config.repositories.length,
      results,
    });

    return results;
  }
}
