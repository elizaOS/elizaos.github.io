import { RepoPipelineContext } from "../types";

export interface RepositorySummaryPipelineContext extends RepoPipelineContext {
  outputDir: string;
}

/**
 * Creates a repository summary pipeline context
 */
export function createRepositorySummaryPipelineContext(params: {
  repoId?: string;
  dateRange?: RepositorySummaryPipelineContext["dateRange"];
  outputDir: string;
  logger?: RepositorySummaryPipelineContext["logger"];
  config: RepositorySummaryPipelineContext["config"];
}): RepositorySummaryPipelineContext {
  const { repoId, dateRange, outputDir, logger: parentLogger, config } = params;

  // Use parent logger if provided, creating a child logger for RepositorySummary
  const logger = parentLogger
    ? parentLogger.child("RepositorySummary")
    : undefined;

  return {
    repoId,
    dateRange,
    outputDir,
    logger,
    config,
  };
}
