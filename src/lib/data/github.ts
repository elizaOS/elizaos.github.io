import { Logger, createLogger } from "@/lib/logger";
import axios, { AxiosError, RawAxiosResponseHeaders } from "axios";
import pRetry, { AbortError } from "p-retry";
import { RawPullRequestSchema, RawIssueSchema, RawCommitSchema } from "./types";
import { RepositoryConfig } from "@/lib/pipelines/pipelineConfig";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { z } from "zod";

interface FetchOptions {
  startDate?: string;
  endDate?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  cost?: number;
}

interface RetryConfig {
  maxRetries: number;
  minTimeout: number;
  maxTimeout: number;
  factor: number;
}

// Token bucket for rate limiting
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

// Define interfaces for the GraphQL response
interface GitHubPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GitHubSearchResponse<T> {
  search: {
    nodes: T[];
    pageInfo: GitHubPageInfo;
  };
}

interface GitHubRepositoryResponse<T> {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: T[];
          pageInfo: GitHubPageInfo;
        };
      };
    };
  };
}

type GitHubGraphQLResponse<T> = {
  data: GitHubSearchResponse<T> | GitHubRepositoryResponse<T>;
};

class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public resetAt: Date,
  ) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

class SecondaryRateLimitError extends Error {
  constructor(
    message: string,
    public waitTime: number,
  ) {
    super(message);
    this.name = "SecondaryRateLimitError";
  }
}

/**
 * Enhanced GitHub API client with robust rate limiting and retry handling
 */
