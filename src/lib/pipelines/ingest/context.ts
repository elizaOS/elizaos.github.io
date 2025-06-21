import { RepoPipelineContext } from "../types";
import { GitHubClient } from "@/lib/data/github";
import { Logger } from "@/lib/logger";
import { PipelineConfig } from "../pipelineConfig";
import { DateRange } from "@/lib/date-utils";

/**
 * Context for ingestion pipeline operations
 */
export interface IngestionPipelineContext extends RepoPipelineContext {
  /** GitHub client for API requests */
  github: GitHubClient;
  /** Flag to force fetch data regardless of lastFetched timestamp */
  force: boolean;
}

interface CreateIngestionContextOptions {
  repoId: string | undefined;
  logger: Logger;
  config: PipelineConfig;
  dateRange: DateRange;
  force: boolean;
  githubToken: string;
}

/**
 * Create a context for ingestion pipeline
 */
export function createIngestionContext({
  repoId,
  logger,
  config,
  dateRange,
  force = false,
  githubToken,
}: CreateIngestionContextOptions): IngestionPipelineContext {
  // Create a GitHub client with the provided logger or a child logger
  const githubLogger = logger?.child("GitHub");
  const github = new GitHubClient(githubToken, githubLogger);

  return {
    config,
    logger,
    github,
    repoId,
    dateRange,
    force,
  };
}
