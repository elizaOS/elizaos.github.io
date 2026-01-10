import { PipelineConfig } from "@/lib/pipelines/pipelineConfig";
import { Logger } from "@/lib/logger";
import { RepoPipelineContext } from "@/lib/pipelines/types";
import { AISummaryConfig } from "./config";
import { IntervalType } from "@/lib/date-utils";

/**
 * Pipeline context for contributor and project summaries
 */
export interface SummarizerPipelineContext extends RepoPipelineContext {
  /** Output directory for summary files */
  outputDir: string;
  /** AI summary configuration */
  aiSummaryConfig: AISummaryConfig;
  /** Logger instance */
  logger?: Logger;
  /** Whether to overwrite existing summaries */
  overwrite?: boolean;
  /** Date range for filtering data */
  dateRange: { startDate: string; endDate?: string };
  /** Which interval types are enabled for summary generation */
  enabledIntervals: Record<IntervalType | "lifetime", boolean>;
  /** Filter to a specific username (for testing) */
  usernameFilter?: string;
}

interface CreateContributorSummaryContextOptions {
  repoId?: string;
  config: PipelineConfig;
  logger?: Logger;
  outputDir: string;
  aiSummaryConfig: AISummaryConfig;
  overwrite?: boolean;
  dateRange: { startDate: string; endDate?: string };
  enabledIntervals: Record<IntervalType | "lifetime", boolean>;
  usernameFilter?: string;
}

/**
 * Create a context for contributor summary pipelines
 */
export function createSummarizerContext(
  options: CreateContributorSummaryContextOptions,
): SummarizerPipelineContext {
  return {
    ...options,
  };
}
