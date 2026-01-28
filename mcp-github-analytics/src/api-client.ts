/**
 * API Client for GitHub Analytics static JSON API
 * Handles fetching data from configurable base URL
 */

import type {
  LeaderboardResponse,
  UserProfileResponse,
  SummaryResponse,
  APIIndexResponse,
} from "./types.js";

export class APIClient {
  private baseUrl: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL: number;

  constructor(baseUrl?: string, cacheTTLMs = 5 * 60 * 1000) {
    // Remove trailing slash if present
    this.baseUrl = (
      baseUrl ||
      process.env.MCP_API_BASE_URL ||
      "https://elizaos.github.io"
    ).replace(/\/$/, "");
    this.cacheTTL = cacheTTLMs;
  }

  private async fetchWithCache<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const cached = this.cache.get(url);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} for ${url}`,
      );
    }

    const data = await response.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data as T;
  }

  /**
   * Get API index/capabilities
   */
  async getAPIIndex(): Promise<APIIndexResponse> {
    return this.fetchWithCache<APIIndexResponse>("/api/index.json");
  }

  /**
   * Get leaderboard for specified period
   */
  async getLeaderboard(
    period: "weekly" | "monthly" | "lifetime",
  ): Promise<LeaderboardResponse> {
    return this.fetchWithCache<LeaderboardResponse>(
      `/api/leaderboard-${period}.json`,
    );
  }

  /**
   * Get contributor profile
   */
  async getContributorProfile(username: string): Promise<UserProfileResponse> {
    return this.fetchWithCache<UserProfileResponse>(
      `/api/contributors/${encodeURIComponent(username)}/profile.json`,
    );
  }

  /**
   * Get contributor summary
   */
  async getContributorSummary(
    username: string,
    interval: "day" | "week" | "month" | "lifetime",
  ): Promise<SummaryResponse> {
    const path =
      interval === "lifetime"
        ? `/api/summaries/contributors/${encodeURIComponent(username)}/lifetime.json`
        : `/api/summaries/contributors/${encodeURIComponent(username)}/${interval}/latest.json`;
    return this.fetchWithCache<SummaryResponse>(path);
  }

  /**
   * Get repository summary
   */
  async getRepoSummary(
    owner: string,
    repo: string,
    interval: "day" | "week" | "month",
  ): Promise<SummaryResponse> {
    const repoId = `${owner}_${repo}`;
    return this.fetchWithCache<SummaryResponse>(
      `/api/summaries/repos/${encodeURIComponent(repoId)}/${interval}/latest.json`,
    );
  }

  /**
   * Get overall project summary
   */
  async getOverallSummary(
    interval: "day" | "week" | "month",
  ): Promise<SummaryResponse> {
    return this.fetchWithCache<SummaryResponse>(
      `/api/summaries/overall/${interval}/latest.json`,
    );
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