export class GitHubClient {
  private logger: Logger;
  private token: string;
  private rateLimitInfo: RateLimitInfo | null = null;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 5,
    minTimeout: 1000,
    maxTimeout: 120000,
    factor: 2,
  };
  private concurrentRequests = 0;
  private readonly maxConcurrentRequests = 10;

  // Token bucket for points-based rate limiting (900 points per minute)
  private pointsBucket: TokenBucket = {
    tokens: 900,
    lastRefill: Date.now(),
    capacity: 900,
    refillRate: 900 / 60000, // tokens per millisecond
  };

  // Token bucket for concurrent requests (max 100, but we'll be conservative with 50)
  private concurrentBucket: TokenBucket = {
    tokens: 50,
    lastRefill: Date.now(),
    capacity: 50,
    refillRate: 50 / 60000, // tokens per millisecond
  };

  constructor(logger?: Logger) {
    this.logger =
      logger || createLogger({ minLevel: "info", nameSegments: ["GitHub"] });

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    this.token = token;

    // Set up axios defaults
    axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
    axios.defaults.headers.common["Content-Type"] = "application/json";
  }

  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRateLimitHeaders(
    headers: RawAxiosResponseHeaders,
  ): RateLimitInfo {
    const resetAt = headers["x-ratelimit-reset"]
      ? new Date(parseInt(headers["x-ratelimit-reset"] as string, 10) * 1000)
      : new Date(Date.now() + 60000); // Default 1 minute fallback

    return {
      limit: parseInt((headers["x-ratelimit-limit"] as string) || "5000", 10),
      remaining: parseInt(
        (headers["x-ratelimit-remaining"] as string) || "5000",
        10,
      ),
      resetAt,
      cost: headers["x-github-request-cost"]
        ? parseInt(headers["x-github-request-cost"] as string, 10)
        : undefined,
    };
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo || this.rateLimitInfo.remaining > 0) return;

    const now = Date.now();
    const resetTime = this.rateLimitInfo.resetAt.getTime();
    const waitTime = Math.max(0, resetTime - now) + 1000; // Add 1s buffer

    this.logger.warn(
      `Primary rate limit exceeded. Waiting ${waitTime / 1000}s until ${this.rateLimitInfo.resetAt.toISOString()}`,
    );
    await this.wait(waitTime);
    this.rateLimitInfo.remaining = this.rateLimitInfo.limit; // Reset remaining count
  }

  private refillTokenBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const newTokens = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }

  private async consumeTokens(
    bucket: TokenBucket,
    tokens: number,
  ): Promise<void> {
    this.refillTokenBucket(bucket);

    while (bucket.tokens < tokens) {
      // Wait for enough tokens to be available
      const tokensNeeded = tokens - bucket.tokens;
      const waitTime = Math.ceil(tokensNeeded / bucket.refillRate);
      await this.wait(Math.min(waitTime, 1000)); // Wait at most 1 second at a time
      this.refillTokenBucket(bucket);
    }

    bucket.tokens -= tokens;
  }

  private async checkSecondaryRateLimits(cost: number = 1): Promise<void> {
    // Handle points-based rate limiting
    await this.consumeTokens(this.pointsBucket, cost);

    // Handle concurrent requests rate limiting
    await this.consumeTokens(this.concurrentBucket, 1);
  }

  private async executeGraphQL<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    await this.checkRateLimit();
    await this.checkSecondaryRateLimits(5); // GraphQL queries cost 5 points

    this.concurrentRequests++;

    try {
      return await pRetry(
        async () => {
          try {
            const response = await axios.post(
              "https://api.github.com/graphql",
              { query, variables },
            );

            this.rateLimitInfo = this.parseRateLimitHeaders(response.headers);
            this.logger.debug("Rate limit status", {
              remaining: this.rateLimitInfo.remaining,
              resetAt: this.rateLimitInfo.resetAt,
              pointsRemaining: Math.floor(this.pointsBucket.tokens),
              concurrentRemaining: Math.floor(this.concurrentBucket.tokens),
            });

            const data = response.data;
            if (data?.errors?.length > 0) {
              const errorMsg = data.errors
                .map((e: Error) => e.message)
                .join(", ");
              throw new Error(`GraphQL Errors: ${errorMsg}`);
            }

            return data;
          } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.response) {
              this.rateLimitInfo = this.parseRateLimitHeaders(
                axiosError.response.headers as Record<string, string>,
              );
              this.logger.warn(`Axios Error`, {
                data: axiosError.response.data,
              });
              const status = axiosError.response.status;
              const retryAfter = axiosError.response.headers["retry-after"];
              const message =
                (axiosError.response.data as Record<string, string>)?.message ||
                "";

              if (status === 403 && message.includes("secondary rate limit")) {
                const waitTime = retryAfter
                  ? parseInt(retryAfter, 10) * 1000
                  : this.retryConfig.maxTimeout;
                throw new SecondaryRateLimitError(
                  `Secondary rate limit exceeded: ${message}`,
                  waitTime,
                );
              }

              if (
                status === 403 ||
                (this.rateLimitInfo?.remaining === 0 &&
                  this.rateLimitInfo?.resetAt)
              ) {
                throw new RateLimitExceededError(
                  `Primary rate limit exceeded: ${message}`,
                  this.rateLimitInfo.resetAt,
                );
              }

              throw new Error(
                `GitHub API Error (${status}): ${message || axiosError.message}`,
              );
            }
            throw error; // Rethrow non-Axios errors
          }
        },
        {
          retries: this.retryConfig.maxRetries,
          minTimeout: this.retryConfig.minTimeout,
          maxTimeout: this.retryConfig.maxTimeout,
          factor: this.retryConfig.factor,
          randomize: true,
          onFailedAttempt: async (error) => {
            this.logger.warn(
              `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left`,
              { error: error.message },
            );

            if (error instanceof RateLimitExceededError) {
              await this.wait(error.resetAt.getTime() - Date.now() + 1000);
              throw new AbortError(error.message);
            }

            if (error instanceof SecondaryRateLimitError) {
              await this.wait(error.waitTime);
            }
          },
        },
      );
    } finally {
      this.concurrentRequests--;
    }
  }

  private async paginateGraphQL<T>(
    query: string,
    variables: Record<string, unknown>,
    extractNodes: (data: GitHubGraphQLResponse<T>) => {
      nodes: T[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    },
    nodeType: string,
  ): Promise<T[]> {
    let allNodes: T[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
      const vars = { ...variables };
      if (endCursor) vars.endCursor = endCursor;

      const data = await this.executeGraphQL<GitHubGraphQLResponse<T>>(
        query,
        vars,
      );
      const { nodes, pageInfo } = extractNodes(data);

      allNodes = allNodes.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;

      this.logger.info(`Paginated ${nodeType} fetch `, {
        pageCount: nodes.length,
        totalSoFar: allNodes.length,
        hasNextPage,
      });
    }

    return allNodes;
  }

  async fetchPullRequests(
    repository: RepositoryConfig,
    options: FetchOptions = {},
  ) {
    const [owner, name] = repository.repoId.split("/");
    const { startDate, endDate } = options;
    const dateFilter =
      startDate || endDate
        ? ` updated:${startDate || "*"}..${endDate || "*"}`
        : "";
    const searchQuery = `repo:${owner}/${name} is:pr${dateFilter}`;

    const query = `
      query($searchQuery: String!, $endCursor: String) {
        search(type: ISSUE, query: $searchQuery, first: 25, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on PullRequest {
              id number title body state merged createdAt updatedAt closedAt mergedAt
              headRefOid baseRefOid additions deletions changedFiles
              author { login avatarUrl }
              labels(first: 6) { nodes { id name color description } }
              commits(first: 30) {
                totalCount
                nodes { commit { oid message messageHeadline committedDate
                  author { name email date user { login avatarUrl } }
                  additions deletions changedFiles } }
              }
              closingIssuesReferences(first: 10) {
                nodes { id number title state }
              }
              reactions(first: 20) {
                totalCount
                nodes { id content createdAt user { login avatarUrl } }
              }
              reviews(first: 15) { nodes { id state body submittedAt createdAt author { login avatarUrl } url } }
              comments(first: 30) { 
                nodes { 
                  id body createdAt updatedAt author { login avatarUrl } url 
                  reactions(first: 20) {
                    totalCount
                    nodes { id content createdAt user { login avatarUrl } }
                  }
                } 
              }
              files(first: 50) { nodes { path additions deletions changeType } }
            }
          }
        }
      }
    `;

    try {
      type PRSearchResult = z.infer<typeof RawPullRequestSchema>;

      const prs = await this.paginateGraphQL<PRSearchResult>(
        query,
        { searchQuery },
        (data) => {
          const searchData = data.data as GitHubSearchResponse<PRSearchResult>;
          return {
            nodes: searchData.search.nodes,
            pageInfo: searchData.search.pageInfo,
          };
        },
        "PullRequest",
      );

      const validatedPRs = prs
        .map((pr) => {
          try {
            return RawPullRequestSchema.parse(pr);
          } catch (error) {
            this.logger.error(`Validation error for PR `, {
              pr,
              error,
            });
            return null;
          }
        })
        .filter((pr): pr is NonNullable<typeof pr> => pr !== null);

      this.logger.info(
        `Fetched ${validatedPRs.length} PRs for ${owner}/${name}`,
      );
      return validatedPRs;
    } catch (error) {
      this.logger.error("Failed to fetch pull requests", { error });
      throw error;
    }
  }

  async fetchIssues(repository: RepositoryConfig, options: FetchOptions = {}) {
    const [owner, name] = repository.repoId.split("/");
    const { startDate, endDate } = options;
    const dateFilter =
      startDate || endDate
        ? ` updated:${startDate || "*"}..${endDate || "*"}`
        : "";
    const searchQuery = `repo:${owner}/${name} is:issue${dateFilter}`;

    const query = `
      query($searchQuery: String!, $endCursor: String) {
        search(type: ISSUE, query: $searchQuery, first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on Issue {
              id number title body state locked createdAt updatedAt closedAt
              author { login avatarUrl }
              labels(first: 30) { nodes { id name color description } }
              reactions(first: 20) {
                totalCount
                nodes { id content createdAt user { login avatarUrl } }
              }
              comments(first: 30) {
                totalCount
                nodes { 
                  id body createdAt updatedAt author { login avatarUrl } url 
                  reactions(first: 20) {
                    totalCount
                    nodes { id content createdAt user { login avatarUrl } }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      type IssueSearchResult = z.infer<typeof RawIssueSchema>;

      const issues = await this.paginateGraphQL<IssueSearchResult>(
        query,
        { searchQuery },
        (data) => {
          const searchData =
            data.data as GitHubSearchResponse<IssueSearchResult>;
          return {
            nodes: searchData.search.nodes,
            pageInfo: searchData.search.pageInfo,
          };
        },
        "Issue",
      );

      const validatedIssues = issues
        .map((issue) => {
          try {
            return RawIssueSchema.parse(issue);
          } catch (error) {
            this.logger.error(`Validation error for Issue `, {
              issue,
              error,
            });
            return null;
          }
        })
        .filter((issue): issue is NonNullable<typeof issue> => issue !== null);

      this.logger.info(
        `Fetched ${validatedIssues.length} issues for ${owner}/${name}`,
      );
      return validatedIssues;
    } catch (error) {
      this.logger.error("Failed to fetch issues", { error });
      throw error;
    }
  }

  async fetchCommits(repository: RepositoryConfig, options: FetchOptions = {}) {
    const [owner, name] = repository.repoId.split("/");
    const { startDate, endDate } = options;

    const query = `
      query($endCursor: String, $since: GitTimestamp, $until: GitTimestamp) {
        repository(owner: "${owner}", name: "${name}") {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, after: $endCursor, since: $since, until: $until) {
                  pageInfo { hasNextPage endCursor }
                  nodes {
                    oid messageHeadline message committedDate
                    author { name email user { login avatarUrl } }
                    additions deletions changedFiles
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      type CommitSearchResult = z.infer<typeof RawCommitSchema>;

      const commits = await this.paginateGraphQL<CommitSearchResult>(
        query,
        { since: startDate, until: endDate },
        (data) => {
          const repoData =
            data.data as GitHubRepositoryResponse<CommitSearchResult>;
          return {
            nodes: repoData.repository.defaultBranchRef.target.history.nodes,
            pageInfo:
              repoData.repository.defaultBranchRef.target.history.pageInfo,
          };
        },
        "Commit",
      );

      const validatedCommits = commits
        .map((commit) => {
          try {
            return RawCommitSchema.parse(commit);
          } catch (error) {
            this.logger.error(`Validation error for commit`, {
              error,
              commit,
            });
            return null;
          }
        })
        .filter(isNotNullOrUndefined);

      this.logger.info(
        `Fetched ${validatedCommits.length} commits for ${owner}/${name}`,
      );
      return validatedCommits;
    } catch (error) {
      this.logger.error("Failed to fetch commits", { error });
      throw error;
    }
  }

  private async executeREST<T>(
    endpoint: string,
    options: { headers?: Record<string, string> } = {},
  ): Promise<T> {
    await this.checkRateLimit();
    await this.checkSecondaryRateLimits(1); // REST API calls cost 1 point

    this.concurrentRequests++;

    try {
      return await pRetry(
        async () => {
          try {
            const url = endpoint.startsWith("http")
              ? endpoint
              : `https://api.github.com${endpoint}`;

            const response = await axios.get(url, {
              headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github.v3+json",
                ...options.headers,
              },
            });

            this.rateLimitInfo = this.parseRateLimitHeaders(response.headers);
            this.logger.debug("Rate limit status", {
              remaining: this.rateLimitInfo.remaining,
              resetAt: this.rateLimitInfo.resetAt,
              pointsRemaining: Math.floor(this.pointsBucket.tokens),
              concurrentRemaining: Math.floor(this.concurrentBucket.tokens),
            });

            return response.data;
          } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.response) {
              this.rateLimitInfo = this.parseRateLimitHeaders(
                axiosError.response.headers as Record<string, string>,
              );

              const status = axiosError.response.status;
              const retryAfter = axiosError.response.headers["retry-after"];
              const message =
                (axiosError.response.data as Record<string, string>)?.message ||
                "";

              if (status === 404) {
                // For 404s, don't retry - just return null
                return null;
              }
              this.logger.warn(`REST API Error`, {
                data: axiosError.response.data,
              });
              if (status === 403 && message.includes("secondary rate limit")) {
                const waitTime = retryAfter
                  ? parseInt(retryAfter, 10) * 1000
                  : this.retryConfig.maxTimeout;
                throw new SecondaryRateLimitError(
                  `Secondary rate limit exceeded: ${message}`,
                  waitTime,
                );
              }

              if (
                status === 403 ||
                (this.rateLimitInfo?.remaining === 0 &&
                  this.rateLimitInfo?.resetAt)
              ) {
                throw new RateLimitExceededError(
                  `Primary rate limit exceeded: ${message}`,
                  this.rateLimitInfo.resetAt,
                );
              }

              throw new Error(
                `GitHub API Error (${status}): ${message || axiosError.message}`,
              );
            }
            throw error; // Rethrow non-Axios errors
          }
        },
        {
          retries: this.retryConfig.maxRetries,
          minTimeout: this.retryConfig.minTimeout,
          maxTimeout: this.retryConfig.maxTimeout,
          factor: this.retryConfig.factor,
          randomize: true,
          onFailedAttempt: async (error) => {
            this.logger.warn(
              `REST API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left`,
              { error: error.message },
            );

            if (error instanceof RateLimitExceededError) {
              await this.wait(error.resetAt.getTime() - Date.now() + 1000);
              throw new AbortError(error.message);
            }

            if (error instanceof SecondaryRateLimitError) {
              await this.wait(error.waitTime);
            }
          },
        },
      );
    } finally {
      this.concurrentRequests--;
    }
  }

  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<{ content: string; sha: string } | null> {
    try {
      const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
      const response = await this.executeREST<{
        content: string;
        sha: string;
        encoding: string;
      }>(endpoint);

      if (!response) {
        this.logger.warn(`File not found: ${owner}/${repo}/${path}`);
        return null;
      }

      return {
        content: response.content,
        sha: response.sha,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch file content for ${owner}/${repo}/${path}`,
        { error },
      );
      return null;
    }
  }
}

export const githubClient = new GitHubClient();
