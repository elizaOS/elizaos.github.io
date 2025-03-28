#!/usr/bin/env bun
/**
 * GitHub Contribution Analytics Pipeline
 *
 * This script manages the full lifecycle of GitHub contribution analysis:
 * 1. Fetching data from GitHub using GraphQL API
 * 2. Storing raw data in SQLite database
 * 3. Processing raw data for contributor metrics
 * 4. Generating analytics, scores, and expertise tracking
 */

import { Command } from "commander";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../src/lib/data/db";
import { repositories } from "../src/lib/data/schema";
import { DataIngestion } from "../src/lib/data/ingestion";
import { ContributorPipeline } from "../src/lib/data/processing";
import { pipelineConfig } from "../config/pipeline.config";
import { TagConfig } from "../src/lib/data/types";
import chalk from "chalk";
import { subDays, format, parseISO } from "date-fns";

const program = new Command();

program
  .name("analyze-pipeline")
  .description("GitHub Contribution Analytics Pipeline")
  .version("1.0.0");

// Create instances with config
const dataIngestion = new DataIngestion(pipelineConfig);
const contributorPipeline = new ContributorPipeline(pipelineConfig);

// Initialize database
program
  .command("init")
  .description("Initialize the database and load configuration")
  .action(async () => {
    try {
      console.log(chalk.blue("Initializing database..."));
      await migrate(db, { migrationsFolder: "./drizzle" });

      // Register repositories from config
      for (const repo of pipelineConfig.repositories) {
        await dataIngestion.registerRepository(repo);
        console.log(
          chalk.green(`Repository ${repo.owner}/${repo.name} registered`)
        );
      }

      console.log(chalk.green("Database initialized successfully"));
    } catch (error: unknown) {
      console.error(chalk.red("Error initializing database:"), error);
      process.exit(1);
    }
  });

// List tracked repositories
program
  .command("list-repos")
  .description("List tracked repositories")
  .action(async () => {
    try {
      const repos = await db.select().from(repositories).all();

      if (repos.length === 0) {
        console.log(
          chalk.yellow(
            'No repositories are currently tracked. Run "init" to register repositories.'
          )
        );
        return;
      }

      console.log(chalk.cyan("Tracked repositories:"));
      repos.forEach((repo) => {
        const lastFetched = repo.lastFetchedAt
          ? format(parseISO(repo.lastFetchedAt), "yyyy-MM-dd HH:mm:ss")
          : "Never";

        console.log(`${chalk.bold(repo.id)} (Last fetched: ${lastFetched})`);
      });
    } catch (error: unknown) {
      console.error(chalk.red("Error listing repositories:"), error);
      process.exit(1);
    }
  });

// Fetch data from GitHub
program
  .command("fetch")
  .description("Fetch data from GitHub based on configuration")
  .action(async () => {
    try {
      // Load repositories from database
      const repoRows = await db.select().from(repositories).all();

      if (repoRows.length === 0) {
        console.error(
          chalk.red(
            'No repositories to fetch. Run "init" to register repositories.'
          )
        );
        process.exit(1);
      }

      // Calculate date range based on config
      const lookbackDays = pipelineConfig.lookbackDays || 7;
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const fetchOptions = {
        days: lookbackDays,
      };

      console.log(
        chalk.blue(`Fetching data for the last ${lookbackDays} days...`)
      );

      // Fetch data for each repository
      for (const repo of repoRows) {
        const repoConfig = {
          owner: repo.owner,
          name: repo.name,
          defaultBranch: "main",
        };

        console.log(
          chalk.blue(`Fetching data for ${repo.owner}/${repo.name}...`)
        );
        const result = await dataIngestion.fetchAllData(
          repoConfig,
          fetchOptions
        );
        console.log(
          chalk.green(
            `Fetched ${result.prs} PRs (with commits, reviews, files, and comments) and ${result.issues} issues`
          )
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
  .action(async (options) => {
    try {
      // Calculate date range based on config
      const lookbackDays = pipelineConfig.lookbackDays || 30;
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      console.log(
        chalk.blue(`Processing data from ${startDateStr} to ${endDateStr}...`)
      );

      // Get the repositories from database
      const repoRows = await db.select().from(repositories).all();

      if (repoRows.length === 0) {
        console.error(chalk.red("No repositories found to process."));
        process.exit(1);
      }

      // If repository is specified, validate it exists
      if (options.repository) {
        const targetRepo = repoRows.find(
          (repo) => `${repo.owner}/${repo.name}` === options.repository
        );
        if (!targetRepo) {
          console.error(
            chalk.red(
              `Repository "${options.repository}" not found in database.`
            )
          );
          process.exit(1);
        }
      }

      // Process either the specified repository or all repositories
      const reposToProcess = options.repository
        ? repoRows.filter(
            (repo) => `${repo.owner}/${repo.name}` === options.repository
          )
        : repoRows;

      let totalContributors = 0;
      let totalPRs = 0;
      let totalIssues = 0;
      let totalReviews = 0;
      let totalComments = 0;
      const allMetrics: Record<string, any[]> = {};

      // Process each repository
      for (const repo of reposToProcess) {
        const repository = `${repo.owner}/${repo.name}`;
        console.log(
          chalk.blue(`\nProcessing data for repository: ${repository}`)
        );

        // Process data for the repository
        const result = await contributorPipeline.processTimeframe(
          {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          repository
        );

        // Store metrics for this repository
        allMetrics[repository] = result.metrics;

        // Update totals
        totalContributors += result.totals.contributors;
        totalPRs += result.totals.pullRequests;
        totalIssues += result.totals.issues;
        totalReviews += result.totals.reviews;
        totalComments += result.totals.comments;

        // Print repository summary
        console.log(chalk.cyan(`\nSummary for ${repository}:`));
        console.log(`Contributors: ${result.totals.contributors}`);
        console.log(`Pull requests: ${result.totals.pullRequests}`);
        console.log(`Issues: ${result.totals.issues}`);
        console.log(`Reviews: ${result.totals.reviews}`);
        console.log(`Comments: ${result.totals.comments}`);

        // Print top contributors for this repository
        if (result.metrics.length > 0) {
          console.log(chalk.cyan("\nTop contributors:"));
          result.metrics.slice(0, 5).forEach((metric, index) => {
            console.log(
              `${index + 1}. ${chalk.bold(metric.username)} - Score: ${
                metric.score
              }`
            );
          });
        }
      }

      // Print overall summary if processing multiple repositories
      if (reposToProcess.length > 1) {
        console.log(chalk.cyan("\nOverall Summary:"));
        console.log(`Total Repositories: ${reposToProcess.length}`);
        console.log(`Total Contributors: ${totalContributors}`);
        console.log(`Total Pull Requests: ${totalPRs}`);
        console.log(`Total Issues: ${totalIssues}`);
        console.log(`Total Reviews: ${totalReviews}`);
        console.log(`Total Comments: ${totalComments}`);
      }
    } catch (error: unknown) {
      console.error(chalk.red("Error processing data:"), error);
      process.exit(1);
    }
  });

// Run complete pipeline
program
  .command("run")
  .description("Run complete pipeline (fetch and process)")
  .action(async () => {
    try {
      console.log(chalk.blue("Starting full analytics pipeline..."));

      // Run fetch command
      await program.parseAsync(["analyze-pipeline", "fetch"]);

      // Run process command
      await program.parseAsync(["analyze-pipeline", "process"]);

      console.log(chalk.green("Pipeline completed successfully!"));
    } catch (error: unknown) {
      console.error(chalk.red("Error running pipeline:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
