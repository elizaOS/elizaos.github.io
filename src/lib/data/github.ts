import { Logger, createLogger } from "@/lib/logger";
import axios, { AxiosError, RawAxiosResponseHeaders } from "axios";
import pRetry, { AbortError } from "p-retry";
import { RawPullRequestSchema, RawIssueSchema, RawCommitSchema } from "./types";
import { RepositoryConfig } from "@/lib/pipelines/pipelineConfig";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { z } from "zod";

const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string(),
  gravatar_id: z.string().nullable(),
  url: z.string(),
  html_url: z.string(),
  followers_url: z.string(),
  following_url: z.string(),
  gists_url: z.string(),
  starred_url: z.string(),
  subscriptions_url: z.string(),
  organizations_url: z.string(),
  repos_url: z.string(),
  events_url: z.string(),
  received_events_url: z.string(),
  type: z.string(),
  site_admin: z.boolean(),
  name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  blog: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  hireable: z.boolean().nullable().optional(),
  bio: z.string().nullable().optional(),
  twitter_username: z.string().nullable().optional(),
  public_repos: z.number(),
  public_gists: z.number(),
  followers: z.number(),
  following: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  private_gists: z.number().optional(),
  total_private_repos: z.number().optional(),
  owned_private_repos: z.number().optional(),
  disk_usage: z.number().optional(),
  collaborators: z.number().optional(),
  two_factor_authentication: z.boolean().optional(),
  plan: z
    .object({
      name: z.string(),
      space: z.number(),
      collaborators: z.number(),
      private_repos: z.number(),
    })
    .optional(),
});
export type GitHubUser = z.infer<typeof GitHubUserSchema>;

const GitHubRepoOwnerSchema = z.object({
  login: z.string(),
  id: z.number(),
});
export type GitHubRepoOwner = z.infer<typeof GitHubRepoOwnerSchema>;

const GitHubRepoSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: GitHubRepoOwnerSchema,
  html_url: z.string(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string(),
  default_branch: z.string(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  language: z.string().nullable(),
});
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

const GitHubFileContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number(),
  url: z.string(),
  html_url: z.string(),
  git_url: z.string(),
  download_url: z.string().nullable(),
  type: z.enum(["file", "dir", "symlink", "submodule"]),
  content: z.string(), // Base64 encoded content
  encoding: z.literal("base64"),
  _links: z.object({
    self: z.string(),
    git: z.string(),
    html: z.string(),
  }),
});
export type GitHubFileContent = z.infer<typeof GitHubFileContentSchema>;

const UpdateFileResponseSchema = z.object({
  content: z.object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
  }),
  commit: z.object({
    sha: z.string(),
    message: z.string(),
  }),
});
export type UpdateFileResponse = z.infer<typeof UpdateFileResponseSchema>;

export interface BatchFileContentResult {
  content: string | null;
  repoExists: boolean;
  fileExists: boolean;
}

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

// Rate limit type detection and handling
export interface RateLimitType {
  type: "primary" | "secondary";
  waitTime: number;
  strategy: "wait" | "backoff" | "reduce_load";
}

// Adaptive concurrency management
export interface ConcurrencyManager {
  currentLevel: number;
  maxLevel: number;
  minLevel: number;
  lastSuccessTime: number;
  lastRateLimitTime: number;
  reduceOnSecondaryLimit(): number;
  increaseOnSuccess(): number;
  getCurrentLevel(): number;
  shouldReduceLoad(): boolean;
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

// Implementation of adaptive concurrency manager
class AdaptiveConcurrencyManager implements ConcurrencyManager {
  currentLevel: number;
  maxLevel: number;
  minLevel: number;
  lastSuccessTime: number;
  lastRateLimitTime: number;

  constructor(
    initialLevel: number = 5,
    maxLevel: number = 8,
    minLevel: number = 3,
  ) {
    this.currentLevel = initialLevel;
    this.maxLevel = maxLevel;
    this.minLevel = minLevel;
    this.lastSuccessTime = Date.now();
    this.lastRateLimitTime = 0;
  }

  reduceOnSecondaryLimit(): number {
    this.lastRateLimitTime = Date.now();
    // Reduce concurrency by half on secondary rate limit
    this.currentLevel = Math.max(
      this.minLevel,
      Math.floor(this.currentLevel / 2),
    );
    return this.currentLevel;
  }

