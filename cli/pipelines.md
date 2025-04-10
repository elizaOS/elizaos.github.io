# TypeScript Pipeline Documentation

The primary data processing system is a TypeScript-based pipeline that leverages SQLite and Drizzle ORM for improved data management.

## Basic Usage

```bash
# Ingest GitHub data
bun run pipeline ingest

# Process and analyze
bun run pipeline process

# Generate AI summaries
bun run pipeline summarize

# Export JSON data
bun run pipeline export
```

You can add the `-h` param to any of these commands to see a list of options and usage of the command.

### Common Options

All data-processing commands (ingest, export, summarize) support the same date range options:

```bash
# Specify a start date
--after YYYY-MM-DD

# Specify an end date (defaults to today)
--before YYYY-MM-DD

# Specify number of days to look back from the end date
--days NUMBER

# Process all data since contributionStartDate (requires config setting)
--all

# Examples:
bun run pipeline ingest --after 2025-01-01 --before 2025-01-31
bun run pipeline export --days 90
bun run pipeline summarize -t contributors --after 2025-01-01
bun run pipeline summarize -t project --all -o # Regnerate and overwrite all summaries
```

Default lookback periods:

- `ingest`: 7 days
- `export`: 30 days
- `summarize`: 7 days

Note: The `--all` option requires `contributionStartDate` to be set in your pipeline config file. If not set, the commands will throw an error.

## Configuration

The pipeline is configurable through TypeScript config at `config/pipeline.config.ts`, where you can customize:

- Repositories to track
- Scoring rules for different contribution types (PRs, issues, reviews, code changes)
- Tag definitions and weights (area, role, and tech tags)
- Bot user exclusion list
- AI summarization settings (optional)

## Pipeline Architecture

The pipeline system uses a functional programming approach with composable operations:

- **Pipeline Steps**: Type-safe, composable functions that transform data
- **Pipeline Context**: Shared state and configuration passed between steps
- **Core Utilities**:
  - `pipe()`: Chain operations sequentially
  - `parallel()`: Run operations concurrently
  - `mapStep()`: Apply a pipeline to each item in an array
  - `createStep()`: Create a typed pipeline step with proper logging

## Creating New Pipelines

To create a new pipeline:

1. Create a new directory under `src/lib/pipelines/` for your pipeline
2. Define your pipeline context by extending `BasePipelineContext`
3. Create individual pipeline steps using `createStep()`
4. Compose steps using `pipe()`, `parallel()`, and `mapStep()`
5. Export your pipeline from an `index.ts` file

If your pipeline needs to operate on time intervals, you can compose the `src/lib/pipelines/generateTimeIntervals.ts` step. See implementation in existing pipelines for an example.

## Key Components

The pipeline system consists of several key components:

- `src/lib/data/github.ts` - GitHub API integration
- `src/lib/data/schema.ts` - Database schema with relations
- `src/lib/data/db.ts` - Database connection and configuration
- `src/lib/data/types.ts` - Core data type definitions

- `src/lib/pipelines/types.ts` - Pipeline type definitions and core utilities
- `src/lib/pipelines/runPipeline.ts` - Pipeline execution utilities
- `src/lib/pipelines/pipelineConfig.ts` - Configuration schemas and types
- `src/lib/pipelines/queryHelpers.ts` - SQL query builder helpers
- `src/lib/pipelines/codeAreaHelpers.ts` - Utilities for code area categorization
- `src/lib/pipelines/getSelectedRepositories.ts` - Repository selection utilities
- `src/lib/pipelines/generateTimeIntervals.ts` - Date range generation utilities

- `src/lib/pipelines/ingest/` - Data ingestion pipeline components
- `src/lib/pipelines/summarize/` - AI summarization pipeline components
- `src/lib/pipelines/contributors/` - Contributor analysis pipeline components
- `src/lib/pipelines/export/` - Data export pipeline components

## Customization

You can customize the pipeline system in several ways:

- **Configuration**: Modify `src/lib/pipelines/pipelineConfig.ts` to adjust scoring weights, repositories, and tags
- **New Pipeline Steps**: Create custom steps using the functional pipeline utilities in `types.ts`
- **Custom Processing**: Add domain-specific logic in separate modules following the pattern in existing pipelines like `/contributors/` and `/summarize/`
- **Database Schema**: Extend the database schema in `src/lib/data/schema.ts` and run migrations
- **Query Helpers**: Use or extend the SQL query helpers in `queryHelpers.ts` for consistent database access
