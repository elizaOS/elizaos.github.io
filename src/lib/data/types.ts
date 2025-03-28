import { z } from "zod";

// GitHub User Schema (matches GraphQL Author type)
export const GithubUserSchema = z.object({
  login: z.string(),
  avatarUrl: z.string().nullable().optional(),
});

// GitHub Raw Data Schemas
export const RawCommitSchema = z.object({
  oid: z.string(),
  message: z.string(),
  messageHeadline: z.string().optional(),
  committedDate: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
    date: z.string(),
    user: GithubUserSchema.nullable().optional(),
  }),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changedFiles: z.number().default(0),
});

export const RawPRFileSchema = z.object({
  path: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changeType: z.string().optional(),
});

export const RawPRReviewSchema = z.object({
  id: z.string(),
  state: z.string(),
  body: z.string().nullable().optional(),
  submittedAt: z.string().optional(),
  author: GithubUserSchema.nullable().optional(),
  url: z.string().optional(),
});

export const RawCommentSchema = z.object({
  id: z.string(),
  body: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: GithubUserSchema.nullable().optional(),
  url: z.string().optional(),
});

export const RawLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable().optional(),
});

export const RawPullRequestSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  state: z.string(),
  merged: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  mergedAt: z.string().nullable().optional(),
  headRefOid: z.string(),
  baseRefOid: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changedFiles: z.number().default(0),
  author: GithubUserSchema.nullable().optional(),
  labels: z
    .object({
      nodes: z.array(RawLabelSchema),
    })
    .optional(),
  commits: z
    .object({
      totalCount: z.number(),
      nodes: z.array(
        z.object({
          commit: RawCommitSchema,
        })
      ),
    })
    .optional(),
  reviews: z
    .object({
      nodes: z.array(RawPRReviewSchema),
    })
    .optional(),
  comments: z
    .object({
      nodes: z.array(RawCommentSchema),
    })
    .optional(),
  files: z
    .object({
      nodes: z.array(RawPRFileSchema),
    })
    .optional(),
});

export const RawIssueSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  state: z.string(),
  locked: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  author: GithubUserSchema.nullable().optional(),
  labels: z
    .object({
      nodes: z.array(RawLabelSchema),
    })
    .optional(),
  comments: z
    .object({
      totalCount: z.number(),
      nodes: z.array(RawCommentSchema),
    })
    .optional(),
});

// Processed Data Schemas
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
  created_at: z.string().optional(),
});

export const PullRequestFileSchema = z.object({
  filename: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changes: z.number().optional(),
});

export const PullRequestReviewSchema = z.object({
  id: z.string().optional(),
  author: z.string(),
  state: z.string(),
  body: z.string().nullable().optional(),
  submitted_at: z.string().optional(),
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
  summary: z.string().optional(),
});

// Pipeline configuration schemas
export const ScoringConfigSchema = z.object({
  pullRequest: z.object({
    base: z.number().default(7),
    merged: z.number().default(3),
    perReview: z.number().default(3),
    perApproval: z.number().default(2),
    perComment: z.number().default(0.5),
    descriptionMultiplier: z.number().default(0.006),
    complexityMultiplier: z.number().default(0.5),
    optimalSizeBonus: z.number().default(5),
    maxPerDay: z.number().default(20),
  }),
  issue: z.object({
    base: z.number().default(5),
    perComment: z.number().default(0.5),
    withLabelsMultiplier: z.record(z.string(), z.number()).default({
      bug: 1.5,
      enhancement: 1.2,
      documentation: 1.0,
    }),
    closedBonus: z.number().default(3),
    resolutionSpeedMultiplier: z.number().default(0.8),
  }),
  review: z.object({
    base: z.number().default(2),
    approved: z.number().default(1),
    changesRequested: z.number().default(1.5),
    commented: z.number().default(0.5),
    detailedFeedbackMultiplier: z.number().default(0.006),
    thoroughnessMultiplier: z.number().default(1.2),
    maxPerDay: z.number().default(15),
  }),
  comment: z.object({
    base: z.number().default(0.5),
    substantiveMultiplier: z.number().default(0.006),
    diminishingReturns: z.number().default(0.8),
    maxPerThread: z.number().default(5),
  }),
  codeChange: z.object({
    perLineAddition: z.number().default(0.01),
    perLineDeletion: z.number().default(0.005),
    perFile: z.number().default(0.1),
    maxLines: z.number().default(1000),
    testCoverageBonus: z.number().default(1.5),
  }),
});

export const TagTypeSchema = z.enum(["AREA", "ROLE", "TECH"]);

export const TagConfigSchema = z.object({
  name: z.string(),
  category: TagTypeSchema,
  patterns: z.array(z.string()),
  weight: z.number().default(1.0),
  description: z.string().optional(),
});

export const RepositoryConfigSchema = z.object({
  owner: z.string(),
  name: z.string(),
  defaultBranch: z.string().default("main"),
});

export const PipelineConfigSchema = z.object({
  repositories: z.array(RepositoryConfigSchema),
  lookbackDays: z.number().default(7),
  scoring: ScoringConfigSchema,
  tags: z.object({
    area: z.array(TagConfigSchema),
    role: z.array(TagConfigSchema),
    tech: z.array(TagConfigSchema),
  }),
  // List of bot usernames to be ignored during processing
  botUsers: z.array(z.string()).optional(),
  aiSummary: z
    .object({
      enabled: z.boolean().default(false),
      model: z.enum(["openai", "ollama"]).default("openai"),
      apiKey: z.string().optional(),
      endpoint: z.string().optional(),
    })
    .optional(),
});

// Type exports
export type ContributorData = z.infer<typeof ContributorDataSchema>;
export type AnalysisData = z.infer<typeof AnalysisDataSchema>;
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type TagConfig = z.infer<typeof TagConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type ScoringRules = ScoringConfig;
export type GithubUser = z.infer<typeof GithubUserSchema>;