  increaseOnSuccess(): number {
    this.lastSuccessTime = Date.now();
    // Only increase if we haven't been rate limited recently (last 2 minutes)
    const timeSinceRateLimit = Date.now() - this.lastRateLimitTime;
    if (timeSinceRateLimit > 120000 && this.currentLevel < this.maxLevel) {
      this.currentLevel = Math.min(this.maxLevel, this.currentLevel + 1);
    }
    return this.currentLevel;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  shouldReduceLoad(): boolean {
    // If we've been rate limited within the last 5 minutes, reduce load
    return Date.now() - this.lastRateLimitTime < 300000;
  }
}

// Enhanced rate limit error parsing
function parseRateLimitError(error: unknown): RateLimitType {
  const axiosError = error as {
    response?: {
      data?: { message?: string };
      status?: number;
      headers?: Record<string, string>;
    };
    message?: string;
  };
  const message =
    axiosError?.response?.data?.message || axiosError?.message || "";
  const status = axiosError?.response?.status || 0;

  if (
    status === 403 &&
    message.toLowerCase().includes("secondary rate limit")
  ) {
    // Secondary rate limit - shorter wait time, reduce load strategy
    const retryAfter = axiosError?.response?.headers?.["retry-after"];
    const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 900000; // Default 15 minutes

    return {
      type: "secondary",
      waitTime: Math.min(waitTime, 900000), // Cap at 15 minutes
      strategy: "reduce_load",
    };
  } else if (status === 403 || message.toLowerCase().includes("rate limit")) {
    // Primary rate limit - longer wait time, wait strategy
    const rateLimitReset = axiosError?.response?.headers?.["x-ratelimit-reset"];
    let waitTime = 3600000; // Default 1 hour

    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset, 10) * 1000;
      waitTime = Math.max(0, resetTime - Date.now()) + 60000; // Add 1 minute buffer
    }

    return {
      type: "primary",
      waitTime,
      strategy: "wait",
    };
  }

  // Default to secondary rate limit handling for unknown errors
  return {
    type: "secondary",
    waitTime: 60000, // 1 minute default
    strategy: "backoff",
  };
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
  private concurrencyManager: AdaptiveConcurrencyManager;

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

  constructor(token: string, logger?: Logger) {
    this.logger =
      logger || createLogger({ minLevel: "info", nameSegments: ["GitHub"] });

    const githubToken = token;
    if (!githubToken) {
      throw new Error("GitHub token is required");
    }
    this.token = githubToken;
    this.concurrencyManager = new AdaptiveConcurrencyManager();

    // Set up axios defaults
    axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
    axios.defaults.headers.common["Content-Type"] = "application/json";
  }

  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public method to get current concurrency level for pipeline use
  getConcurrencyManager(): ConcurrencyManager {
    return this.concurrencyManager;
  }

