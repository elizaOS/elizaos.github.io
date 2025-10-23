#!/usr/bin/env bun
/**
 * GitHub Contribution Analytics Pipeline
 *
 * This script manages the full lifecycle of GitHub contribution analysis:
 * 1. Fetching data from GitHub using GraphQL API
 * 2. Storing raw data in SQLite database
 * 3. Processing raw data through modular processing steps
 */

import { config as loadEnv } from "dotenv";
import { join } from "path";
import { calculateDateRange } from "@/lib/date-utils";

// Load environment variables from .env file
loadEnv();

// Validate required environment variables
const requiredEnvVars = ["GITHUB_TOKEN", "OPENROUTER_API_KEY"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Error: Missing required environment variables: ${missingEnvVars.join(
      ", ",
    )}`,
  );
  process.exit(1);
}

import { Command } from "@commander-js/extra-typings";
import { PipelineConfigSchema } from "@/lib/pipelines/pipelineConfig";
import chalk from "chalk";
import { generateRepositoryStats } from "@/lib/pipelines/export";
import { contributorsPipeline } from "@/lib/pipelines/contributors";
import {
  repositorySummariesPipeline,
  overallSummariesPipeline,
  contributorSummariesPipeline,
} from "@/lib/pipelines/summarize";
import { createContributorPipelineContext } from "@/lib/pipelines/contributors/context";
import { createRepositoryStatsPipelineContext } from "@/lib/pipelines/export/context";
import { runPipeline } from "@/lib/pipelines/runPipeline";
import { createLogger, LogLevel } from "@/lib/logger";
import { createSummarizerContext } from "@/lib/pipelines/summarize/context";
import { ingestPipeline, createIngestionContext } from "@/lib/pipelines/ingest";

const DEFAULT_CONFIG_PATH = "../config/pipeline.config.ts";
const program = new Command();

program
  .name("analyze-pipeline")
  .description("GitHub Contribution Analytics Pipeline")
  .version("1.0.0");

// Ingest data from GitHub
program
  .command("ingest")
  .description("Ingest data from GitHub API based on configuration")
  .option("-a, --after <date>", "Start date in YYYY-MM-DD format")
  .option(
    "-b, --before <date>",
    "End date in YYYY-MM-DD format (defaults to end of today)",
  )
  .option("-d, --days <number>", "Number of days to look back from before date")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option(
    "-f, --force",
    "Force data ingestion regardless of last fetch time",
    false,
  )
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger with appropriate log level
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "ingest",
          config: options.config,
        },
      });

      // Calculate date range using shared helper
      const dateRange = calculateDateRange({
        after: options.after,
        before: options.before,
        days: options.days || "7",
      });

      rootLogger.info(
        `Fetching data from ${dateRange.startDate || "last fetch time"} to ${dateRange.endDate || "end of time"} using config from ${configPath}`,
      );

      // Create ingestion context with date range
      const context = createIngestionContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        dateRange,
        force: options.force,
        githubToken: process.env.GITHUB_TOKEN!,
      });

      // Run the ingestion pipeline - returns array of { repository, prs, issues }
      await ingestPipeline(undefined, context);

      rootLogger.info("Ingestion completed successfully!");
    } catch (error: unknown) {
      console.error(chalk.red("Error fetching data:"), error);
      process.exit(1);
    }
  });

// Process and analyze data
program
  .command("process")
  .description("Process and analyze data")
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option(
    "-f, --force",
    "Force recalculation of scores even if they already exist",
    false,
  )
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "process",
          config: options.config,
        },
      });
      rootLogger.info(`Processing data using config from ${configPath}`);

      // Create pipeline context with the root logger and force option
      const context = createContributorPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        force: options.force, // Pass through the force option
      });

      // Run the pipeline directly - no need for the ContributorPipeline class
      await runPipeline(
        contributorsPipeline,
        {}, // No input for the root pipeline
        context,
      );

      rootLogger.info("\nProcessing completed successfully!");
    } catch (error: unknown) {
      console.error(chalk.red("Error processing data:"), error);
      process.exit(1);
    }
  });

// Export repository stats
program
  .command("export")
  .description("Generate and export repository stats")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-f, --force", "Recalculate and overwrite existing stats", false)
  .option("--output-dir <dir>", "Output directory for stats", "./data/")
  .option("-a, --after <date>", "Start date in YYYY-MM-DD format")
  .option(
    "-b, --before <date>",
    "End date in YYYY-MM-DD format (defaults to end of today)",
  )
  .option("-d, --days <number>", "Number of days to look back from before date")
  .option("--all", "Process all data since contributionStartDate", false)
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "export",
          config: options.config,
        },
      });
      rootLogger.info(
        `Generating repository stats using config from ${configPath}`,
      );

      // If --all is passed, ensure contributionStartDate is set
      if (options.all) {
        if (!pipelineConfig.contributionStartDate) {
          throw new Error(
            "contributionStartDate must be set in pipeline config when using --all option",
          );
        }
        options.after = pipelineConfig.contributionStartDate;
      }

      // Calculate date range using shared helper
      const dateRange = calculateDateRange({
        after: options.after,
        before: options.before,
        days: options.days,
      });

      // Create pipeline context
      const context = createRepositoryStatsPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        outputDir: options.outputDir,
        overwrite: options.force,
        dateRange,
      });

      // Run the repository summaries pipeline
      await runPipeline(generateRepositoryStats, undefined, context);

      rootLogger.info("\nExport completed successfully!");
    } catch (error: unknown) {
      console.error(chalk.red("Error exporting repository stats:"), error);
      process.exit(1);
    }
  });

// Generate summaries
program
  .command("summarize")
  .description("Generate activity summaries")
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-a, --after <date>", "Start date in YYYY-MM-DD format")
  .option(
    "-b, --before <date>",
    "End date in YYYY-MM-DD format (defaults to end of today)",
  )
  .option(
    "-d, --days <number>",
    "Number of days to look back from before date",
    "7",
  )
  .option("-f, --force", "Regenerate and overwrite existing summaries", false)
  .option("--all", "Process all data since contributionStartDate", false)
  .requiredOption(
    "-t, --type <type>",
    "Type of summary to generate (contributors, repository, or overall)",
  )
  .option("--output-dir <dir>", "Output directory for summaries", "./data/")
  .option("--daily", "Generate daily summaries")
  .option("--weekly", "Generate weekly summaries")
  .option("--monthly", "Generate monthly summaries")
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "summarize",
          config: options.config,
        },
      });

      // Validate summary type
      const summaryType = options.type.toLowerCase();
      if (
        summaryType !== "contributors" &&
        summaryType !== "repository" &&
        summaryType !== "overall"
      ) {
        rootLogger.error(
          `Invalid summary type: ${options.type}. Must be either "contributors", "repository", or "overall".`,
        );
        process.exit(1);
      }

      // If --all is passed, ensure contributionStartDate is set
      if (options.all) {
        if (!pipelineConfig.contributionStartDate) {
          throw new Error(
            "contributionStartDate must be set in pipeline config when using --all option",
          );
        }
        options.after = pipelineConfig.contributionStartDate;
        options.days = "";
      }

      // Calculate date range using shared helper
      const dateRange = calculateDateRange({
        after: options.after,
        before: options.before,
        days: options.days,
      });

      rootLogger.info(
        `Generating ${summaryType} summaries using config from ${configPath}`,
      );

      // If no interval flags are set, enable all intervals
      const hasIntervalFlags =
        options.daily || options.weekly || options.monthly;
      const enabledIntervals = hasIntervalFlags
        ? {
            day: !!options.daily,
            week: !!options.weekly,
            month: !!options.monthly,
          }
        : {
            day: true,
            week: true,
            month: true,
          };
      // Create summarizer context
      const context = createSummarizerContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        outputDir: options.outputDir,
        aiSummaryConfig: pipelineConfig.aiSummary,
        overwrite: options.force,
        dateRange,
        enabledIntervals,
      });
      // Run the appropriate pipeline based on summary type
      if (summaryType === "contributors") {
        await runPipeline(contributorSummariesPipeline, {}, context);
      } else if (summaryType === "repository") {
        await runPipeline(
          repositorySummariesPipeline,
          { repoId: options.repository },
          context,
        );
      } else if (summaryType === "overall") {
        await runPipeline(
          overallSummariesPipeline,
          { repoId: options.repository },
          context,
        );
      }

      rootLogger.info("\nSummary generation completed successfully!");
    } catch (error: unknown) {
      console.error(chalk.red("Error generating summaries:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
