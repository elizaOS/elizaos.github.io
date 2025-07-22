# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Overview

GitHub Contributor Analytics Generator for tracking, analyzing, and visualizing GitHub repository contributions. Features include:

- Daily, weekly, and monthly reports on repository activity
- Contributor profile pages with metrics and visualizations
- Activity tracking for PRs, issues, and commits
- Scoring system for ranking contributors
- AI-powered activity summaries

## Tech Stack

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- Data Processing: TypeScript pipeline with SQLite/Drizzle ORM
- Legacy Scripts: Python for data processing and AI summaries
- Automation: GitHub Actions for scheduled reports

# Commands for ElizaOS Contributor Analytics

## Build & Development

- `bun run dev` - Start development server
- `bun run build` - Build production site
- `bun run check` - Run linter and type checks
- `bun run lint` - Run ESLint only
- `bunx tsc --noEmit` - Run TypeScript checks
- `bun run serve` - Serve built site
- `bun run db:generate` - Generate database schema
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Launch Drizzle studio
- `bun run pipeline` - Run data processing pipeline
- `bun run pipeline ingest` - Ingest GitHub data
- `bun run pipeline process` - Process and analyze data

## Pipeline Commands

### Data Ingestion

- `bun run pipeline ingest` - Ingest latest GitHub data (default 7 days)
- `bun run pipeline ingest --after 2024-10-15` - Ingest from specific date
- `bun run pipeline ingest --days 30` - Ingest specific number of days
- `bun run pipeline ingest -v` - Verbose logging

### Data Processing

- `bun run pipeline process` - Process and analyze all repositories
- `bun run pipeline process --force` - Force recalculation of scores
- `bun run pipeline process --repository owner/repo` - Process specific repo

### Export and Summarization

- `bun run pipeline export` - Export repository stats (30 days default)
- `bun run pipeline export --all` - Export all data since start date
- `bun run pipeline summarize -t repository` - Generate repo summaries
- `bun run pipeline summarize -t contributors` - Generate contributor summaries
- `bun run pipeline summarize -t overall` - Generate overall summaries

## Code Style

- Next.js 15 app router with TypeScript and Tailwind CSS
- Import order: React, libraries, local components (@/components), utils
- Component names: PascalCase, file names: kebab-case
- Use TypeScript for all files with strict typing
- Use React hooks and functional components
- Strict error handling with TypeScript's strict mode
- Use shadcn/ui component library and Lucide icons
- SQLite database with Drizzle ORM
- Follow modern Next.js patterns with server components where appropriate

## Project Structure

- `config/` - Configuration files including pipeline settings
- `src/lib/data/` - Database schema and data processing logic
- `src/lib/` - Utility and helper functions
- `src/components/` - React components for the web interface
- `cli/` - TypeScript pipeline CLI code
- `drizzle/` - Database migration files

## Key Architecture Components

### Database Layer (Drizzle ORM + SQLite)

- **Schema Location**: `src/lib/data/schema.ts`
- **Database Config**: `drizzle.config.ts` - points to `data/db.sqlite`
- **Migrations**: Auto-generated in `drizzle/` directory
- **Key Tables**: users, repositories, pullRequests, issues, reviews, comments, scores
- **Wallet Integration**: Support for multi-chain wallet addresses per user

### Pipeline System (`src/lib/pipelines/`)

- **Modular Architecture**: Separate pipelines for ingest, process, export, summarize
- **Context Pattern**: Each pipeline uses context objects for shared state
- **Configuration**: Centralized in `config/pipeline.config.ts`
- **Main Entry Point**: `cli/analyze-pipeline.ts`

### Scoring System (`src/lib/scoring/`)

- **Complex Algorithm**: Multi-dimensional scoring based on PR/issue/review activity
- **Tag-based Weighting**: Different weights for core, UI, docs, tests areas
- **Role Recognition**: Architect, maintainer, feature-dev, bug-fixer roles
- **Technology Expertise**: TypeScript, React, Next.js, database specializations

### Frontend Architecture (Next.js 15 App Router)

- **Route Structure**: `/app/[interval]/[[...date]]/` for dynamic date-based pages
- **Component System**: Modular UI components in `src/components/`
- **Profile Pages**: Dynamic user profiles with contribution metrics
- **Theming**: Dark/light mode support with next-themes

### Data Processing Workflow

1. **Ingest**: Fetch from GitHub API → Store raw data in SQLite
2. **Process**: Calculate scores, tags, expertise levels
3. **Export**: Generate JSON/MD files for static consumption
4. **Summarize**: AI-generated summaries using OpenRouter API

## Configuration Files

### Pipeline Configuration (`config/pipeline.config.ts`)

- Repository tracking settings
- Bot user exclusions
- Detailed scoring rules for PRs, issues, reviews, comments
- Tag definitions for areas, roles, and technologies
- AI summary configuration with model selection

### Environment Variables Required

- `GITHUB_TOKEN` - GitHub Personal Access Token (required)
- `OPENROUTER_API_KEY` - For AI summaries (optional)
- `SMALL_MODEL` / `LARGE_MODEL` - Override default AI models

## Database Schema Key Points

### Users Table

- Primary key: `username`
- Tracks `walletDataUpdatedAt` for multi-chain wallet support
- Bot detection with `isBot` flag

### Activity Tables

- `pullRequests`, `issues`, `reviews`, `comments` - Core activity tracking
- Foreign key relationships to users and repositories
- Timestamps for temporal analysis

### Scoring Tables

- `scores` - Calculated contributor scores with date ranges
- `tags` - Applied tags for expertise and area classification

## GitHub Actions Workflows

### `run-pipelines.yml`

- Runs daily at 23:00 UTC
- Full pipeline chain: ingest → process → export → summarize
- Uses custom actions for data branch management
- Stores results in `_data` branch

### `deploy.yml`

- Deploys to GitHub Pages
- Restores data from `_data` branch before build
- Triggered on main branch changes or manual dispatch

### `pr-checks.yml`

- Linting, type checking, build verification
- Tests pipeline on sample data
- Migration validation

## Data Branch Strategy

- **Code Branch**: `main` - Contains application code
- **Data Branch**: `_data` - Contains generated data, SQLite dumps
- **Benefits**: Clean git history, efficient CI/CD, collaborative development
- **Database Serialization**: Uses sqlite-diffable for version-controlled DB dumps

## Development Workflow

### Schema Changes

1. Modify `src/lib/data/schema.ts`
2. Run `bun run db:generate` to create migration
3. Run `bun run db:migrate` to apply changes
4. Consider squashing migrations before PR submission

### Testing Pipeline Changes

- Use `bun run pipeline --help` to see all options
- Test with small date ranges: `--days 7`
- Use `--force` flags to regenerate existing data
- Enable verbose logging with `-v` flag

### Local Development Setup

1. Clone repository
2. Run `bun install`
3. Set up `.env` with required tokens
4. Choose: `bun run db:migrate` (empty DB) or `bun run data:sync` (production data)
5. Run `bun run dev` for development server

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
