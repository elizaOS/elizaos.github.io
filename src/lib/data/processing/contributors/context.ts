import { PipelineConfig } from "../../pipelineConfig";
import { Logger } from "../logger";
import { RepoPipelineContext } from "../types";

export interface ContributorPipelineContext extends RepoPipelineContext {}
/**
 * Creates a repository pipeline context
 */
export function createContributorPipelineContext(params: {
  repoId?: string;
  dateRange?: ContributorPipelineContext["dateRange"];
  logger?: Logger;
  config: PipelineConfig;
}): ContributorPipelineContext {
  const { repoId, dateRange, logger: parentLogger, config } = params;

  // Use parent logger if provided, creating a child logger for Contributors
  const logger = parentLogger ? parentLogger.child("Contributors") : undefined;

  return {
    repoId,
    dateRange,
    logger,
    config,
  };
}
