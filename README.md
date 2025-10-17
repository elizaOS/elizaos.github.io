# Eliza Leaderboard

A modern analytics pipeline for tracking and analyzing GitHub contributions. The system processes contributor data, generates AI-powered summaries, and maintains a leaderboard of developer activity.

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- GitHub Personal Access Token with repo scope
- [OpenRouter API Key](https://openrouter.ai/) (optional, for AI summaries)
- [uv](https://astral.sh/uv) (optional, for syncing from production DB)

## Features

- Tracks pull requests, issues, reviews, and comments
- Calculates contributor scores based on activity and impact
- Generates AI-powered summaries of contributions
- Exports daily summaries to JSON files
- Maintains contributor expertise levels and focus areas
- Interactive contributor profile pages
- Activity visualizations and metrics
- Daily, weekly, and monthly reports
- Smart contributor scoring system

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables in `.env` using `.env.example` for reference:

```bash
# Required for Github Ingest
GITHUB_TOKEN=your_github_personal_access_token_here
# Required for AI summaries
OPENROUTER_API_KEY=your_api_key_here
# configure local environment to use cheaper models
LARGE_MODEL=openai/gpt-4o-mini

# Optional site info
SITE_URL=https://elizaos.github.io
SITE_NAME="ElizaOS Leaderboard"
```

Then load the environment variables:

```bash
source .envrc
# Or if using direnv: direnv allow
```

3. Configure repositories in `config/pipeline.config.ts`:

```typescript
export default {
  // Repositories to track
  repositories: [
    {
      owner: "elizaos",
      name: "eliza",
    },
  ],

  // Bot users to ignore
  botUsers: ["dependabot", "renovate-bot"],

  // Scoring and tag configuration...

  // AI Summary configuration
  aiSummary: {
    enabled: true,
    apiKey: process.env.OPENROUTER_API_KEY,
    // ...
  },
};
```

4. Initialize Database

You can either initialize an empty database or sync the latest data from production:

Option A - Initialize Empty Database:

```bash
# Apply migrations
bun run db:migrate
```

Option B - Sync Production Data:

If you want to download all historical data from the production data branch instead of having to reingest / generate it on your own, you can use the data:sync command, which depends on [uv](https://astral.sh/uv).

```bash
# Install uv first if you don't have it (required for database restoration)

pipx install uv  # Recommended method
# OR
brew install uv  # macOS with Homebrew

# More installation options: https://docs.astral.sh/uv/getting-started/installation/
```

```bash

# Download the latest data from production
bun run data:sync
# Or, if you are on a fork:
bun run data:sync --remote upstream
# This will:
# - Fetch the latest data from the _data branch
# - Copy all data files (stats, summaries, etc.)
# - Restore the SQLite database from the diffable dump

# If you made local changes to the schema that don't exist in prod DB:
bun run db:generate
bun run db:migrate
```

The data sync utility supports several options:

```bash
# View all options
bun run data:sync --help

# Skip confirmation prompts (useful in scripts)
bun run data:sync -y

# Sync from a different remote (if you've added one)
bun run data:sync --remote upstream

# Skip database restoration (only sync generated JSON/MD files)
bun run data:sync --skip-db

# Delete all local data and force sync
bun run data:sync --force
```

After syncing or initializing the database, you can explore it using Drizzle Studio:

```bash
# Launch the database explorer
bun run db:studio
```

If you encounter any issues with Drizzle Studio due to Node.js version mismatches, you can use a different SQLite browser tool like [SQLite Browser](https://sqlitebrowser.org/).

## Commands and Capabilities

You can see the main pipelines and their usages with these commands below:

```bash
bun run pipeline ingest -h
bun run pipeline process -h
bun run pipeline export -h
bun run pipeline summarize -h
```

### Data Ingestion

```bash
# Ingest latest Github data (default since last fetched, or 7 days)
bun run pipeline ingest

# Ingest from beginning
bun run pipeline ingest --after 2024-10-15

# Ingest with specific date range
bun run pipeline ingest --after 2025-01-01 --before 2025-02-20

# Ingest data for a specific number of days
bun run pipeline ingest --days 30 --before 2024-03-31

# Ingest with verbose logging
bun run pipeline ingest -v

# Ingest with custom config file
bun run pipeline ingest --config custom-config.ts
```

### Data Processing and Analysis

```bash
# Process and analyze all repositories
bun run pipeline process

# Force recalculation of scores even if they already exist
bun run pipeline process --force

# Process specific repository
bun run pipeline process --repository owner/repo

# Process with verbose logging
bun run pipeline process -v

# Process with custom config
bun run pipeline process --config custom-config.ts

```

### Generating Stats and Exports

```bash
# Export repository stats (defaults to 30 days)
bun run pipeline export

# Export with specific date range
bun run pipeline export --after 2025-01-01 --before 2025-02-20

# Export for a specific number of days
bun run pipeline export --days 60

# Export all data since contributionStartDate
bun run pipeline export --all

# Export for specific repository
bun run pipeline export -r owner/repo

# Export to custom directory
bun run pipeline export --output-dir ./custom-dir/

# Export with verbose logging
bun run pipeline export -v

# Regenerate and overwrite existing files
bun run pipeline export --force
```

### AI Summary Generation

Generated project summaries are stored in `data/<owner_repo>/<interval>/summaries/summary_<date>.json`.

```bash
# Generate repository-level summaries
bun run pipeline summarize -t repository

# Generate overall summaries (after repository summaries are generated)
bun run pipeline summarize -t overall

# Generate contributor summaries
bun run pipeline summarize -t contributors

# Generate summaries with specific date range
bun run pipeline summarize -t repository --after 2025-01-01 --before 2025-02-20

# Force overwrite existing summaries
bun run pipeline summarize -t repository --force

# Generate and overwrite summaries for a specific number of days (default 7 days)
bun run pipeline summarize -t repository --days 90 --force

# Generate repository summaries for all data since contributionStartDate
bun run pipeline summarize -t repository --all

# Generate summaries for a specific repository
bun run pipeline summarize -t repository --repository owner/repo

# Generate only daily and weekly contributor summaries
bun run pipeline summarize -t contributors --daily --weekly

# Generate summaries with verbose logging
bun run pipeline summarize -t repository -v
```

By default, the summarize command wont regenerate summaries that already exist for a given day. To regenerate summaries, you can pass in the -f/--force flag.

### Database Management

```bash
# Generate database migration files
bun run db:generate

# Apply database migrations
bun run db:migrate

# Launch interactive database explorer
bun run db:studio
```

### Website Generation

```bash
# Build and generate contributor profile pages
bun run build

# View the site
bunx serve@latest out
```

## CI/CD and Data Management

The project uses GitHub Actions for automated data processing, summary generation, and deployment. The system maintains separate branches for code and data to optimize Git history management.

### GitHub Actions Workflows

- **Run Pipelines (`run-pipelines.yml`)**: Runs daily at 23:00 UTC to fetch GitHub data, process it, and generate summaries

  - Runs the full `ingest → process → export → summarize` pipeline chain
  - Maintains data in a dedicated `_data` branch
  - Can be manually triggered from Github Actions tab with custom date ranges or forced regeneration
  - Runs repository and overall summaries daily, but only runs contributor summaries on Sundays

- **Deploy to GitHub Pages (`deploy.yml`)**: Builds and deploys the site

  - Triggered on push to main, manually, or after successful pipeline run
  - Restores data from the `_data` branch before building
  - Generates directory listings for the data folder
  - Deploys to GitHub Pages

- **PR Checks (`pr-checks.yml`)**: Quality checks for pull requests
  - Runs linting, typechecking, and build verification
  - Tests the pipeline on a small sample of data
  - Verifies migrations are up to date when schema changes

### Data Management Architecture

The project uses a specialized data branch strategy to optimize both code and data storage:

1. **Separate Data Branch**: All pipeline data is stored in a separate branch (default: `_data`)

   - Keeps the main branch clean and focused on code
   - Prevents data changes from cluttering code commits
   - Enables efficient data restoration in CI/CD and deployment

2. **Database Serialization**: Uses the [sqlite-diffable](https://github.com/simonw/sqlite-diffable) utility to store database content as version-controlled files

   - Converts SQLite database to diffable text files in `data/dump/`
   - Enables Git to track database changes efficiently
   - Provides an audit trail
   - Allows for database "time travel" via git history

3. **Custom GitHub Actions**: Two custom actions are used in the workflows:
   - `restore-db`: Restores data from the data branch using sparse checkout
   - `pipeline-data`: Manages worktrees to retrieve and update data in the \_data branch

This architecture ensures:

- Efficient Git history management (code changes separate from data changes)
- Reliable CI/CD workflows with consistent data access
- Simplified deployment with automatic data restoration
- Effective collaboration without data conflict issues

## Development

## Deploying Your Own Instance

### GitHub Pages Configuration

This project deploys to the root of elizaos.github.io. If you fork this repository to deploy to a subdirectory (e.g., `username.github.io/repo-name`):

1. **Update `next.config.js`** - Add `basePath` to match your repository name:

   ```javascript
   const nextConfig = {
     output: "export",
     basePath: "/repo-name", // Add this line - replace with your repo name
     images: {
       unoptimized: true,
     },
     typescript: {
       tsconfigPath: "tsconfig.nextjs.json",
     },
   };
   ```

2. **Enable GitHub Pages**:

   - Go to repository Settings → Pages
   - Source: "GitHub Actions"
   - Save

3. **Add Required Secrets** (Settings → Secrets and variables → Actions):

   - `OPENROUTER_API_KEY` - Required for AI summary generation
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID` - Optional, for wallet linking feature
   - `NEXT_PUBLIC_AUTH_WORKER_URL` - Optional, for wallet linking feature

4. **Enable Workflows**:

   - Go to Actions tab
   - Enable workflows if prompted
   - Manually trigger "Run Pipelines" to generate initial data

5. **Access Your Site**:
   - Root deployment: `https://your-org.github.io/`
   - Subdirectory deployment: `https://your-username.github.io/repo-name/`

### Deployment Architecture

The site automatically deploys via GitHub Actions:

- **Data Generation**: `run-pipelines.yml` runs daily at 23:00 UTC
  - Ingests GitHub data, processes contributions, generates summaries
  - Stores data in `_data` branch (SQLite dumps, stats files, summaries)
  - Never commits large binary files to main branch
- **Site Build**: `deploy.yml` triggers on push to main or after pipeline runs
  - Restores data from `_data` branch
  - Builds Next.js static site
  - Deploys to GitHub Pages

**Note**: If deploying to a custom domain, update `basePath` in `next.config.js` accordingly (may need to remove it entirely for root domains).

### Taskmaster for AI-Assisted Development

The project is set up to work with [Taskmaster](https://github.com/eyaltoledano/claude-task-master), an AI-powered task management tool. You can use it directly via the `task-master` command-line interface (CLI) or through its MCP server for integration with development environments like Cursor.

#### MCP Setup (for IDE Integration)

To use Taskmaster's AI capabilities within an integrated development environment, you'll need to configure the MCP server. Add the following to your IDE's MCP settings file (e.g., `.cursor/mcp.json` in your project or a global user setting):

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "PERPLEXITY_API_KEY": "YOUR-KEY-HERE",
        "OPENROUTER_API_KEY": "YOUR-KEY-HERE"
      }
    }
  }
}
```

You can add other API keys for providers like Anthropic (`ANTHROPIC_API_KEY`) or Google (`GOOGLE_API_KEY`) to the `env` object. To use different models, you can configure them via the `task-master models` command after setup.

For more detailed guides, refer to the official Taskmaster documentation:

- [Tutorial](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/tutorial.md)
- [Configuration Guide](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/configuration.md)

### TypeScript Pipeline

The project uses a TypeScript-based pipeline for data processing. See [Pipeline Documentation](cli/pipelines.md) for detailed information about:

- Basic usage and commands
- Pipeline architecture and components
- Configuration options
- Creating custom pipelines
- Available customization points

### Updating schema

If you need to modify the database schema (in `src/lib/data/schema.ts`), follow these steps:

1.  Make your changes to the schema file
2.  Generate migration files:

```bash
bun run db:generate
```

This will create new migration files in the `drizzle` directory.

3. Apply migrations

```bash
bun run db:migrate
```

This updates your local database with the new schema changes

### Working with Migrations

During development, you might create several migration files as you iterate on your schema. Before submitting a pull request, it's best practice to squash these into a single, clean migration.

**Squashing Migrations for a Pull Request**

1.  **Identify Your New Migrations**: Take note of the new migration files you've added in your branch. These are the files you will consolidate.

2.  **Delete Your New Migration Files**: Remove the migration files (`drizzle/*.sql`) and the corresponding snnapshots (`drizzle/meta/####_snapshot.json`) and entries in `drizzle/meta/_journal.json` that were created from running `db:generate`.

3.  **Generate a Single, Consolidated Migration**: Run the `db:generate` command again. This will create one new migration file that contains all of your schema changes.

    ```bash
    bun run db:generate
    ```

4.  **Apply the New Migration**: Run the `migrate` command to apply the squashed migration to your local database.

    ```bash
    bun run db:migrate
    ```

5.  **Re-ingest Data (If Necessary)**: If your schema changes impact how data is structured, you may need to re-ingest data to reflect those changes correctly.
    ```bash
    # Example: Force re-ingestion for the last 7 days
    bun run pipeline ingest --days 7 --force
    ```

**Handling Migration Errors**

If you encounter errors during the migration process (e.g., "table already exists" or "no such column"), your local database may be out of sync. The most reliable way to fix this is to start fresh by resetting your local data and applying all migrations in order.

1.  **Reset your local database**:
    ```bash
    rm data/db.sqlite
    ```
2.  **Sync with production data**: This gives you a clean, production-like state.
    ```bash
    bun run data:sync -y --remote upstream
    ```
3.  **Apply your new migration**:
    ```bash
    bun run db:migrate
    ```

### Database Explorer

To interactively explore the database and its contents:

```bash
bun run db:studio
```

This launches Drizzle Studio, which provides a visual interface to browse tables, relationships, run queries, and export data.

Additional setup required if you use Safari or Brave: https://orm.drizzle.team/docs/drizzle-kit-studio#safari-and-brave-support

## Troubleshooting

### Common Issues

1. **"GITHUB_TOKEN environment variable is required"**

   - Ensure your GitHub token is set in `.env` and the environment is loaded
   - You can also run commands with the token directly: `GITHUB_TOKEN=your_token bun run pipeline ingest -d 10`
   - GitHub Personal Access Token permissions:
     - Contents: Read and write
     - Metadata: (auto-enabled)
     - Actions: Read and write
     - Pages: Read and write

2. **"No such table: repositories"**

   - Run `bun run db:generate` and `bun run db:migrate` to initialize the database
   - Ensure the `data` directory exists: `mkdir -p data`

3. **"Error fetching data from GitHub"**

   - Check your GitHub token has proper permissions
   - Verify repository names are correct in config
   - Ensure your token has not expired

### Debugging

For more detailed logs, add the `-v` or `--verbose` flag to any command:

```bash
bun run pipeline ingest -d 10 -v
```

## Directory Structure

```
.
├── data/               # Generated data and reports
│   └── db.sqlite       # SQLite database
├── cli/                # CLI program for pipeline
│   └── analyze-pipeline.ts  # Run typescript pipeline
├── config/             # Configuration files
│   └── pipeline.config.ts  # TypeScript pipeline configuration
├── drizzle/            # Database migration files
├── src/
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   │   └── ui/         # shadcn/ui components
│   │
│   └── lib/
│       ├── pipelines/  # Modular pipeline system
│       │   ├── contributors/  # Contributor-specific pipeline components
│       │   ├── export/        # Pipelines to export JSON data
│       │   ├── ingest/        # Data ingestion pipeline components
│       │   ├── summarize/     # Pipelines to generate AI summaries
│       ├── data/          # Data sources and storage
│       │   ├── db.ts      # Database connection and configuration
│       │   ├── github.ts  # GitHub API integration
│       │   ├── ingestion.ts  # Data ingestion from GitHub API
│       │   ├── schema.ts  # Database schema definitions
│       │   └── types.ts   # Core data type definitions
│       ├── logger.ts      # Logging system
│       └── typeHelpers.ts # TypeScript helper utilities
├── profiles/           # Generated static profiles
└── .github/workflows   # Automation workflows
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
