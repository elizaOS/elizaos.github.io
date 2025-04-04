import { z } from "zod";

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
  repoId: z
    .string()
    .regex(
      /^[^\/]+\/[^\/]+$/,
      "Repository ID must be in the format 'owner/name'"
    ),
  defaultBranch: z.string().default("main"),
});

export const PipelineConfigSchema = z.object({
  repositories: z.array(RepositoryConfigSchema),
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

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type TagConfig = z.infer<typeof TagConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type ScoringRules = ScoringConfig;
