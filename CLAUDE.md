# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Contributor Analytics platform for tracking, analyzing, and visualizing repository contributions. Features include:

- Daily, weekly, and monthly reports on repository activity
- Contributor profile pages with metrics and visualizations
- Activity tracking for PRs, issues, and commits
- Configurable scoring system for ranking contributors
- AI-powered activity summaries

## Tech Stack

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- Data Processing: TypeScript pipeline with SQLite/Drizzle ORM
- Automation: GitHub Actions for scheduled reports

## Build & Development Commands

```bash
bun run dev          # Start development server
bun run build        # Build production site
bun run check        # Run linter and type checks
bun run lint         # Run ESLint only
bun run db:generate  # Generate database schema
bun run db:migrate   # Run database migrations
bun run db:studio    # Launch Drizzle studio
```

## Pipeline Commands

```bash
# Data Ingestion
bun run pipeline ingest              # Ingest latest GitHub data (default 7 days)
bun run pipeline ingest --days 30    # Ingest specific number of days
bun run pipeline ingest -v           # Verbose logging

# Data Processing
bun run pipeline process             # Process and analyze all repositories
bun run pipeline process --force     # Force recalculation of scores

# Export and Summarization
bun run pipeline export              # Export repository stats
bun run pipeline summarize -t repository    # Generate repo summaries
bun run pipeline summarize -t contributors  # Generate contributor summaries
bun run pipeline summarize -t overall       # Generate overall summaries
```

## Code Style

- Next.js 15 app router with TypeScript and Tailwind CSS
- Component names: PascalCase, file names: kebab-case
- Use TypeScript strict mode
- Use shadcn/ui component library and Lucide icons
- SQLite database with Drizzle ORM
- Prefer inference over manual type signatures
- Avoid `any` type - fix underlying type issues instead

## Project Structure

```
config/              # Pipeline configuration (config/example.json)
src/app/             # Next.js app router pages
src/components/      # React components
src/lib/data/        # Database schema (schema.ts)
src/lib/pipelines/   # Data processing pipelines
src/lib/scoring/     # Contribution scoring algorithms
cli/                 # Pipeline CLI (analyze-pipeline.ts)
drizzle/             # Database migrations
```

## Key Architecture

### Database (Drizzle ORM + SQLite)

- Schema: `src/lib/data/schema.ts`
- Tables: users, repositories, pullRequests, issues, reviews, comments, scores

### Pipeline System

- Modular: ingest → process → export → summarize
- Config: `config/pipeline.config.ts` reads from `PIPELINE_CONFIG_FILE`
- Entry: `cli/analyze-pipeline.ts`

### Frontend (Next.js 15)

- Static site generation at build time
- Server components query SQLite during build
- Deployed to GitHub Pages

## Configuration

Pipeline config is loaded from JSON file specified by `PIPELINE_CONFIG_FILE` env var:

```bash
# Local development
export PIPELINE_CONFIG_FILE=config/example.json

# CI/CD uses workflow env vars with fallback to config/example.json
```

See `config/example.json` for all configurable options including:

- Repository list
- Scoring rules
- Bot user exclusions
- AI model settings

## Environment Variables

- `GITHUB_TOKEN` - GitHub Personal Access Token (required)
- `OPENROUTER_API_KEY` - For AI summaries (optional)
- `PIPELINE_CONFIG_FILE` - Path to config JSON (default: config/example.json)

## GitHub Actions Workflows

- `run-pipelines.yml` - Daily data processing (23:00 UTC)
- `deploy.yml` - Build and deploy to GitHub Pages
- `pr-checks.yml` - Lint, typecheck, build verification

## Data Branch Strategy

- `main` branch: Application code
- `_data` branch: Generated data and SQLite dumps

## Development Workflow

```bash
# 1. Clone and install
bun install

# 2. Set up environment
export PIPELINE_CONFIG_FILE=config/example.json
export GITHUB_TOKEN=your_token

# 3. Initialize database
bun run db:migrate              # Empty DB
# OR
bun run data:sync               # Sync production data

# 4. Start development
bun run dev
```

## Important Reminders

- Do what has been asked; nothing more, nothing less
- Prefer editing existing files over creating new ones
- Don't create documentation files unless explicitly requested
