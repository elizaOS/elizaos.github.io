---
sidebar_position: 4
---

# Pipelines

The `/cli` directory contains the entry points for the command-line interface that drives the data pipeline. These scripts use the `commander.js` library to parse command-line arguments and orchestrate the different pipeline stages defined in `/src/lib/pipelines`.

## Key Scripts

### `analyze-pipeline.ts`

This is the main script for running the entire data processing pipeline. It orchestrates the various stages of data handling:

- **Ingestion**: It fetches data from the GitHub API. You can specify date ranges, the number of days, or force a full re-ingestion.
- **Processing**: It analyzes the raw data, calculates contributor scores based on the rules in `pipeline.config.ts`, and identifies expertise areas.
- **Exporting**: It generates structured JSON files of the processed data, which are used by the frontend.
- **Summarization**: It leverages AI to create human-readable summaries of both project-wide and individual contributor activity.

This script is highly configurable via command-line flags, which are detailed in the [Command Reference](../developer-guides/command-reference.md).

### `data-sync.ts`

This script is a utility for managing the project's data, particularly for new contributors or for synchronizing environments. Its primary functions are:

- **Syncing from Production**: It can fetch the latest data from the `_data` branch of the repository. This includes all historical stats, summaries, and the SQLite database dump. This is the fastest way to get a local environment up and running with a complete dataset.
- **Database Restoration**: It uses the `sqlite-diffable` dump from the `_data` branch to restore the local SQLite database to the latest production state.
- **Forced Updates**: It includes a `--force` flag to delete all local data and perform a clean sync, which is useful for resolving data inconsistencies.

## Pipeline Architecture (`/src/lib/pipelines`)

While the `/cli` directory provides the entry point, the core logic of the pipeline is located in `/src/lib/pipelines`. The system is designed to be modular, with each major function (`ingest`, `contributors`, `export`, `summarize`) residing in its own subdirectory.

### Shared Components

Several files in `/src/lib/pipelines` provide shared functionality used across the different pipeline stages:

- **`runPipeline.ts`**: A higher-order function that wraps each pipeline stage. It handles common tasks like creating a pipeline context, managing verbose logging, and handling errors.
- **`pipelineConfig.ts`**: This file is responsible for loading and validating the main `pipeline.config.ts` file from the repository root. It provides the rest of the pipeline with access to repository lists, scoring weights, and other configurations.
- **`queryHelpers.ts`**: Contains a collection of reusable Drizzle ORM database query functions that are used by multiple pipeline stages (e.g., fetching repository IDs, getting user data).
- **`types.ts`**: Defines the core TypeScript types and Zod schemas that are shared across all pipeline stages, ensuring data consistency.
- **`generateTimeIntervals.ts`**: A utility for creating the `DateRange` objects used throughout the pipelines to process data for specific daily, weekly, or monthly periods.
- **`getActiveContributors.ts` & `getSelectedRepositories.ts`**: Helper functions to determine which users and repositories should be processed based on the current configuration and command-line arguments.
