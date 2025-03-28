import { exec } from "child_process";
import { promisify } from "util";
import {
  RepositoryConfig,
  RawPullRequestSchema,
  RawIssueSchema,
  RawCommitSchema,
  RawPRReviewSchema,
  RawCommentSchema,
  RawPRFileSchema,
} from "./types";

const execAsync = promisify(exec);

interface FetchOptions {
  days?: number;
  since?: string;
  until?: string;
}

/**
 * GitHub GraphQL client using the 'gh' CLI tool
 */
export class GitHubClient {
  private logPrefix = "[GitHubClient]";

  /**
   * Execute a GraphQL query via the GitHub CLI
   */
  private async executeGraphQL(
    query: string,
    variables: Record<string, any> = {}
  ) {
    try {
      const command = `gh api graphql -f query='${query}' ${Object.entries(
        variables
      )
        .map(([key, value]) => `-f ${key}='${value}'`)
        .join(" ")}`;

      console.log(`${this.logPrefix} Executing GraphQL query`);

      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error: unknown) {
      console.error(`${this.logPrefix} GraphQL query failed:`, error);
      throw new Error(
        `GraphQL query failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Execute a REST API call via the GitHub CLI
   */
  private async executeREST(path: string) {
    try {
      const command = `gh api ${path}`;

      console.log(`${this.logPrefix} Executing REST API call: ${path}`);

      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error: unknown) {
      console.error(`${this.logPrefix} REST API call failed:`, error);
      throw new Error(
        `REST API call failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch pull requests with GraphQL
   */
  async fetchPullRequests(
    repository: RepositoryConfig,
    options: FetchOptions = {}
  ) {
    const { owner, name } = repository;
    const { days, since, until } = options;

    console.log(`${this.logPrefix} Fetching PRs for ${owner}/${name}`);

    // Calculate filter dates for client-side filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (since) {
      startDate = new Date(since);
    } else if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    if (until) {
      endDate = new Date(until);
    }

    const query = `
      query($endCursor: String) {
        repository(owner: "${owner}", name: "${name}") {
          pullRequests(
            first: 50,
            after: $endCursor,
            orderBy: {field: CREATED_AT, direction: DESC}
            states: [OPEN, CLOSED, MERGED]
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
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
        const variables: Record<string, string> = {};
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        const response = await this.executeGraphQL(query, variables);

        const pullRequests = response.data.repository.pullRequests;
        allPullRequests = [...allPullRequests, ...pullRequests.nodes];

        hasNextPage = pullRequests.pageInfo.hasNextPage;
        endCursor = pullRequests.pageInfo.endCursor;

        // If we have date filters and already have some results,
        // check if we've gone past our start date to avoid fetching too much
        if (startDate && allPullRequests.length > 0) {
          const oldestPR = allPullRequests[allPullRequests.length - 1];
          if (new Date(oldestPR.createdAt) < startDate) {
            // We've gone far enough back
            hasNextPage = false;
          }
        }
      }

      // Apply date filters client-side
      let filteredPRs = allPullRequests;
      if (startDate || endDate) {
        filteredPRs = allPullRequests.filter((pr) => {
          const createdAt = new Date(pr.createdAt);
          const matchesStart = !startDate || createdAt >= startDate;
          const matchesEnd = !endDate || createdAt <= endDate;
          return matchesStart && matchesEnd;
        });
      }

      // Validate each PR with Zod schema
      const validatedPRs = filteredPRs.map((pr) => {
        try {
          return RawPullRequestSchema.parse(pr);
        } catch (error) {
          console.error(
            `${this.logPrefix} Validation error for PR #${pr.number}:`,
            error
          );
        }
      });

      console.log(
        `${this.logPrefix} Fetched ${validatedPRs.length} PRs for ${owner}/${name}`
      );
      return validatedPRs;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching PRs:`, error);
      return [];
    }
  }

  /**
   * Fetch issues with GraphQL
   */
  async fetchIssues(repository: RepositoryConfig, options: FetchOptions = {}) {
    const { owner, name } = repository;
    const { days, since, until } = options;

    console.log(`${this.logPrefix} Fetching issues for ${owner}/${name}`);

    // Calculate filter dates for client-side filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (since) {
      startDate = new Date(since);
    } else if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    if (until) {
      endDate = new Date(until);
    }

    const query = `
      query($endCursor: String) {
        repository(owner: "${owner}", name: "${name}") {
          issues(
            first: 100,
            after: $endCursor,
            orderBy: {field: CREATED_AT, direction: DESC}
            states: [OPEN, CLOSED]
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
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

      // Paginate through all results
      while (hasNextPage) {
        const variables: Record<string, string> = {};
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        const response = await this.executeGraphQL(query, variables);

        const issues = response.data.repository.issues;
        allIssues = [...allIssues, ...issues.nodes];

        hasNextPage = issues.pageInfo.hasNextPage;
        endCursor = issues.pageInfo.endCursor;

        // If we have date filters and already have some results,
        // check if we've gone past our start date to avoid fetching too much
        if (startDate && allIssues.length > 0) {
          const oldestIssue = allIssues[allIssues.length - 1];
          if (new Date(oldestIssue.createdAt) < startDate) {
            // We've gone far enough back
            hasNextPage = false;
          }
        }
      }

      // Apply date filters client-side
      let filteredIssues = allIssues;
      if (startDate || endDate) {
        filteredIssues = allIssues.filter((issue) => {
          const createdAt = new Date(issue.createdAt);
          const matchesStart = !startDate || createdAt >= startDate;
          const matchesEnd = !endDate || createdAt <= endDate;
          return matchesStart && matchesEnd;
        });
      }

      // Validate each issue with Zod schema
      const validatedIssues = filteredIssues.map((issue) => {
        try {
          return RawIssueSchema.parse(issue);
        } catch (error) {
          console.error(
            `${this.logPrefix} Validation error for Issue #${issue.number}:`,
            error
          );
        }
      });

      console.log(
        `${this.logPrefix} Fetched ${validatedIssues.length} issues for ${owner}/${name}`
      );
      return validatedIssues;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching issues:`, error);
      return [];
    }
  }

  /**
   * Fetch commits with GraphQL
   */
  async fetchCommits(repository: RepositoryConfig, options: FetchOptions = {}) {
    const { owner, name } = repository;
    const { days, since, until } = options;

    console.log(`${this.logPrefix} Fetching commits for ${owner}/${name}`);

    // Calculate filter dates for client-side filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (since) {
      startDate = new Date(since);
    } else if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    if (until) {
      endDate = new Date(until);
    }

    const query = `
      query($endCursor: String) {
        repository(owner: "${owner}", name: "${name}") {
          defaultBranchRef {
            target {
              ... on Commit {
                history(
                  first: 100,
                  after: $endCursor
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
        const variables: Record<string, string> = {};
        if (endCursor) {
          variables.endCursor = endCursor;
        }

        const response = await this.executeGraphQL(query, variables);

        const history =
          response.data.repository.defaultBranchRef.target.history;
        allCommits = [...allCommits, ...history.nodes];

        hasNextPage = history.pageInfo.hasNextPage;
        endCursor = history.pageInfo.endCursor;

        // If we have date filters and already have some results,
        // check if we've gone past our start date to avoid fetching too much
        if (startDate && allCommits.length > 0) {
          const oldestCommit = allCommits[allCommits.length - 1];
          if (new Date(oldestCommit.committedDate) < startDate) {
            // We've gone far enough back
            hasNextPage = false;
          }
        }
      }

      // Apply date filters client-side
      let filteredCommits = allCommits;
      if (startDate || endDate) {
        filteredCommits = allCommits.filter((commit) => {
          const committedDate = new Date(commit.committedDate);
          const matchesStart = !startDate || committedDate >= startDate;
          const matchesEnd = !endDate || committedDate <= endDate;
          return matchesStart && matchesEnd;
        });
      }

      // Validate each commit with Zod schema
      const validatedCommits = filteredCommits.map((commit) => {
        try {
          return RawCommitSchema.parse(commit);
        } catch (error) {
          console.error(
            `${this.logPrefix} Validation error for commit ${commit.oid}:`,
            error
          );
        }
      });

      console.log(
        `${this.logPrefix} Fetched ${validatedCommits.length} commits for ${owner}/${name}`
      );
      return validatedCommits;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching commits:`, error);
      return [];
    }
  }
}

// Export a singleton instance
export const githubClient = new GitHubClient();
