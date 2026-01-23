import { z } from "zod";
import { AISummaryConfigSchema } from "./summarize/config";

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
    closingIssueBonus: z.number().default(4),
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
  reaction: z.object({
    base: z.number().default(0.2),
    received: z.number().default(0.1),
    types: z.record(z.string(), z.number()).default({
      thumbs_up: 1.0,
      thumbs_down: 0.5,
      laugh: 1.0,
      hooray: 1.5,
      confused: 0.5,
      heart: 1.5,
      rocket: 1.2,
      eyes: 1.0,
    }),
    maxPerDay: z.number().default(20),
    diminishingReturns: z.number().default(0.8),
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

export const UntrackedReposConfigSchema = z.object({
  enabled: z.boolean().default(false),
  organizations: z.array(z.string()),
  refreshIntervalDays: z.number().default(7),
  excludeArchived: z.boolean().default(true),
  excludePatterns: z.array(z.string()).default([]),
});

export const PipelineConfigSchema = z.object({
  contributionStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  repositories: z.array(RepositoryConfigSchema),
  scoring: ScoringConfigSchema,
  tags: z.object({
    area: z.array(TagConfigSchema),
    role: z.array(TagConfigSchema),
    tech: z.array(TagConfigSchema),
  }),
  // List of bot usernames to be ignored during processing
  botUsers: z.array(z.string()).optional(),
  aiSummary: AISummaryConfigSchema,
  walletAddresses: z.object({
    enabled: z.boolean().default(true),
  }),
  untrackedRepos: UntrackedReposConfigSchema.optional(),
});
// Type exports

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type TagConfig = z.infer<typeof TagConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type UntrackedReposConfig = z.infer<typeof UntrackedReposConfigSchema>;
export type ScoringRules = ScoringConfig;
