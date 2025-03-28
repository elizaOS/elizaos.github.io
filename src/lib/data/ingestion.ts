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
} from "./schema";
import { githubClient } from "./github";
import { PipelineConfig, RepositoryConfig } from "./types";
import { eq, sql } from "drizzle-orm";

export class DataIngestion {
  private logPrefix = "[DataIngestion]";
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Register a repository for tracking
   */
  async registerRepository(
    repository: RepositoryConfig
  ): Promise<{ id: string }> {
    const { owner, name } = repository;
    const id = `${owner}/${name}`;

    console.log(`${this.logPrefix} Registering repository: ${id}`);

    await db
      .insert(repositories)
      .values({
        id,
        owner,
        name,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: repositories.id,
        set: {
          lastUpdated: new Date().toISOString(),
        },
      });

    return { id };
  }

  /**
   * Ensure a user exists in the users table
   */
  private async ensureUserExists(
    username: string,
    avatarUrl?: string
  ): Promise<void> {
    if (!username || username === "unknown") return;

    // Skip if username is in the bot users list
    if (this.config.botUsers?.includes(username)) {
      console.log(`${this.logPrefix} Skipping bot user: ${username}`);
      return;
    }

    await db
      .insert(users)
      .values({
        username,
        avatarUrl: avatarUrl || "",
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          avatarUrl: avatarUrl || sql`COALESCE(${users.avatarUrl}, '')`,
          lastUpdated: new Date().toISOString(),
        },
      });
  }

  /**
   * Fetch and store pull requests for a repository
   */
  async fetchAndStorePullRequests(
    repository: RepositoryConfig,
    options: { days?: number; since?: string; until?: string } = {}
  ): Promise<number> {
    const repoId = `${repository.owner}/${repository.name}`;
    console.log(`${this.logPrefix} Fetching PRs for ${repoId}`);

    try {
      const prs = await githubClient.fetchPullRequests(repository, options);
      console.log(`${this.logPrefix} Storing ${prs.length} PRs for ${repoId}`);

      // Filter out undefined values
      const validPRs = prs.filter(
        (pr): pr is NonNullable<typeof pr> => pr !== undefined
      );

      for (const pr of validPRs) {
        // Ensure user exists
        const authorUsername = pr.author?.login || "unknown";
        const authorAvatarUrl = pr.author?.avatarUrl || "";
        await this.ensureUserExists(authorUsername, authorAvatarUrl);

        // Store PR
        await db
          .insert(rawPullRequests)
          .values({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body ?? "",
            state: pr.state,
            merged: pr.merged ? 1 : 0,
            author: authorUsername,
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
            labels: JSON.stringify(pr.labels?.nodes || []),
          })
          .onConflictDoUpdate({
            target: rawPullRequests.id,
            set: {
              state: pr.state,
              merged: pr.merged ? 1 : 0,
              updatedAt: pr.updatedAt,
              closedAt: pr.closedAt || null,
              mergedAt: pr.mergedAt || null,
              additions: pr.additions,
              deletions: pr.deletions,
              changedFiles: pr.changedFiles,
              labels: JSON.stringify(pr.labels?.nodes || []),
              lastUpdated: new Date().toISOString(),
            },
          });

        // Store PR files
        if (pr.files?.nodes) {
          const files = pr.files.nodes;
          console.log(
            `${this.logPrefix} Storing ${files.length} files for PR #${pr.number}`
          );

          for (const file of files) {
            await db
              .insert(rawPullRequestFiles)
              .values({
                id: `${pr.id}_${file.path}`,
                prId: pr.id,
                path: file.path,
                additions: file.additions,
                deletions: file.deletions,
                changeType: file.changeType,
              })
              .onConflictDoUpdate({
                target: rawPullRequestFiles.id,
                set: {
                  additions: file.additions,
                  deletions: file.deletions,
                  changeType: file.changeType,
                  lastUpdated: new Date().toISOString(),
                },
              });
          }
        }

        // Store PR commits
        if (pr.commits?.nodes) {
          const commits = pr.commits.nodes.map((node) => node.commit);
          console.log(
            `${this.logPrefix} Storing ${commits.length} commits for PR #${pr.number}`
          );

          for (const commit of commits) {
            // Ensure commit author exists if they have a GitHub account
            if (commit.author.user?.login) {
              await this.ensureUserExists(
                commit.author.user.login,
                commit.author.user.avatarUrl || undefined
              );
            }

            await db
              .insert(rawCommits)
              .values({
                oid: commit.oid,
                message: commit.message,
                messageHeadline: commit.messageHeadline,
                committedDate: commit.committedDate,
                authorName: commit.author.name,
                authorEmail: commit.author.email,
                authorDate: commit.author.date,
                author: commit.author.user?.login,
                repository: repoId,
                additions: commit.additions,
                deletions: commit.deletions,
                changedFiles: commit.changedFiles,
                pullRequestId: pr.id,
              })
              .onConflictDoUpdate({
                target: [rawCommits.oid],
                set: {
                  message: commit.message,
                  messageHeadline: commit.messageHeadline,
                  author: commit.author.user?.login,
                  additions: commit.additions,
                  deletions: commit.deletions,
                  changedFiles: commit.changedFiles,
                  lastUpdated: new Date().toISOString(),
                },
              });
          }
        }

        // Store PR reviews
        if (pr.reviews?.nodes) {
          const reviews = pr.reviews.nodes;
          console.log(
            `${this.logPrefix} Storing ${reviews.length} reviews for PR #${pr.number}`
          );

          for (const review of reviews) {
            // Ensure review author exists
            const reviewAuthor = review.author?.login || "unknown";
            if (review.author?.login) {
              await this.ensureUserExists(
                review.author.login,
                review.author.avatarUrl || undefined
              );
            }

            await db
              .insert(prReviews)
              .values({
                id: review.id,
                prId: pr.id,
                state: review.state,
                body: review.body ?? "",
                submittedAt: review.submittedAt || pr.updatedAt,
                author: reviewAuthor,
              })
              .onConflictDoUpdate({
                target: [prReviews.id],
                set: {
                  state: review.state,
                  body: review.body ?? "",
                  submittedAt: review.submittedAt || pr.updatedAt,
                  lastUpdated: new Date().toISOString(),
                },
              });
          }
        }

        // Store PR comments
        if (pr.comments?.nodes) {
          const comments = pr.comments.nodes;
          console.log(
            `${this.logPrefix} Storing ${comments.length} comments for PR #${pr.number}`
          );

          for (const comment of comments) {
            // Ensure comment author exists
            const commentAuthor = comment.author?.login || "unknown";
            if (comment.author?.login) {
              await this.ensureUserExists(
                comment.author.login,
                comment.author.avatarUrl || undefined
              );
            }

            await db
              .insert(prComments)
              .values({
                id: comment.id,
                prId: pr.id,
                body: comment.body ?? "",
                createdAt: comment.createdAt || pr.updatedAt,
                updatedAt: comment.updatedAt,
                author: commentAuthor,
              })
              .onConflictDoUpdate({
                target: [prComments.id],
                set: {
                  body: comment.body ?? "",
                  updatedAt: comment.updatedAt,
                  lastUpdated: new Date().toISOString(),
                },
              });
          }
        }
      }

      // Update repository lastFetchedAt
      await db
        .update(repositories)
        .set({
          lastFetchedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(repositories.id, repoId));

      return prs.length;
    } catch (error: unknown) {
      console.error(`${this.logPrefix} Error fetching PRs:`, error);
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
    options: { days?: number; since?: string; until?: string } = {}
  ): Promise<number> {
    const repoId = `${repository.owner}/${repository.name}`;
    console.log(`${this.logPrefix} Fetching issues for ${repoId}`);

    try {
      const issues = await githubClient.fetchIssues(repository, options);
      console.log(
        `${this.logPrefix} Storing ${issues.length} issues for ${repoId}`
      );

      // Filter out undefined values
      const validIssues = issues.filter(
        (issue): issue is NonNullable<typeof issue> => issue !== undefined
      );

      for (const issue of validIssues) {
        // Ensure user exists
        const authorUsername = issue.author?.login || "unknown";
        const authorAvatarUrl = issue.author?.avatarUrl || "";
        await this.ensureUserExists(authorUsername, authorAvatarUrl);

        // Store issue
        await db
          .insert(rawIssues)
          .values({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: issue.body ?? "",
            state: issue.state,
            locked: issue.locked ? 1 : 0,
            author: authorUsername,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            closedAt: issue.closedAt || null,
            repository: repoId,
            labels: JSON.stringify(issue.labels?.nodes || []),
          })
          .onConflictDoUpdate({
            target: rawIssues.id,
            set: {
              state: issue.state,
              locked: issue.locked ? 1 : 0,
              updatedAt: issue.updatedAt,
              closedAt: issue.closedAt || null,
              labels: JSON.stringify(issue.labels?.nodes || []),
              lastUpdated: new Date().toISOString(),
            },
          });

        // Store issue comments
        if (issue.comments?.nodes) {
          const comments = issue.comments.nodes;
          console.log(
            `${this.logPrefix} Storing ${comments.length} comments for issue #${issue.number}`
          );

          for (const comment of comments) {
            // Ensure comment author exists
            const commentAuthor = comment.author?.login || "unknown";
            if (comment.author?.login) {
              await this.ensureUserExists(
                comment.author.login,
                comment.author.avatarUrl || undefined
              );
            }

            await db
              .insert(issueComments)
              .values({
                id: comment.id,
                issueId: issue.id,
                body: comment.body ?? "",
                createdAt: comment.createdAt || issue.updatedAt,
                updatedAt: comment.updatedAt,
                author: commentAuthor,
              })
              .onConflictDoUpdate({
                target: [issueComments.id],
                set: {
                  body: comment.body ?? "",
                  updatedAt: comment.updatedAt,
                  lastUpdated: new Date().toISOString(),
                },
              });
          }
        }
      }

      // Update repository lastFetchedAt
      await db
        .update(repositories)
        .set({
          lastFetchedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(repositories.id, repoId));

      return issues.length;
    } catch (error: unknown) {
      console.error(`${this.logPrefix} Error fetching issues:`, error);
      throw new Error(
        `Failed to fetch issues: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch all GitHub data for a repository
   */
  async fetchAllData(
    repository: RepositoryConfig,
    options: { days?: number; since?: string; until?: string } = {}
  ): Promise<{ prs: number; issues: number }> {
    await this.registerRepository(repository);

    const prs = await this.fetchAndStorePullRequests(repository, options);
    const issues = await this.fetchAndStoreIssues(repository, options);

    return { prs, issues };
  }
}
