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

// Load environment variables from .envrc file
const envPath = join(import.meta.dir, "../.envrc");
loadEnv({ path: envPath });

// Validate required environment variables
const requiredEnvVars = ["GITHUB_TOKEN"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Error: Missing required environment variables: ${missingEnvVars.join(
      ", "
    )}`
  );
  process.exit(1);
}

import { Command } from "@commander-js/extra-typings";
import { DataIngestion } from "../src/lib/data/ingestion";
import {
  PipelineConfig,
  PipelineConfigSchema,
} from "@/lib/data/pipelineConfig";
import chalk from "chalk";
import { subDays, format } from "date-fns";
import {
  contributorTagsPipeline,
  generateRepositorySummaries,
} from "@/lib/data/processing/pipelines";
import { createContributorPipelineContext } from "@/lib/data/processing/contributors/context";
import { createRepositorySummaryPipelineContext } from "@/lib/data/processing/export/context";
import { runPipeline } from "@/lib/data/processing/runPipeline";
import { createLogger, LogLevel } from "@/lib/data/processing/logger";
import { toDateString } from "@/lib/date-utils";

const DEFAULT_CONFIG_PATH = "../config/pipeline.config.ts";
const program = new Command();

program
  .name("analyze-pipeline")
  .description("GitHub Contribution Analytics Pipeline")
  .version("1.0.0");

// Create instances with config - will be initialized in each command
let dataIngestion: DataIngestion;

// Ingest data from GitHub
program
  .command("ingest")
  .description("Ingest data from GitHub API based on configuration")
  .option("-d, --days <number>", "Number of days to look back", "14")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH
  )
  .option("-v, --verbose", "Enable verbose logging", false)
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
      });

      // Initialize services with config
      dataIngestion = new DataIngestion(pipelineConfig, rootLogger);

      // Use command line days if specified, otherwise fallback to config
      const lookbackDays = parseInt(options.days);
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const fetchOptions = {
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
      };

      rootLogger.info(
        `Fetching data from ${fetchOptions.startDate} to ${fetchOptions.endDate} using config from ${configPath}`
      );

      // Fetch data for all configured repositories
      const results = await dataIngestion.fetchAllData(fetchOptions);

      // Log results
      for (const result of results) {
        rootLogger.info(
          `Repository ${result.repository}: Fetched ${result.prs} PRs and ${result.issues} issues`
        );
      }
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
    DEFAULT_CONFIG_PATH
  )
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // // Calculate date range based on lookback days
      // const lookbackDays = parseInt(options.days);
      // const endDate = new Date();
      // const startDate = subDays(endDate, lookbackDays);

      // const startDateStr = format(startDate, "yyyy-MM-dd");
      // const endDateStr = format(endDate, "yyyy-MM-dd");

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "process",
          config: options.config,
        },
      });
      rootLogger.info(`Processing data  using config from ${configPath}`);

      // Create pipeline context with the root logger
      const context = createContributorPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
      });

      // Run the pipeline directly - no need for the ContributorPipeline class
      const result = await runPipeline(
        contributorTagsPipeline,
        undefined, // No input for the root pipeline
        context,
        pipelineConfig
      );

      const repoCount = result.length;
      const contributorCount = result.reduce(
        (acc, curr) => acc + curr.length,
        0
      );

      rootLogger.info("\nProcessing completed successfully!");
      rootLogger.info(`Processed ${repoCount} repositories`);
      rootLogger.info(`Processed ${contributorCount} contributors`);
    } catch (error: unknown) {
      console.error(chalk.red("Error processing data:"), error);
      process.exit(1);
    }
  });

// Export repository summaries
program
  .command("export")
  .description("Generate and export repository summaries")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH
  )
  .option("-o, --output <dir>", "Output directory for summaries", "./data2/")
  .option("-d, --days <number>", "Number of days to look back", "30")
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Calculate date range based on lookback days
      const lookbackDays = parseInt(options.days);
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const startDateStr = format(startDate, "yyyy-MM-dd");

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
        `Generating repository summaries using config from ${configPath}`
      );

      // Create pipeline context
      const context = createRepositorySummaryPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        outputDir: options.output,
        dateRange: {
          startDate: startDateStr,
        },
      });

      // Run the repository summaries pipeline
      const result = await runPipeline(
        generateRepositorySummaries,
        undefined,
        context,
        pipelineConfig
      );

      rootLogger.info("\nExport completed successfully!");
      rootLogger.info(`Generated summaries for ${result.length} repositories`);
    } catch (error: unknown) {
      console.error(chalk.red("Error exporting repository summaries:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
