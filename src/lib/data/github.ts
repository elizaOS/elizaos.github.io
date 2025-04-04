import { Logger, createLogger } from "./processing/logger";
import axios from "axios";
import pRetry, { AbortError } from "p-retry";
import {
  RawPullRequestSchema,
  RawIssueSchema,
  RawCommitSchema,
  RawPRReviewSchema,
  RawCommentSchema,
  RawPRFileSchema,
} from "./types";
import { RepositoryConfig } from "./pipelineConfig";

interface FetchOptions {
  startDate?: string;
  endDate?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  resetAt: Date;
}

/**
 * GitHub API client using direct HTTP requests
 */
export class GitHubClient {
  private logger: Logger;
  private token: string;
  private rateLimitInfo: RateLimitInfo | null = null;
  private maxRetries = 5;
  private exponentialBackoff = true;

  constructor(logger?: Logger) {
    this.logger =
      logger || createLogger({ minLevel: "info", nameSegments: ["GitHub"] });

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    this.token = token;
  }

  /**
   * Wait for the specified number of milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate backoff time with exponential strategy
   */
  private calculateBackoff(
    attempt: number,
    baseMs = 1000,
    maxMs = 60000
  ): number {
    if (!this.exponentialBackoff) return baseMs;

    // Exponential backoff: 2^attempt * baseMs with jitter
    const exponentialTime = Math.min(
      maxMs,
      Math.pow(2, attempt) * baseMs * (0.8 + Math.random() * 0.4) // Add 20% jitter
    );

    return Math.floor(exponentialTime);
  }

  /**
   * Parse rate limit information from response headers
   */
  private parseRateLimitHeaders(
    headers: Record<string, string>
  ): RateLimitInfo | null {
    if (!headers["x-ratelimit-limit"]) return null;

    return {
      limit: parseInt(headers["x-ratelimit-limit"] || "0", 10),
      remaining: parseInt(headers["x-ratelimit-remaining"] || "0", 10),
      used: parseInt(headers["x-ratelimit-used"] || "0", 10),
      resetAt: new Date(
        parseInt(headers["x-ratelimit-reset"] || "0", 10) * 1000
      ),
    };
  }

