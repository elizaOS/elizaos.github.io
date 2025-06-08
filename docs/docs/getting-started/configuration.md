---
sidebar_position: 2
---

# Configuration

After installing the project, you need to initialize the database. You have two options: initialize an empty database or sync the latest data from our production environment.

## Option A: Initialize an Empty Database

This option is best if you want to start fresh and ingest data from scratch.

```bash
# Apply database migrations to create the schema
bun run db:migrate
```

This will set up all the necessary tables in your local `data/db.sqlite` file.

## Option B: Sync Production Data

This is the recommended option if you want a complete historical dataset without having to run the ingestion pipeline for a long time. This command requires you to have `uv` installed.

### Installing `uv`

If you don't have `uv`, you can install it via one of these methods:

```bash
# Recommended method
pipx install uv

# macOS with Homebrew
brew install uv
```

For more installation options, see the [official `uv` documentation](https://docs.astral.sh/uv/getting-started/installation/).

### Running the Sync

Once `uv` is installed, run the `data:sync` command:

```bash
# Download the latest data from production
bun run data:sync
```

This command will:

- Fetch the latest data from the `_data` branch.
- Copy all data files (stats, summaries, etc.).
- Restore the SQLite database from the diffable dump.

If you have made local changes to the database schema that don't exist in the production database, you will need to generate and apply your migrations after syncing:

```bash
bun run db:generate
bun run db:migrate
```

The `data:sync` utility supports several options. You can view them all with:

```bash
bun run data:sync --help
```

## Exploring the Database

After setting up your database with either method, you can explore it using Drizzle Studio:

```bash
# Launch the database explorer
bun run db:studio
```

---

## Command Reference

This section provides a detailed reference for the project's command-line interface (CLI).

### Main Pipeline Commands

The core of the project is the data pipeline, which can be run using a series of commands. You can see the main pipelines and their usage with the `-h` or `--help` flag:

```bash
bun run pipeline ingest -h
bun run pipeline process -h
bun run pipeline export -h
bun run pipeline summarize -h
```

#### Data Ingestion (`ingest`)

This command fetches data from the GitHub API.

**Usage:**

```bash
bun run pipeline ingest [options]
```

**Options:**

- `--after <date>`: Ingest data created after a specific date (e.g., `2024-10-15`).
- `--before <date>`: Ingest data created before a specific date.
- `--days <number>`: Ingest data for a specific number of days.
- `-v`, `--verbose`: Enable verbose logging.
- `--config <path>`: Use a custom configuration file.

#### Data Processing (`process`)

This command analyzes the ingested data to calculate scores and other metrics.

**Usage:**

```bash
bun run pipeline process [options]
```

**Options:**

- `--force`: Force recalculation of scores, even if they already exist.
- `--repository <owner/repo>`: Process a specific repository.
- `-v`, `--verbose`: Enable verbose logging.
- `--config <path>`: Use a custom configuration file.

#### Exporting Stats (`export`)

This command generates structured JSON files from the processed data.

**Usage:**

```bash
bun run pipeline export [options]
```

**Options:**

- `--after <date>`: Export data from after a specific date.
- `--before <date>`: Export data from before a specific date.
- `--days <number>`: Export data for a specific number of days.
- `--all`: Export all data since the `contributionStartDate` in the config.
- `-r`, `--repository <owner/repo>`: Export data for a specific repository.
- `--output-dir <path>`: Export to a custom directory.
- `-v`, `--verbose`: Enable verbose logging.
- `--force`: Regenerate and overwrite existing files.

#### AI Summaries (`summarize`)

This command generates AI-powered summaries of project and contributor activity.

**Usage:**

```bash
bun run pipeline summarize -t <type> [options]
```

**Options:**

- `-t`, `--type <type>`: The type of summary to generate (`project` or `contributors`).
- `--after <date>`: Summarize data from after a specific date.
- `--before <date>`: Summarize data from before a specific date.
- `--days <number>`: Summarize data for a specific number of days.
- `--all`: Summarize all data since `contributionStartDate`.
- `--weekly`: Generate only weekly contributor summaries.
- `--repository <owner/repo>`: Summarize a specific repository.
- `-v`, `--verbose`: Enable verbose logging.
- `-f`, `--force`: Force overwrite of existing summaries.

### Database Management

- `bun run db:generate`: Generate database migration files after changing the schema.
- `bun run db:migrate`: Apply database migrations to update the database.
- `bun run db:studio`: Launch the interactive database explorer.

### Website

- `bun run dev`: Start the local development server.
- `bun run build`: Build the production website to the `out/` directory.
- `bun run serve`: Serve the built website locally.
- `bun run check`: Run the linter and type checker.
