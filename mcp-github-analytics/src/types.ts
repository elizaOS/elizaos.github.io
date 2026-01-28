/**
 * Type definitions for GitHub Analytics API responses
 * These types match the static JSON API schema
 */

// Leaderboard Types
export interface LeaderboardResponse {
  version: string;
  period: "weekly" | "monthly" | "lifetime";
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalUsers: number;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  characterClass: string;
  tier: string;
  score: number;
  prScore: number;
  issueScore: number;
  reviewScore: number;
  commentScore: number;
  wallets?: {
    ethereum?: string;
    solana?: string;
  };
  focusAreas?: FocusArea[];
  achievements?: Achievement[];
  profile?: ContributorProfile;
  scoreBreakdown?: ScoreBreakdown;
  links?: {
    profile: string;
    profileApi: string;
    summary: string;
    github: string;
  };
}

export interface FocusArea {
  tag: string;
  score: number;
  percentage: number;
  rank: number;
  totalInArea: number;
}

export interface Achievement {
  type: string;
  tier: string;
  earnedAt: string;
}

export interface ContributorProfile {
  contributorType: string;
  prMergeRate: number;
  reviewActivity: string;
}

export interface ScoreBreakdown {
  total: number;
  distribution: {
    prs: { score: number; percentage: number; label: string };
    issues: { score: number; percentage: number; label: string };
    reviews: { score: number; percentage: number; label: string };
    comments: { score: number; percentage: number; label: string };
  };
  tier: string;
  percentile: number;
  characterClass: string;
}

// Profile Types
export interface UserProfileResponse {
  version: string;
  username: string;
  generatedAt: string;
  characterSheet: {
    tier: string;
    characterClass: string;
    percentile: number;
    rank: {
      monthly: number | null;
      weekly: number | null;
      lifetime: number | null;
    };
    scoreBreakdown: ScoreBreakdown;
    focusAreas: FocusArea[];
    achievements?: Achievement[];
    profile?: ContributorProfile;
    wallets?: {
      ethereum?: string;
      solana?: string;
    };
  };
  links: {
    summaries: {
      lifetime: string;
      monthly: string;
      weekly: string;
      daily: string;
    };
    github: string;
    profile: string;
  };
}

// Summary Types
export interface SummaryResponse {
  version: string;
  type: "overall" | "repository" | "contributor";
  interval: "day" | "week" | "month" | "lifetime";
  date: string;
  generatedAt: string;
  sourceLastUpdated: string;
  contentFormat: string;
  contentHash: string;
  entity?: {
    username?: string;
    repoId?: string;
    owner?: string;
    repo?: string;
  };
  content: string;
}

// API Index Types
export interface APIIndexResponse {
  version: string;
  baseUrl: string;
  documentation: string;
  openapi: string;
  endpoints: {
    leaderboard: {
      monthly: string;
      weekly: string;
      lifetime: string;
    };
    profiles: {
      pattern: string;
      example: string;
    };
    summaries: {
      overall: {
        pattern: string;
        intervals: string[];
      };
      contributors: {
        pattern: string;
        intervals: string[];
      };
    };
  };
  capabilities: {
    search: {
      byUsername: boolean;
      byRank: boolean;
      byTier: boolean;
      byFocusArea: boolean;
    };
    intervals: string[];
    characterSystem: {
      tiers: string[];
      classes: string[];
      focusAreas: string[];
    };
  };
}

// Search/Filter Types
export interface SearchFilters {
  tier?: string;
  characterClass?: string;
  focusArea?: string;
  minScore?: number;
  maxRank?: number;
  limit?: number;
}
