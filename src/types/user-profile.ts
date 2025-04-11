export interface TagLevel {
  level: number;
  progress: number;
  points: number;
  points_next_level: number;
}

export interface UserStats {
  total_prs: number;
  merged_prs: number;
  closed_prs: number;
  total_files: number;
  total_additions: number;
  total_deletions: number;
  files_by_type: Record<string, number>;
  prs_by_month: Record<string, number>;
}

export interface UserFocusAreaData {
  username: string;
  tag_scores: Record<string, number>;
  tag_levels: Record<string, TagLevel>;
  tags: string[];
  stats: UserStats;
  focus_areas: [string, number][];
  summary: string;
  score?: number;
  avatarUrl?: string | null;
}

export type LeaderboardPeriod = "all" | "weekly" | "monthly";
