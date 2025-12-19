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

// Helper to validate environment variables
function validateEnvVars(requiredVars: string[]) {
  const missingVars = requiredVars.filter((envVar) => !process.env[envVar]);
  if (missingVars.length > 0) {
    console.error(
      `Error: Missing required environment variables: ${missingVars.join(", ")}`,
    );
    process.exit(1);
  }
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
import { storeOverallSummary } from "@/lib/pipelines/summarize/mutations";
import { overallSummaries } from "@/lib/data/schema";
import { db } from "@/lib/data/db";
import { and, eq } from "drizzle-orm";
import { IntervalType } from "@/lib/date-utils";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";

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
    // Validate required environment variables for ingestion
    validateEnvVars(["GITHUB_TOKEN"]);

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

      // Run the ingestion pipeline
      await ingestPipeline(undefined, context);
      rootLogger.info("✅ Ingestion completed successfully!");
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
    // Validate required environment variables for processing
    validateEnvVars(["GITHUB_TOKEN"]);

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
    // Validate required environment variables for export
    validateEnvVars(["GITHUB_TOKEN"]);

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
    // Validate required environment variables for AI summaries
    validateEnvVars(["GITHUB_TOKEN", "OPENROUTER_API_KEY"]);

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

// Import existing markdown summaries into the database
program
  .command("import-summaries")
  .description(
    "Import existing markdown summary files into the database (for backfilling missing data)",
  )
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("--data-dir <dir>", "Directory containing summary files", "./data")
  .option(
    "-t, --type <type>",
    "Type of summaries to import (overall, repository)",
    "overall",
  )
  .option("--interval <interval>", "Interval type (day, week, month)", "month")
  .option(
    "--dry-run",
    "Show what would be imported without making changes",
    false,
  )
  .option("-f, --force", "Overwrite existing summaries", false)
  .option(
    "--from-github",
    "Fetch summaries directly from GitHub _data branch instead of local files",
    false,
  )
  .action(async (options) => {
    try {
      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "import-summaries",
        },
      });

      const intervalType = options.interval as IntervalType;
      if (!["day", "week", "month"].includes(intervalType)) {
        rootLogger.error(
          `Invalid interval type: ${options.interval}. Must be day, week, or month.`,
        );
        process.exit(1);
      }

      if (options.type !== "overall") {
        rootLogger.error(
          "Currently only 'overall' summary type is supported for import.",
        );
        process.exit(1);
      }

      rootLogger.info(
        `Importing ${intervalType} ${options.type} summaries${options.dryRun ? " (dry run)" : ""}`,
      );

      /**
       * Check if an overall summary exists in the database
       */
      async function checkExistingSummary(
        date: string,
        interval: IntervalType,
      ): Promise<boolean> {
        const existingSummary = await db.query.overallSummaries.findFirst({
          where: and(
            eq(overallSummaries.date, date),
            eq(overallSummaries.intervalType, interval),
          ),
        });
        return existingSummary !== undefined && existingSummary.summary !== "";
      }

      /**
       * Get all markdown summary files from local directory
       */
      async function getLocalSummaryFiles(): Promise<
        { date: string; content: string }[]
      > {
        // Look for overall summaries in data/outputs/summaries/{interval}/*.md
        // or in data/elizaos_eliza/summaries/{interval}/*.md (legacy path)
        const possiblePaths = [
          join(options.dataDir, "outputs", "summaries", intervalType),
          join(options.dataDir, "elizaos_eliza", "summaries", intervalType),
        ];

        for (const summaryDir of possiblePaths) {
          if (!existsSync(summaryDir)) {
            rootLogger.debug(`Directory not found: ${summaryDir}`);
            continue;
          }

          rootLogger.info(`Reading summaries from ${summaryDir}`);
          const files = await readdir(summaryDir);
          const mdFiles = files.filter((f) => f.endsWith(".md"));

          const summaries: { date: string; content: string }[] = [];
          for (const file of mdFiles) {
            // Extract date from filename (e.g., 2024-12-01.md -> 2024-12-01)
            const date = file.replace(".md", "");
            const filePath = join(summaryDir, file);
            const content = await readFile(filePath, "utf-8");
            summaries.push({ date, content });
          }

          if (summaries.length > 0) {
            return summaries;
          }
        }

        return [];
      }

      /**
       * Fetch summary files from GitHub _data branch
       */
      async function getGitHubSummaryFiles(): Promise<
        { date: string; content: string }[]
      > {
        const repoOwner = "elizaOS";
        const repoName = "elizaos.github.io";
        const branch = "_data";

        // Try both paths
        const possiblePaths = [
          `data/outputs/summaries/${intervalType}`,
          `data/elizaos_eliza/summaries/${intervalType}`,
        ];

        for (const basePath of possiblePaths) {
          try {
            // List files in directory
            const listUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${basePath}?ref=${branch}`;
            rootLogger.debug(`Fetching file list from: ${listUrl}`);

            const listResponse = await fetch(listUrl, {
              headers: {
                Accept: "application/vnd.github.v3+json",
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `token ${process.env.GITHUB_TOKEN}`,
                }),
              },
            });

            if (!listResponse.ok) {
              rootLogger.debug(
                `Failed to list files in ${basePath}: ${listResponse.status}`,
              );
              continue;
            }

            const files = (await listResponse.json()) as Array<{
              name: string;
              download_url: string;
            }>;
            const mdFiles = files.filter((f) => f.name.endsWith(".md"));

            rootLogger.info(
              `Found ${mdFiles.length} markdown files in ${basePath}`,
            );

            const summaries: { date: string; content: string }[] = [];
            for (const file of mdFiles) {
              const date = file.name.replace(".md", "");
              rootLogger.debug(`Fetching content for ${date}`);

              const contentResponse = await fetch(file.download_url);
              if (contentResponse.ok) {
                const content = await contentResponse.text();
                summaries.push({ date, content });
              }
            }

            if (summaries.length > 0) {
              return summaries;
            }
          } catch (error) {
            rootLogger.debug(`Error fetching from ${basePath}: ${error}`);
          }
        }

        return [];
      }

      // Get summary files based on source option
      const summaryFiles = options.fromGithub
        ? await getGitHubSummaryFiles()
        : await getLocalSummaryFiles();

      if (summaryFiles.length === 0) {
        rootLogger.warn(
          `No ${intervalType} summary files found.${!options.fromGithub ? " Try --from-github to fetch from _data branch." : ""}`,
        );
        process.exit(0);
      }

      rootLogger.info(`Found ${summaryFiles.length} summary files to process`);

      // Process each summary
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const { date, content } of summaryFiles) {
        try {
          const exists = await checkExistingSummary(date, intervalType);

          if (exists && !options.force) {
            rootLogger.debug(
              `Summary for ${date} already exists, skipping (use --force to overwrite)`,
            );
            skipped++;
            continue;
          }

          if (options.dryRun) {
            rootLogger.info(
              `[DRY RUN] Would ${exists ? "overwrite" : "import"} summary for ${date}`,
            );
            imported++;
            continue;
          }

          await storeOverallSummary(date, content, intervalType);
          rootLogger.info(
            `${exists ? "Updated" : "Imported"} ${intervalType} summary for ${date}`,
          );
          imported++;
        } catch (error) {
          rootLogger.error(`Failed to import summary for ${date}:`, { error });
          errors++;
        }
      }

      rootLogger.info(`
Import completed:
  - Imported: ${imported}
  - Skipped (existing): ${skipped}
  - Errors: ${errors}
      `);

      if (imported > 0 && !options.dryRun) {
        rootLogger.info(
          "Note: Run 'bun run db:dump' to export the updated database to diffable format.",
        );
      }
    } catch (error: unknown) {
      console.error(chalk.red("Error importing summaries:"), error);
      process.exit(1);
    }
  });

// Export leaderboard API endpoints
program
  .command("export-leaderboard")
  .description("Generate static JSON leaderboard API endpoints")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("--output-dir <dir>", "Output directory for API files", "./data/")
  .option(
    "-l, --limit <number>",
    "Limit number of users in leaderboard (0 = no limit)",
    "100",
  )
  .action(async (options) => {
    // No env vars required - reads from local database only

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
          command: "export-leaderboard",
          config: options.config,
        },
      });

      rootLogger.info(
        `Generating leaderboard API endpoints using config from ${configPath}`,
      );

      // Dynamically import the export function
      const { exportAllLeaderboardAPIs } = await import(
        "@/lib/pipelines/export/exportLeaderboardAPI"
      );

      // Parse limit option (0 means no limit)
      const limit = parseInt(options.limit, 10);
      const userLimit = limit === 0 ? undefined : limit;

      // Export all leaderboard endpoints
      await exportAllLeaderboardAPIs(options.outputDir, {
        limit: userLimit,
        contributionStartDate:
          pipelineConfig.contributionStartDate ?? "2024-10-15",
        logger: rootLogger,
      });

      rootLogger.info("\nLeaderboard API export completed successfully!");
    } catch (error: unknown) {
      console.error(chalk.red("Error exporting leaderboard:"), error);
      process.exit(1);
    }
  });

// Export summary JSON API files from existing database summaries
program
  .command("export-summaries")
  .description(
    "Export existing database summaries to JSON API format (for backfilling)",
  )
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("--output-dir <dir>", "Output directory for API files", "./data/")
  .option(
    "-t, --type <type>",
    "Type of summaries to export (overall, repository, contributor, all)",
    "all",
  )
  .option(
    "--interval <interval>",
    "Interval type (day, week, month, all)",
    "all",
  )
  .option(
    "--dry-run",
    "Show what would be exported without writing files",
    false,
  )
  .action(async (options) => {
    try {
      const { writeSummaryToAPI, getAPISummaryPath } = await import(
        "@/lib/fsHelpers"
      );
      const { repoSummaries, userSummaries } = await import(
        "@/lib/data/schema"
      );

      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: { command: "export-summaries" },
      });

      const validTypes = ["overall", "repository", "contributor", "all"];
      const validIntervals = ["day", "week", "month", "all"];

      if (!validTypes.includes(options.type)) {
        rootLogger.error(
          `Invalid type: ${options.type}. Must be one of: ${validTypes.join(", ")}`,
        );
        process.exit(1);
      }
      if (!validIntervals.includes(options.interval)) {
        rootLogger.error(
          `Invalid interval: ${options.interval}. Must be one of: ${validIntervals.join(", ")}`,
        );
        process.exit(1);
      }

      const typesToExport =
        options.type === "all"
          ? (["overall", "repository", "contributor"] as const)
          : ([options.type] as const);
      const intervalsToExport: IntervalType[] =
        options.interval === "all"
          ? ["day", "week", "month"]
          : [options.interval as IntervalType];

      let totalExported = 0;

      for (const summaryType of typesToExport) {
        for (const intervalType of intervalsToExport) {
          rootLogger.info(
            `Exporting ${summaryType} ${intervalType} summaries...`,
          );

          if (summaryType === "overall") {
            const summaries = await db.query.overallSummaries.findMany({
              where: eq(overallSummaries.intervalType, intervalType),
            });

            for (const summary of summaries) {
              if (!summary.summary) continue;
              if (options.dryRun) {
                const path = getAPISummaryPath(
                  options.outputDir,
                  "overall",
                  intervalType,
                  `${summary.date}.json`,
                );
                rootLogger.info(`[DRY RUN] Would export ${path}`);
              } else {
                await writeSummaryToAPI(
                  options.outputDir,
                  "overall",
                  intervalType,
                  summary.date,
                  summary.summary,
                );
              }
              totalExported++;
            }
          } else if (summaryType === "repository") {
            const summaries = await db.query.repoSummaries.findMany({
              where: eq(repoSummaries.intervalType, intervalType),
            });

            for (const summary of summaries) {
              if (!summary.summary) continue;
              const [owner, repo] = summary.repoId.split("/");
              if (!owner || !repo) {
                rootLogger.warn(
                  `Invalid repoId format: ${summary.repoId}, skipping`,
                );
                continue;
              }
              if (options.dryRun) {
                const path = getAPISummaryPath(
                  options.outputDir,
                  "repos",
                  summary.repoId,
                  intervalType,
                  `${summary.date}.json`,
                );
                rootLogger.info(`[DRY RUN] Would export ${path}`);
              } else {
                await writeSummaryToAPI(
                  options.outputDir,
                  "repository",
                  intervalType,
                  summary.date,
                  summary.summary,
                  summary.repoId,
                  { repoId: summary.repoId, owner, repo },
                );
              }
              totalExported++;
            }
          } else if (summaryType === "contributor") {
            const summaries = await db.query.userSummaries.findMany({
              where: eq(userSummaries.intervalType, intervalType),
            });

            for (const summary of summaries) {
              if (!summary.summary || !summary.username) continue;
              if (options.dryRun) {
                const path = getAPISummaryPath(
                  options.outputDir,
                  "contributors",
                  summary.username,
                  intervalType,
                  `${summary.date}.json`,
                );
                rootLogger.info(`[DRY RUN] Would export ${path}`);
              } else {
                await writeSummaryToAPI(
                  options.outputDir,
                  "contributor",
                  intervalType,
                  summary.date,
                  summary.summary,
                  summary.username,
                  { username: summary.username },
                );
              }
              totalExported++;
            }
          }
        }
      }

      rootLogger.info(
        `\nExport completed: ${totalExported} summaries${options.dryRun ? " (dry run)" : " exported"}`,
      );
    } catch (error: unknown) {
      console.error(chalk.red("Error exporting summaries:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
