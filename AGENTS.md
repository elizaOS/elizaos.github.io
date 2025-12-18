# Contributor Analytics: Agent & Developer Guide

This document provides a comprehensive overview of the Contributor Analytics project for AI agents and human contributors.

## 1. Project Overview

A sophisticated analytics platform for GitHub repositories that tracks, analyzes, scores, and summarizes contributor activity.

**Core Features:**

- **Data Ingestion**: Fetches PRs, issues, commits, reviews, comments from GitHub API
- **Scoring System**: Configurable algorithm scoring contributions by type, complexity, impact
- **AI Summaries**: Daily, weekly, monthly summaries using LLMs (via OpenRouter)
- **Data Pipelines**: Modular TypeScript pipeline system
- **Web Interface**: Next.js static site with leaderboards and contributor profiles
- **Automation**: GitHub Actions for daily processing and deployment

**Tech Stack:**

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend/Pipelines: TypeScript, Bun
- Database: SQLite with Drizzle ORM
- CI/CD: GitHub Actions

---

## 2. System Architecture

### 2.1. Data Pipeline (`src/lib/pipelines/` & `cli/`)

The TypeScript-based pipeline system handles all data operations:

- **Entry Point**: `cli/analyze-pipeline.ts`
- **Orchestration**: Functional composition (`pipe`, `parallel`, `mapStep`)
- **Configuration**: `config/pipeline.config.ts` reads from `PIPELINE_CONFIG_FILE`

**Pipeline Stages:**

1. **Ingest**: Fetch from GitHub API → store in SQLite
2. **Process**: Calculate scores and expertise tags
3. **Export**: Generate JSON/MD files for frontend
4. **Summarize**: AI-generated summaries via OpenRouter

### 2.2. Database (`src/lib/data/` & `drizzle/`)

SQLite database as single source of truth:

- **Schema**: `src/lib/data/schema.ts` using Drizzle ORM
- **Tables**: users, repositories, pullRequests, issues, reviews, comments, scores
- **Migrations**: `drizzle/` directory, managed by Drizzle Kit

### 2.3. Frontend (`src/app/` & `src/components/`)

Static Next.js 15 application for GitHub Pages:

- **SSG**: Server Components query SQLite at build time
- **Routing**: App Router with dynamic date-based pages
- **Styling**: Tailwind CSS + shadcn/ui components

### 2.4. Auth Worker (`auth-worker/`)

Cloudflare Worker for GitHub OAuth:

- Exchanges GitHub code for access token
- Enables wallet linking feature for contributor profiles

---

## 3. Automation (`.github/`)

### Workflows

- **`run-pipelines.yml`**: Daily at 23:00 UTC, runs full pipeline chain
- **`deploy.yml`**: Builds and deploys to GitHub Pages
- **`pr-checks.yml`**: Linting, type checking, build verification

### Custom Actions

- **`pipeline-data`**: Manages `_data` branch lifecycle via Git worktrees
- **`restore-db`**: Serializes/deserializes SQLite for version control

### Data Branch Strategy

- `main`: Application code
- `_data`: Generated data and SQLite dumps

---

## 4. Configuration

Pipeline reads from JSON file specified by `PIPELINE_CONFIG_FILE` env var:

```bash
# Local development
export PIPELINE_CONFIG_FILE=config/example.json
```

**Config options** (`config/example.json`):

- `PIPELINE_REPOS`: Repository list to track
- `PIPELINE_START_DATE`: Contribution tracking start date
- `PIPELINE_PROJECT_CONTEXT`: AI summary context
- `PIPELINE_SCORING`: Scoring rules for PRs, issues, reviews
- `PIPELINE_TAGS`: Area/role/tech tag definitions
- `PIPELINE_BOT_USERS`: Bot accounts to exclude

---

## 5. Development

### Data Sync Utility

Pull production data for local development:

```bash
bun run data:sync              # Sync from upstream
bun run data:sync --help       # See all options
```

### Schema Changes

1. Modify `src/lib/data/schema.ts`
2. Run `bun run db:generate`
3. Run `bun run db:migrate`

### Testing Pipelines

```bash
bun run pipeline --help        # See all options
bun run pipeline ingest -d 7   # Small date range
bun run pipeline process -f    # Force reprocess
```

---

## 6. TypeScript Guidelines

- Prefer type inference over manual signatures
- Never cast to `any` - fix underlying type issues
- Search for existing types/schemas before creating new ones
- Avoid comments on self-explanatory code
- Use `bun:test` for testing
