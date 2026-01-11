import { z } from "zod";

/**
 * Schema for AI summary configuration
 */
export const AISummaryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  defaultModel: z.string(),
  models: z.object({
    day: z.string(),
    week: z.string(),
    month: z.string(),
    lifetime: z.string().optional(),
  }),
  apiKey: z.string(),
  endpoint: z.string().default("https://openrouter.ai/api/v1/chat/completions"),
  temperature: z.number().default(0.1),
  max_tokens: z.number().default(200),
  projectContext: z.string().default("An open source project on GitHub."),
});

// Inferred type from the schema
export type AISummaryConfig = z.infer<typeof AISummaryConfigSchema>;
