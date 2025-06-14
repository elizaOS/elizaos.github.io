#!/usr/bin/env bun
/**
 * Data Sync Utility
 *
 * This script synchronizes data from the remote _data branch to a local development environment,
 * allowing developers to work with the latest production data.
 *
 * Based on the same approach used in GitHub Actions:
 * - Fetches the _data branch
 * - Creates a temporary worktree
 * - Copies data files to the local environment
 * - Restores the SQLite database from diffable format
 */

import { Command } from "@commander-js/extra-typings";
import { createLogger, LogLevel } from "@/lib/logger";
import chalk from "chalk";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, statSync, readdirSync } from "fs";
import { rmSync, cpSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { createInterface } from "readline/promises";
import Table from "cli-table3";
import { unlinkSync } from "fs";
import { glob } from "glob";

const execPromise = promisify(exec);

// Helper to check if uv is installed
function isUvInstalled(): boolean {
  try {
    execSync("uv --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper to print uv installation instructions
function printUvInstallInstructions(): void {
  console.log(
    chalk.red("\nError: 'uv' is not installed or not available in your PATH."),
  );
  console.log(
    "\nThis script requires uv for database operations. Please install it:",
  );
  console.log("  pipx install uv");
  console.log("  brew install uv");
  console.log("\nFor more information and other installation methods, visit:");
  console.log(
    chalk.blue("  https://docs.astral.sh/uv/getting-started/installation/"),
  );
}

// Helper to get directory size recursively
function getDirSize(dir: string): { files: number; size: number } {
  let files = 0;
  let size = 0;

  try {
    const items = statSync(dir);
    if (!items.isDirectory()) return { files: 1, size: items.size };

    const list = execSync(`find "${dir}" -type f`, { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);
    files = list.length;
    size = list.reduce((acc, file) => acc + statSync(file).size, 0);
  } catch (error) {
    return { files: 0, size: 0 };
  }

  return { files, size };
}

// Helper to get detailed directory info (up to 2 levels deep)
function getDetailedDirInfo(
  baseDir: string,
): { path: string; files: number; size: number }[] {
  if (!existsSync(baseDir)) return [];

  const results: { path: string; files: number; size: number }[] = [];

  try {
    // First level subdirectories
    const firstLevelDirs = readdirSync(baseDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dir of firstLevelDirs) {
      const dirPath = join(baseDir, dir);

      // Skip dump directory
      if (dir === "dump") continue;

      // Second level subdirectories
      try {
        const secondLevelDirs = readdirSync(dirPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        for (const subdir of secondLevelDirs) {
          const subdirPath = join(dirPath, subdir);
          const subdirStats = getDirSize(subdirPath);
          results.push({
            path: subdirPath,
            files: subdirStats.files,
            size: subdirStats.size,
          });
        }
      } catch (error) {
        // Skip if can't read second level directories
      }
    }
  } catch (error) {
    // Return empty array if there's an error
  }

  return results;
}

// Helper to get file size
function getFileSize(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

// Helper to format bytes to human readable size
function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit]}`;
}

// Helper to format directory path for display
function formatDirPath(basePath: string, fullPath: string): string {
  // For the base directory, return "/"
  if (fullPath === basePath) return "/ (root)";

  // For subdirectories, return relative path
  return fullPath.replace(basePath, "").replace(/^\//, "") || "/";
}

// Helper to format files and size info
function formatFilesAndSize(files: number, size: number): string {
  if (files === 0) return "empty";
  return `${files} (${formatBytes(size)})`;
}

// Helper to delete files in a directory while preserving .gitkeep files
function deleteDataFiles(
  directory: string,
  logger: ReturnType<typeof createLogger>,
): number {
  if (!existsSync(directory)) return 0;

  let deletedCount = 0;
  try {
    // Find all files recursively except .gitkeep
    const files = execSync(`find "${directory}" -type f ! -name ".gitkeep"`, {
      encoding: "utf-8",
    })
      .split("\n")
      .filter(Boolean);

    // Delete each file
    for (const file of files) {
      logger.debug(`Deleting file: ${file}`);
      unlinkSync(file);
      deletedCount++;
    }
  } catch (error) {
    logger.error(`Error deleting data files: ${error}`);
  }

  return deletedCount;
}

// Configure commander
const program = new Command();

program
  .name("data-sync")
  .description("Synchronize data from remote _data branch")
  .version("1.0.0");

program
  .option("-b, --branch <n>", "Name of the data branch", "_data")
  .option("-r, --remote <n>", "Remote name to fetch from", "origin")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("-d, --data-dir <path>", "Local data directory", "data")
  .option("--db-file <path>", "SQLite database path", "data/db.sqlite")
  .option(
    "--worktree-dir <path>",
    "Directory for temporary worktree",
    "./.data-worktree",
  )
  .option(
    "--main-worktree-dir <path>",
    "Directory for temporary main branch worktree",
    "./.main-worktree",
  )
  .option("--main-branch <n>", "Name of the main branch", "main")
  .option("--skip-db", "Skip restoring the database from dump", false)
  .option("--depth <number>", "Fetch with specified depth", "1")
  .option("-y, --yes", "Skip confirmation prompts", false)
  .option(
    "-f, --force",
    "Force delete existing data files before syncing",
    false,
  )
  .action(async (options) => {
    try {
      // Configure logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const logger = createLogger({
        minLevel: logLevel,
        context: {
          command: "data-sync",
        },
      });

      // Check if uv is installed when database operations are needed
      if (!options.skipDb && !isUvInstalled()) {
        printUvInstallInstructions();
        process.exit(1);
      }

      logger.info(
        `Syncing data from ${options.remote}/${options.branch} branch`,
      );

      // Step 1: Clean up existing worktree
      if (existsSync(options.worktreeDir)) {
        logger.info(
          `Removing existing worktree directory: ${options.worktreeDir}`,
        );
        try {
          execSync(`git worktree remove ${options.worktreeDir} --force`);
        } catch (error) {
          logger.debug(
            `Failed to remove worktree via git, falling back to rmSync: ${error}`,
          );
          rmSync(options.worktreeDir, { recursive: true, force: true });
        }
      }
      if (existsSync(options.mainWorktreeDir)) {
        logger.info(
          `Removing existing worktree directory: ${options.mainWorktreeDir}`,
        );
        try {
          execSync(`git worktree remove ${options.mainWorktreeDir} --force`);
        } catch (error) {
          logger.debug(
            `Failed to remove worktree via git, falling back to rmSync: ${error}`,
          );
          rmSync(options.mainWorktreeDir, { recursive: true, force: true });
        }
      }

      // Step 2: Check if the remote branch exists
      logger.debug(
        `Checking if branch ${options.branch} exists on ${options.remote}`,
      );
      const { stdout: remoteBranchCheck } = await execPromise(
        `git ls-remote --heads ${options.remote} ${options.branch}`,
      );

      if (!remoteBranchCheck.trim()) {
        logger.error(
          `Branch '${options.branch}' does not exist on remote '${options.remote}'.`,
        );
        process.exit(1);
      }

      if (!options.skipDb) {
        logger.debug(
          `Checking if branch ${options.mainBranch} exists on ${options.remote}`,
        );
        const { stdout: mainBranchCheck } = await execPromise(
          `git ls-remote --heads ${options.remote} ${options.mainBranch}`,
        );

        if (!mainBranchCheck.trim()) {
          logger.error(
            `Branch '${options.mainBranch}' does not exist on remote '${options.remote}'.`,
          );
          process.exit(1);
        }
      }

      // Step 3: Fetch the data branch from remote with depth limit for speed
      logger.info(
        `Fetching ${options.branch} branch from ${options.remote} with depth=${options.depth}`,
      );
      await execPromise(
        `git fetch ${options.remote} ${options.branch} --depth=${options.depth}`,
      );

      if (!options.skipDb) {
        logger.info(
          `Fetching ${options.mainBranch} branch from ${options.remote} with depth=1`,
        );
        await execPromise(
          `git fetch ${options.remote} ${options.mainBranch} --depth=1`,
        );
      }

      // Step 4: Create a worktree for the data branch
      logger.info(`Setting up worktree for ${options.branch}`);
      await execPromise(
        `git worktree add ${options.worktreeDir} ${options.remote}/${options.branch}`,
      );

      if (!options.skipDb) {
        logger.info(`Setting up worktree for ${options.mainBranch}`);
        await execPromise(
          `git worktree add ${options.mainWorktreeDir} ${options.remote}/${options.mainBranch}`,
        );
      }

      // Step 5: Create database in worktree first if needed
      const worktreeDumpDir = join(options.worktreeDir, "data/dump");
      const worktreeDbFile = join(options.worktreeDir, options.dbFile);

      if (!options.skipDb) {
        if (existsSync(worktreeDumpDir)) {
          logger.info(
            `Creating database in worktree from remote dump at ${worktreeDumpDir}`,
          );

          try {
            // Delete __drizzle_migrations* files from dump directory to avoid migration errors
            logger.info(
              `Removing __drizzle_migrations* files from dump directory`,
            );
            const migrationFiles = glob.sync(
              join(worktreeDumpDir, "__drizzle_migrations*"),
            );
            for (const file of migrationFiles) {
              logger.debug(`Deleting migration file: ${file}`);
              unlinkSync(file);
            }
            logger.info(
              `✅ Removed ${migrationFiles.length} migration files from dump directory`,
            );

            // Ensure worktree database directory exists
            const worktreeDbDir = dirname(worktreeDbFile);
            if (!existsSync(worktreeDbDir)) {
              mkdirSync(worktreeDbDir, { recursive: true });
            }

            // Force delete existing data files if requested
            if (options.force) {
              logger.info(
                `Force option detected - removing existing data files`,
              );
              const deletedCount = deleteDataFiles(options.dataDir, logger);
              logger.info(
                `✅ Removed ${deletedCount} data files from ${options.dataDir}`,
              );

              // Also remove the database file if it exists
              if (existsSync(options.dbFile)) {
                logger.info(
                  `Removing existing database file: ${options.dbFile}`,
                );
                unlinkSync(options.dbFile);
                logger.info(`✅ Removed existing database file`);
              }
            }

            // Instantiate database with migrations from the main branch worktree
            const { mainWorktreeDir, mainBranch } = options;
            const mainWorktreeDbFile = join(mainWorktreeDir, options.dbFile);
            logger.info(
              `Instantiating database from '${mainBranch}' branch migrations...`,
            );

            const mainWtExecOpts = {
              cwd: mainWorktreeDir,
              encoding: "utf8" as const,
            };

            logger.info(`Installing dependencies in ${mainWorktreeDir}...`);
            execSync("bun install", mainWtExecOpts);
            logger.info(`✅ Dependencies installed.`);

            logger.info(
              `Running db:migrate in ${mainWorktreeDir} to instantiate database...`,
            );
            const migrateOutput = execSync(
              "bun run db:migrate",
              mainWtExecOpts,
            );
            logger.debug(`Migration output: ${migrateOutput}`);
            logger.info(
              `✅ Database instantiated with migrations from '${mainBranch}'.`,
            );

            if (!existsSync(mainWorktreeDbFile)) {
              throw new Error(
                `Database file not found in main worktree at ${mainWorktreeDbFile} after migrations.`,
              );
            }

            logger.info(
              `Copying new database from main worktree to data worktree...`,
            );
            copyFileSync(mainWorktreeDbFile, worktreeDbFile);
            logger.info(`✅ Database copied to ${worktreeDbFile}.`);

            // Run sqlite-diffable within worktree to load data into the copied database
            const cmd = `uv run uvx sqlite-diffable load ${worktreeDbFile} ${worktreeDumpDir} --replace`;
            logger.debug(`Running: ${cmd}`);
            const { stdout, stderr } = await execPromise(cmd);

            if (options.verbose) {
              logger.debug(`Command output: ${stdout}`);
              if (stderr) logger.debug(`Command errors: ${stderr}`);
            }

            logger.info(`✅ Database in worktree updated with remote data`);
          } catch (error) {
            logger.error(`Failed to update database in worktree: ${error}`);
            logger.info(`
To update the database manually, run:
 uvx sqlite-diffable load ${worktreeDbFile} ${worktreeDumpDir} ${existsSync(options.dbFile) ? "" : "--replace"}
            `);
            process.exit(1);
          }
        } else {
          logger.warn(
            `No valid dump found in remote data branch, skipping database creation`,
          );
        }
      }

      // Check for existing data and get stats
      const hasExistingData = existsSync(options.dataDir);
      const hasExistingDb = existsSync(options.dbFile);

      if ((hasExistingData || hasExistingDb) && !options.yes) {
        logger.warn(chalk.yellow("\nWarning: Local data will be overwritten!"));
        // Get database size comparison
        const currentDbSize = getFileSize(options.dbFile);
        const remoteDbSize = getFileSize(worktreeDbFile);

        // Get detailed directory info
        const currentDetailedInfo = getDetailedDirInfo(options.dataDir);
        const remoteDetailedInfo = getDetailedDirInfo(
          join(options.worktreeDir, "data"),
        );

        // Create the comparison table using cli-table3
        const comparisonTable = new Table({
          head: ["", "Local Files", "Remote Files"],
          chars: {
            top: "─",
            "top-mid": "┬",
            "top-left": "┌",
            "top-right": "┐",
            bottom: "─",
            "bottom-mid": "┴",
            "bottom-left": "└",
            "bottom-right": "┘",
            left: "│",
            "left-mid": "├",
            mid: "─",
            "mid-mid": "┼",
            right: "│",
            "right-mid": "┤",
            middle: "│",
          },
          style: {
            head: ["cyan"],
            border: [], // No colors for borders
            compact: true, // Compact style
            "padding-left": 1,
            "padding-right": 1,
          },
          wordWrap: true,
          truncate: "…",
          colWidths: [25, 20, 20], // Narrower columns for a more compact look
        });

        // Add database row
        if (!options.skipDb) {
          comparisonTable.push([
            "db.sqlite",
            currentDbSize ? formatBytes(currentDbSize) : "missing",
            remoteDbSize ? formatBytes(remoteDbSize) : "missing",
          ]);
        }

        // Function to create a map of directory paths to info
        function createDirInfoMap(
          infoArray: { path: string; files: number; size: number }[],
        ): Map<string, { files: number; size: number }> {
          const map = new Map<string, { files: number; size: number }>();
          for (const info of infoArray) {
            map.set(info.path, { files: info.files, size: info.size });
          }
          return map;
        }

        const currentDirMap = createDirInfoMap(currentDetailedInfo);
        const remoteDirMap = createDirInfoMap(remoteDetailedInfo);

        // Create a set of all unique directory paths
        const allPaths = new Set<string>();

        // Add all paths from both current and remote
        for (const info of currentDetailedInfo) {
          const relativePath = formatDirPath(options.dataDir, info.path);
          allPaths.add(relativePath);
        }

        for (const info of remoteDetailedInfo) {
          const relativePath = formatDirPath(
            join(options.worktreeDir, "data"),
            info.path,
          );
          allPaths.add(relativePath);
        }

        // Sort paths for consistent display
        const sortedPaths = Array.from(allPaths).sort();

        // Add rows for each unique path
        for (const relativePath of sortedPaths) {
          const currentPath = join(
            options.dataDir,
            relativePath.replace("/ (root)", ""),
          );
          const remotePath = join(
            options.worktreeDir,
            "data",
            relativePath.replace("/ (root)", ""),
          );

          const currentInfo = currentDirMap.get(currentPath) || {
            files: 0,
            size: 0,
          };
          const remoteInfo = remoteDirMap.get(remotePath) || {
            files: 0,
            size: 0,
          };

          comparisonTable.push([
            relativePath,
            formatFilesAndSize(currentInfo.files, currentInfo.size),
            formatFilesAndSize(remoteInfo.files, remoteInfo.size),
          ]);
        }

        // Print comparison table
        console.log("\nData comparison:");
        console.log(comparisonTable.toString());

        // List potentially affected directories
        const affectedDirs = [];
        if (hasExistingData) affectedDirs.push("- Data files and summaries");
        if (hasExistingDb && !options.skipDb)
          affectedDirs.push("- SQLite database");

        console.log("\nThe following will be overwritten:");
        console.log(affectedDirs.join("\n"));

        // Ask for confirmation
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await rl.question("\nDo you want to proceed? [y/N] ");
        rl.close();

        if (!answer.toLowerCase().startsWith("y")) {
          logger.info("Operation cancelled by user");

          // Clean up worktree
          logger.info(`Cleaning up worktree directory: ${options.worktreeDir}`);
          try {
            await execPromise(
              `git worktree remove ${options.worktreeDir} --force`,
            );
          } catch (error) {
            rmSync(options.worktreeDir, { recursive: true, force: true });
          }

          if (!options.skipDb) {
            logger.info(
              `Cleaning up worktree directory: ${options.mainWorktreeDir}`,
            );
            try {
              await execPromise(
                `git worktree remove ${options.mainWorktreeDir} --force`,
              );
            } catch (error) {
              rmSync(options.mainWorktreeDir, {
                recursive: true,
                force: true,
              });
            }
          }

          process.exit(0);
        }
      }

      // Create data directory if it doesn't exist
      if (!existsSync(options.dataDir)) {
        logger.debug(`Creating data directory: ${options.dataDir}`);
        mkdirSync(options.dataDir, { recursive: true });
      }

      // Ensure database directory exists
      const dbDir = dirname(options.dbFile);
      if (!existsSync(dbDir)) {
        logger.debug(`Creating database directory: ${dbDir}`);
        mkdirSync(dbDir, { recursive: true });
      }

      // Step 6: Copy data from worktree to data directory
      logger.info(`Copying data files to ${options.dataDir}`);

      if (existsSync(join(options.worktreeDir, "data"))) {
        // Copy all files except the database file and dump directory
        // Use a filtering function to exclude .sqlite files and dump directory
        cpSync(join(options.worktreeDir, "data"), options.dataDir, {
          recursive: true,
          filter: (src) => {
            const relativePath = src.replace(
              join(options.worktreeDir, "data"),
              "",
            );
            return !src.endsWith(".sqlite") && !relativePath.includes("/dump/");
          },
        });
      } else {
        logger.warn(`No data directory found in ${options.branch} branch`);
      }

      // Step 7: Copy database file directly instead of rebuilding it
      if (!options.skipDb && existsSync(worktreeDbFile)) {
        logger.info(`Copying database from worktree to ${options.dbFile}`);
        try {
          copyFileSync(worktreeDbFile, options.dbFile);
          logger.info(`✅ Database copied to ${options.dbFile}`);
        } catch (error) {
          logger.error(`Failed to copy database: ${error}`);
        }
      } else if (!options.skipDb) {
        logger.warn(
          `No database file found in worktree, skipping database copy`,
        );
      } else {
        logger.info(`Skipping database restore (--skip-db option used)`);
      }

      // Run migrations one last time to apply any new local migrations
      if (!options.skipDb) {
        logger.info(
          `Running db:migrate one last time to apply any new local migrations`,
        );
        try {
          const migrateOutput = execSync("bun run db:migrate", {
            encoding: "utf8",
          });
          logger.debug(`Final migration output: ${migrateOutput}`);
          logger.info(`✅ Final migrations applied successfully`);
        } catch (error) {
          logger.warn(`Failed to run final migrations: ${error}`);
        }
      }

      logger.info(`Cleaning up worktree directory: ${options.worktreeDir}`);
      try {
        await execPromise(`git worktree remove ${options.worktreeDir} --force`);
        logger.debug(`Worktree removed successfully`);
      } catch (error) {
        logger.warn(
          `Failed to remove worktree via git, it may need manual cleanup: ${error}`,
        );
        rmSync(options.worktreeDir, { recursive: true, force: true });
      }

      if (!options.skipDb) {
        logger.info(
          `Cleaning up worktree directory: ${options.mainWorktreeDir}`,
        );
        try {
          await execPromise(
            `git worktree remove ${options.mainWorktreeDir} --force`,
          );
          logger.debug(`Worktree removed successfully`);
        } catch (error) {
          logger.warn(
            `Failed to remove worktree via git, it may need manual cleanup: ${error}`,
          );
          rmSync(options.mainWorktreeDir, {
            recursive: true,
            force: true,
          });
        }
      }

      logger.info(`✅ Data sync completed successfully!`);
      logger.info(`
Data has been synchronized from the ${options.remote}/${options.branch} branch:
- Data files: ${options.dataDir}
- Database: ${options.dbFile}${!options.skipDb ? " (updated with remote data)" : ""}

To update data again later, simply run this command again.
      `);
    } catch (error: unknown) {
      console.error(chalk.red("Error syncing data:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
