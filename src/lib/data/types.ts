import { z } from "zod";

export const CommitSchema = z.object({
  sha: z.string(),
  message: z.string().optional().default(""),
  created_at: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changed_files: z.number().default(0),
});

export const CommentSchema = z.object({
  id: z.string().optional(),
  author: z.string(),
  body: z.string().nullable().optional(),
  reactions: z.array(z.string()).optional(),
});

export const PullRequestFileSchema = z.object({
  path: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
});

export const PullRequestReviewSchema = z.object({
  author: z.string(),
  state: z.string(),
  body: z.string().nullable().optional(),
});

export const PullRequestSchema = z.object({
  number: z.number(),
  title: z.string().optional().default(""),
  state: z.string().optional().default("open"),
  merged: z.boolean().optional().default(false),
  created_at: z.string(),
  updated_at: z.string().optional(),
  body: z.string().nullable().optional(),
  files: z.array(PullRequestFileSchema).optional(),
  reviews: z.array(PullRequestReviewSchema).optional(),
  comments: z.array(CommentSchema).optional(),
});

export const IssueLabelSchema = z.object({
  name: z.string(),
  color: z.string().optional().default(""),
  description: z.string().nullable().optional(),
});

export const IssueSchema = z.object({
  id: z.string().optional(),
  number: z.number(),
  title: z.string().optional().default(""),
  body: z.string().nullable().optional(),
  state: z
    .string()
    .transform((s) => s.toLowerCase())
    .optional()
    .default("open"),
  created_at: z.string(),
  updated_at: z.string(),
  author: z
    .object({
      login: z.string(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
  labels: z.array(IssueLabelSchema).optional(),
  comments: z.array(CommentSchema).optional(),
});

export const ContributorActivityCodeSchema = z.object({
  total_commits: z.number().default(0),
  total_prs: z.number().default(0),
  commits: z.array(CommitSchema).optional(),
  pull_requests: z.array(PullRequestSchema).optional(),
});

export const ContributorActivityIssuesSchema = z.object({
  total_opened: z.number().default(0),
  opened: z.array(IssueSchema).optional(),
});

export const ContributorActivityEngagementSchema = z.object({
  total_comments: z.number().default(0),
  total_reviews: z.number().default(0),
  comments: z.array(CommentSchema).optional(),
  reviews: z.array(PullRequestReviewSchema).optional(),
});

export const ContributorDataSchema = z.object({
  contributor: z.string(),
  score: z.number().default(0),
  summary: z.string().optional().default(""),
  avatar_url: z.string().nullable().optional(),
  activity: z.object({
    code: ContributorActivityCodeSchema,
    issues: ContributorActivityIssuesSchema.optional(),
    engagement: ContributorActivityEngagementSchema.optional(),
  }),
});

export const TagLevelSchema = z.object({
  level: z.number().default(0),
  progress: z.number().default(0),
  points: z.number().default(0),
  points_next_level: z.number().default(0),
});

export const AnalysisStatsSchema = z.object({
  total_prs: z.number().default(0),
  merged_prs: z.number().default(0),
  closed_prs: z.number().default(0),
  total_files: z.number().default(0),
  total_additions: z.number().default(0),
  total_deletions: z.number().default(0),
  files_by_type: z.record(z.string(), z.number()).default({}),
  prs_by_month: z.record(z.string(), z.number()).default({}),
});

export const AnalysisDataSchema = z.object({
  username: z.string(),
  tag_scores: z.record(z.string(), z.number()).default({}),
  tag_levels: z.record(z.string(), TagLevelSchema).default({}),
  tags: z.array(z.string()).default([]),
  stats: AnalysisStatsSchema,
  focus_areas: z.array(z.tuple([z.string(), z.number()])).default([]),
});

export type ContributorData = z.infer<typeof ContributorDataSchema>;
export type AnalysisData = z.infer<typeof AnalysisDataSchema>;