  /**
   * Execute a GraphQL query with retries
   */
  private async executeGraphQL(
    query: string,
    variables: Record<string, any> = {}
  ) {
    return pRetry(
      async () => {
        try {
          const response = await axios.post(
            "https://api.github.com/graphql",
            { query, variables },
            {
              headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Update rate limit info from headers
          const headerRateLimit = this.parseRateLimitHeaders(
            response.headers as Record<string, string>
          );
          if (headerRateLimit) {
            this.rateLimitInfo = headerRateLimit;
            this.logger.info("Rate limit info", headerRateLimit);
          }

          // Check for GraphQL errors
          if (response.data?.errors?.length > 0) {
            throw new Error(
              `GitHub GraphQL Error: ${response.data.errors[0].message}`
            );
          }

          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            // Update rate limit info from error response if available
            const headerRateLimit = this.parseRateLimitHeaders(
              error.response.headers as Record<string, string>
            );

            if (headerRateLimit) {
              this.logger.info("Rate limit info", headerRateLimit);
              this.rateLimitInfo = headerRateLimit;
            }

            const status = error.response.status;
            const retryAfter = error.response.headers?.["retry-after"];
            const responseData = error.response.data;
            const errorMessage = responseData?.message || "";

            // Check for primary rate limit exceeded
            if (this.rateLimitInfo?.remaining === 0) {
              const message = `GitHub API rate limit exceeded. Reset at ${this.rateLimitInfo.resetAt.toISOString()}`;
              this.logger.warn(message);

              if (retryAfter) {
                // Wait for retry-after before stopping
                const waitTime = parseInt(retryAfter as string, 10) * 1000;
                await this.delay(waitTime);
              }

              throw new AbortError(message);
            }

            // Check for secondary rate limit exceeded
            if (
              status === 403 &&
              errorMessage.includes("secondary rate limit")
            ) {
              const message = `GitHub API secondary rate limit exceeded: ${errorMessage}`;
              this.logger.warn(message);

              const backoffTime = retryAfter
                ? parseInt(retryAfter as string, 10) * 1000
                : this.calculateBackoff(1, 5000, 120000); // Use a default attempt number of 1

              this.logger.info(
                `Waiting ${backoffTime / 1000} seconds before retrying...`
              );
              await this.delay(backoffTime);

              // Allow p-retry to retry after the wait
              throw new Error(message);
            }

            // Let p-retry handle normal errors
            throw new Error(
              `GitHub API Error (${status}): ${errorMessage || error.message}`
            );
          }

          // Network errors, timeouts, etc.
          throw new Error(
            `GitHub API request failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
      {
        retries: this.maxRetries,
        onFailedAttempt: (error) => {
          this.logger.warn(
            `GitHub API request attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
            {
              error: error.message,
            }
          );
        },
        minTimeout: 1000, // Start with 1 second delay between retries
        maxTimeout: 60000, // Maximum 1 minute delay between retries
      }
    );
  }

  /**
   * Fetch pull requests with GraphQL
   */
  async fetchPullRequests(
    repository: RepositoryConfig,
    options: FetchOptions = {}
  ) {
    const { repoId } = repository;
    const [owner, name] = repoId.split("/");
    const { startDate, endDate } = options;
    const period = `${startDate || "*"}..${endDate || "*"}`;

    this.logger.info(`Fetching PRs for ${repoId}`, { period });

    // Build date filter for search query
    let dateFilter = "";
    if (startDate || endDate) {
      dateFilter += ` updated:${period}`;
    }
    // Build search query - ensure date filter is applied
    const searchQuery = `repo:${owner}/${name} is:pr${dateFilter}`;
    this.logger.info(`PR search query: ${searchQuery}`);

    const query = `
      query($searchQuery: String!, $endCursor: String) {
        search(
          type: ISSUE,
          query: $searchQuery,
          first: 50,
          after: $endCursor
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on PullRequest {
              id
              number
              title
              body
              state
              merged
              createdAt
              updatedAt
              closedAt
              mergedAt
              headRefOid
              baseRefOid
              additions
              deletions
              changedFiles
              author { 
                login 
                avatarUrl
              }
              labels(first: 6) { 
                nodes { 
                  id
                  name 
                  color
                  description
                } 
              }
              
              # Get essential commit data
              commits(first: 30) {
                totalCount
                nodes {
                  commit {
                    oid
                    message
                    messageHeadline
                    committedDate
                    author {
                      name
                      email
                      date
                      user {
                        login
                        avatarUrl
                      }
                    }
                    additions
                    deletions
                    changedFiles
                  }
                }
              }
              
              # Get essential review data
              reviews(first: 15) {
                nodes {
                  id
                  state
                  body
                  submittedAt
                  createdAt
                  author {
                    login
                    avatarUrl
                  }
                  url
                }
              }
              
              # Get essential comment data
              comments(first: 30) {
                nodes {
                  id
                  body
                  createdAt
                  updatedAt
                  author {
                    login
                    avatarUrl
                  }
                  url
                }
              }
              
              # Get essential file data
              files(first: 50) {
                nodes {
                  path
                  additions
                  deletions
                  changeType
                }
              }
            }
          }
        }
      }
    `;

    try {
      let hasNextPage = true;
      let endCursor: string | null = null;
      let allPullRequests: any[] = [];

      // Paginate through all results
      while (hasNextPage) {
        const variables: Record<string, string> = {
          searchQuery,
        };
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        const response = await this.executeGraphQL(query, variables);

        const searchResults = response.data.search;
        const pageResults = searchResults.nodes;
        allPullRequests = [...allPullRequests, ...pageResults];

        hasNextPage = searchResults.pageInfo.hasNextPage;
        endCursor = searchResults.pageInfo.endCursor;

        this.logger.info("Fetched PR page", {
          pageCount: pageResults.length,
          totalSoFar: allPullRequests.length,
          hasNextPage,
          endCursor,
        });
      }

      // Validate each PR with Zod schema
      const validatedPRs = allPullRequests.map((pr) => {
        try {
          return RawPullRequestSchema.parse(pr);
        } catch (error) {
          this.logger.error(`Validation error for PR #${pr.number}`, { error });
          return undefined;
        }
      });

      const validPRs = validatedPRs.filter(
        (pr): pr is NonNullable<typeof pr> => pr !== undefined
      );
      this.logger.info(`Fetched ${validPRs.length} PRs for ${owner}/${name}`);
      return validPRs;
    } catch (error) {
      this.logger.error("Error fetching PRs", { error: String(error), repoId });
      return [];
    }
  }

  /**
   * Fetch issues with GraphQL
   */
  async fetchIssues(repository: RepositoryConfig, options: FetchOptions = {}) {
    const { repoId } = repository;
    const [owner, name] = repoId.split("/");
    const { startDate, endDate } = options;
    const period = `${startDate || "*"}..${endDate || "*"}`;
    this.logger.info(`Fetching issues for ${repoId}`, { period });

    // Build date filter for search query
    let dateFilter = "";
    if (startDate || endDate) {
      dateFilter += ` updated:${period}`;
    }
    // Build search query - ensure date filter is applied
    const searchQuery = `repo:${owner}/${name} is:issue${dateFilter}`;
    this.logger.info(`Issue search query: ${searchQuery}`);

    const query = `
      query($searchQuery: String!, $endCursor: String) {
        search(
          type: ISSUE,
          query: $searchQuery,
          first: 100,
          after: $endCursor
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on Issue {
              id
              number
              title
              body
              state
              locked
              createdAt
              updatedAt
              closedAt
              author {
                login
                avatarUrl
              }
              labels(first: 30) { 
                nodes { 
                  id
                  name 
                  color
                  description
                } 
              }
              
              # Get issue comments
              comments(first: 30) {
                totalCount
                nodes {
                  id
                  body
                  createdAt
                  updatedAt
                  author {
                    login
                    avatarUrl
                  }
                  url
                }
              }
            }
          }
        }
      }
    `;

    try {
      let hasNextPage = true;
      let endCursor: string | null = null;
      let allIssues: any[] = [];

      // Build search query
      this.logger.info(`Fetching issues with search query: ${searchQuery}`);
      // Paginate through all results
      while (hasNextPage) {
        const variables: Record<string, string> = {
          searchQuery,
        };
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        this.logger.debug("Fetching issue page", {
          endCursor,
          searchQuery,
          repository: `${owner}/${name}`,
        });

        const response = await this.executeGraphQL(query, variables);

        const searchResults = response.data.search;
        const pageResults = searchResults.nodes;
        allIssues = [...allIssues, ...pageResults];

        hasNextPage = searchResults.pageInfo.hasNextPage;
        endCursor = searchResults.pageInfo.endCursor;

        this.logger.debug("Fetched issue page", {
          pageCount: pageResults.length,
          totalSoFar: allIssues.length,
          hasNextPage,
          endCursor,
        });
      }

      // Validate each issue with Zod schema
      const validatedIssues = allIssues.map((issue) => {
        try {
          return RawIssueSchema.parse(issue);
        } catch (error) {
          this.logger.error(`Validation error for Issue #${issue.number}`, {
            error,
          });
          return undefined;
        }
      });

      const validIssues = validatedIssues.filter(
        (issue): issue is NonNullable<typeof issue> => issue !== undefined
      );
      this.logger.info(
        `Fetched ${validIssues.length} issues for ${owner}/${name}`
      );
      return validIssues;
    } catch (error) {
      this.logger.error("Error fetching issues", {
        error: String(error),
        repoId,
      });
      return [];
    }
  }

  /**
   * Fetch commits with GraphQL
   */
  async fetchCommits(repository: RepositoryConfig, options: FetchOptions = {}) {
    const { repoId } = repository;
    const [owner, name] = repoId.split("/");
    const { startDate, endDate } = options;

    this.logger.info(`Fetching commits for ${repoId}`, { startDate, endDate });

    const query = `
      query($endCursor: String, $since: GitTimestamp, $until: GitTimestamp) {
        repository(owner: "${owner}", name: "${name}") {
          defaultBranchRef {
            target {
              ... on Commit {
                history(
                  first: 100,
                  after: $endCursor,
                  since: $since,
                  until: $until
                ) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    oid
                    messageHeadline
                    message
                    committedDate
                    author {
                      name
                      email
                      user {
                        login
                        avatarUrl
                      }
                    }
                    additions
                    deletions
                    changedFiles
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      let hasNextPage = true;
      let endCursor: string | null = null;
      let allCommits: any[] = [];

      // Paginate through all results
      while (hasNextPage) {
        const variables: Record<string, any> = {};
        if (startDate) {
          variables.since = startDate;
        }
        if (endDate) {
          variables.until = endDate;
        }
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        this.logger.debug("Fetching commit page", {
          endCursor,
          since: startDate,
          until: endDate,
          repository: `${owner}/${name}`,
        });

        const response = await this.executeGraphQL(query, variables);

        const history =
          response.data.repository.defaultBranchRef.target.history;
        const pageResults = history.nodes;
        allCommits = [...allCommits, ...pageResults];

        hasNextPage = history.pageInfo.hasNextPage;
        endCursor = history.pageInfo.endCursor;

        this.logger.debug("Fetched commit page", {
          pageCount: pageResults.length,
          totalSoFar: allCommits.length,
          hasNextPage,
          endCursor,
        });
      }

      // Validate each commit with Zod schema
      const validatedCommits = allCommits.map((commit) => {
        try {
          return RawCommitSchema.parse(commit);
        } catch (error) {
          this.logger.error(`Validation error for commit ${commit.oid}`, {
            error,
          });
          return undefined;
        }
      });

      const validCommits = validatedCommits.filter(
        (commit): commit is NonNullable<typeof commit> => commit !== undefined
      );
      this.logger.info(
        `Fetched ${validCommits.length} commits for ${owner}/${name}`
      );
      return validCommits;
    } catch (error) {
      this.logger.error("Error fetching commits", {
        error: String(error),
        repoId,
      });
      return [];
    }
  }
}

// Export a singleton instance with default logger
export const githubClient = new GitHubClient();