  // Method to handle rate limit errors with enhanced detection
  private handleRateLimitError(error: unknown): void {
    const rateLimitType = parseRateLimitError(error);

    if (rateLimitType.type === "secondary") {
      this.concurrencyManager.reduceOnSecondaryLimit();
      this.logger.warn(
        `Secondary rate limit detected. Reduced concurrency to ${this.concurrencyManager.getCurrentLevel()}`,
        {
          waitTime: rateLimitType.waitTime,
          strategy: rateLimitType.strategy,
        },
      );
    } else {
      this.logger.warn(
        `Primary rate limit detected. Wait time: ${rateLimitType.waitTime}ms`,
        {
          strategy: rateLimitType.strategy,
        },
      );
    }
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

    return await pRetry(
      async () => {
        try {
          const response = await axios.post("https://api.github.com/graphql", {
            query,
            variables,
          });

          this.rateLimitInfo = this.parseRateLimitHeaders(response.headers);
          this.logger.debug("Rate limit status", {
            remaining: this.rateLimitInfo.remaining,
            resetAt: this.rateLimitInfo.resetAt,
            pointsRemaining: Math.floor(this.pointsBucket.tokens),
            concurrentRemaining: Math.floor(this.concurrentBucket.tokens),
          });

          const data = response.data;
          if (data?.errors?.length > 0) {
            const ignorableErrorTypes = ["NOT_FOUND"];

            const ignorableErrors = data.errors.filter(
              (e: { type: string; message: string }) =>
                ignorableErrorTypes.includes(e.type),
            );

            if (ignorableErrors.length > 0) {
              this.logger.debug("GraphQL query contained ignorable errors", {
                errors: ignorableErrors.map(
                  (e: { message: string }) => e.message,
                ),
              });
            }

            const criticalErrors = data.errors.filter(
              (e: { type: string; message: string }) =>
                !ignorableErrorTypes.includes(e.type),
            );

            if (criticalErrors.length > 0) {
              const errorMsg = criticalErrors
                .map((e: { message: string }) => e.message)
                .join(", ");
              throw new Error(`GraphQL Errors: ${errorMsg}`);
            }
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
            const message =
              (axiosError.response.data as Record<string, string>)?.message ||
              "";

            if (status === 403 && message.includes("secondary rate limit")) {
              this.handleRateLimitError(axiosError);
              const rateLimitType = parseRateLimitError(axiosError);
              throw new SecondaryRateLimitError(
                `Secondary rate limit exceeded: ${message}`,
                rateLimitType.waitTime,
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

  async getAuthenticatedUser() {
    const userData = await this.executeRequest("GET", "/user");
    return GitHubUserSchema.parse(userData);
  }

  async getRepo(owner: string, repoName: string) {
    const repoData = await this.executeRequest(
      "GET",
      `/repos/${owner}/${repoName}`,
    );
    if (!repoData) return null;
    return GitHubRepoSchema.parse(repoData);
  }

  async createRepo(
    repoName: string,
    description: string,
    autoInit: boolean = true,
  ) {
    const repoData = await this.executeRequest("POST", "/user/repos", {
      name: repoName,
      description: description,
      auto_init: autoInit,
      private: false,
    });
    return GitHubRepoSchema.parse(repoData);
  }

  async updateFile(
    owner: string,
    repoName: string,
    filePath: string,
    message: string,
    content: string, // Plain text content
    sha?: string,
  ) {
    const utf8Bytes = new TextEncoder().encode(content);
    const binaryString = String.fromCharCode(...Array.from(utf8Bytes));
    const encodedContent = btoa(binaryString);

    const body: { message: string; content: string; sha?: string } = {
      message,
      content: encodedContent,
    };

    if (sha) {
      body.sha = sha;
    }

    const responseData = await this.executeRequest(
      "PUT",
      `/repos/${owner}/${repoName}/contents/${filePath}`,
      body,
    );
    return UpdateFileResponseSchema.parse(responseData);
  }

  async fetchPullRequests(
    repository: RepositoryConfig,
    options: FetchOptions = {},
  ) {
    const { owner, name } = repository;
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
    const { owner, name } = repository;
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
    const { owner, name } = repository;
    const { startDate, endDate } = options;

    const since = startDate ? new Date(startDate).toISOString() : undefined;
    const until = endDate ? new Date(endDate).toISOString() : undefined;

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
                    author { name email date user { login avatarUrl } }
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
        { since, until },
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

  async batchFetchFileContents(
    requests: { owner: string; repo: string; path: string }[],
  ): Promise<BatchFileContentResult[]> {
    if (requests.length === 0) {
      return [];
    }
    if (requests.length > 100) {
      this.logger.warn(
        "Batch size is large, consider splitting into smaller chunks if queries fail.",
      );
    }

    const queryParts = requests.map((req, i) => {
      const alias = `repo${i}`;
      return `
        ${alias}: repository(owner: "${req.owner}", name: "${req.repo}") {
          file: object(expression: "HEAD:${req.path}") {
            ... on Blob {
              text
            }
          }
        }
      `;
    });

    const query = `query { ${queryParts.join("\n")} }`;

    type GraphQLBatchResponse = {
      data: {
        [key: string]: {
          file: {
            text: string;
          } | null;
        } | null;
      } | null;
      errors?: { message: string }[];
    };

    try {
      const result = await this.executeGraphQL<GraphQLBatchResponse>(query);
      const contents: BatchFileContentResult[] = [];
      for (let i = 0; i < requests.length; i++) {
        const alias = `repo${i}`;
        const repoData = result.data ? result.data[alias] : null;

        if (repoData) {
          if (repoData.file && "text" in repoData.file) {
            contents.push({
              content: repoData.file.text,
              repoExists: true,
              fileExists: true,
            });
          } else {
            contents.push({
              content: null,
              repoExists: true,
              fileExists: false,
            });
          }
        } else {
          contents.push({
            content: null,
            repoExists: false,
            fileExists: false,
          });
        }
      }
      return contents;
    } catch (error) {
      this.logger.error("Failed to batch fetch file contents", { error });
      return requests.map(() => ({
        content: null,
        repoExists: false,
        fileExists: false,
      }));
    }
  }

  private async executeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    body?: Record<string, unknown>,
    options: { headers?: Record<string, string> } = {},
  ): Promise<T> {
    await this.checkRateLimit();
    await this.checkSecondaryRateLimits(1); // REST API calls cost 1 point

    return await pRetry(
      async () => {
        try {
          const url = endpoint.startsWith("http")
            ? endpoint
            : `https://api.github.com${endpoint}`;

          const response = await axios({
            method,
            url,
            data: body,
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

          if (response.status === 204) {
            return null as T;
          }

          return response.data as T;
        } catch (error) {
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            this.rateLimitInfo = this.parseRateLimitHeaders(
              axiosError.response.headers as Record<string, string>,
            );

            const status = axiosError.response.status;
            const message =
              (axiosError.response.data as Record<string, string>)?.message ||
              "";

            if (status === 404) {
              // For 404s, don't retry - just return null
              return null as T;
            }
            this.logger.warn(`REST API Error`, {
              data: axiosError.response.data,
            });
            if (status === 403 && message.includes("secondary rate limit")) {
              this.handleRateLimitError(axiosError);
              const rateLimitType = parseRateLimitError(axiosError);
              throw new SecondaryRateLimitError(
                `Secondary rate limit exceeded: ${message}`,
                rateLimitType.waitTime,
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
  }

  async fetchFileContent(owner: string, repo: string, path: string) {
    try {
      const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
      const response = await this.executeRequest("GET", endpoint);

      if (!response) {
        this.logger.warn(`File not found: ${owner}/${repo}/${path}`);
        return null;
      }

      return GitHubFileContentSchema.parse(response);
    } catch (error) {
      this.logger.error(
        `Failed to fetch file content for ${owner}/${repo}/${path}`,
        { error },
      );
      return null;
    }
  }
}
