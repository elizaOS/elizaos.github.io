# TypeScript Pipeline Documentation

The primary data processing system is a TypeScript-based pipeline that leverages SQLite and Drizzle ORM for improved data management.

## Basic Usage

```bash
# Ingest GitHub data
bun run pipeline ingest

# Process and analyze
bun run pipeline process
```

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

### Example Pipeline Definition

```typescript
// Example pipeline definition
const myPipeline = pipe(
  // Step 1: Fetch data
  createStep("fetchData", async (input, context) => {
    // Fetch and return data
  }),

  // Step 2: Process each item in parallel
  mapStep(
    parallel(
      // Run these operations in parallel for each item
      calculateMetrics,
      generateSummary
    )
  ),

  // Step 3: Format results
  createStep("formatResults", (results, context) => {
    // Process and return final results
  })
);
```

## Creating New Pipelines

To create a new pipeline:

1. Define your pipeline context by extending `BasePipelineContext` or `RepoPipelineContext`
2. Create individual pipeline steps using `createStep()`
3. Compose steps using `pipe()`, `parallel()`, and `mapStep()`
4. Create a context factory function like `createContributorPipelineContext()`
5. Use `runPipeline()` to execute your pipeline with the appropriate context

## Key Components

The pipeline system consists of several key components:

- `src/lib/data/github.ts` - GitHub API integration
- `src/lib/data/ingestion.ts` - Data ingestion into SQLite
- `src/lib/data/processing/pipelines.ts` - Predefined pipeline definitions
- `src/lib/data/processing/runPipeline.ts` - Pipeline execution utilities
- `src/lib/data/processing/types.ts` - Core pipeline type definitions and utilities
- `src/lib/data/processing/contributors/` - Contributor-specific pipeline steps
- `src/lib/data/scoring.ts` - Contributor scoring algorithms
- `src/lib/data/schema.ts` - Database schema with relations

## Customization

You can customize the pipeline system in several ways:

- **Configuration**: Modify `config/pipeline.config.ts` to adjust scoring weights, repositories, and tags
- **New Pipeline Steps**: Create custom steps in `src/lib/data/processing/` using the functional pipeline utilities
- **Custom Processing**: Add domain-specific logic in separate modules following the pattern in `contributors/`
- **Database Schema**: Extend the database schema in `src/lib/data/schema.ts` and run migrations
