# Scripts Directory

Utility scripts for data processing, automation, and maintenance of the Optimism Contributor Analytics system.

## Scripts Overview

### 🤖 Automation Scripts

#### `daily-automation.sh`

Simple daily automation script that runs the complete pipeline continuously.

**Usage:**

```bash
./daily-automation.sh
```

**What it does:**

- Runs full pipeline sequence every 24 hours: `ingest → process → export → summarize`
- Executes all three summary types: overall, repository, and contributors
- Provides basic logging and error reporting
- Runs continuously until stopped with Ctrl+C

**Perfect for:** Local development environments or simple server deployments where GitHub Actions isn't preferred.

### 🔄 Data Ingestion Scripts

#### `2025-weekly-reingest.sh`

Systematic weekly re-ingestion script for ensuring complete 2025 data coverage.

**Usage:**

```bash
GITHUB_TOKEN=your_token ./2025-weekly-reingest.sh
```

**Features:**

- Processes data week by week with `--force` flag to ensure completeness
- Built-in rate limit handling and timeout protection
- Progress tracking and detailed logging
- Automatic retry logic with extended wait times
- Post-completion data verification and monthly breakdown

**When to use:** When you need to ensure complete historical data coverage or recover from incomplete ingestion runs.

### 📊 Data Analysis Scripts

#### `verify-data.sh`

Comprehensive data verification script for checking ingestion completeness and identifying gaps.

**Usage:**

```bash
./verify-data.sh
```

**Checks performed:**

- Basic data coverage (PRs and issues count, date ranges)
- Weekly activity analysis (identifies missing weeks)
- Repository coverage across all tracked repos
- Daily activity gaps (30+ day periods)
- Repository fetch status verification

**Output:** Detailed report with ❌ MISSING, ⚠️ LOW, and ✅ OK status indicators.

#### `fetch_github.py`

Minimal GitHub organization data collector focused on objective metrics.

**Usage:**

```bash
GITHUB_TOKEN=your_token python fetch_github.py --org ethereum-optimism --out optimism.json --csv optimism.csv
```

**Features:**

- Fast GraphQL-based aggregate data collection
- Efficient contributor counting with pagination headers
- No subjective analysis - pure metrics only
- Outputs both JSON and CSV formats
- Rate limit aware with automatic retry logic

**Use case:** Initial repository discovery and metrics collection for new organizations.

## General Usage Notes

### Prerequisites

- **Bun/Node.js**: Required for TypeScript pipeline commands
- **GitHub Token**: Set `GITHUB_TOKEN` environment variable for API access
- **Python 3**: Required for `fetch_github.py` script
- **SQLite**: Database verification scripts require sqlite3 command

### Environment Setup

Most scripts expect these environment variables:

```bash
export GITHUB_TOKEN=your_personal_access_token
export OPENROUTER_API_KEY=your_openrouter_key  # For AI summaries
```

### Script Permissions

Make scripts executable before running:

```bash
chmod +x scripts/*.sh
```

### Rate Limiting

All scripts include GitHub API rate limit handling:

- Automatic detection and waiting for rate limit reset
- Progressive backoff on secondary rate limits
- Timeout protection for long-running operations

### Error Handling

Scripts provide comprehensive error reporting:

- Color-coded log messages (🔴 errors, 🟡 warnings, 🟢 success)
- Detailed progress tracking
- Automatic recovery strategies where possible

## Integration with Main Pipeline

These scripts complement the main TypeScript pipeline (`bun run pipeline`) by providing:

1. **Automation**: `daily-automation.sh` for continuous operation
2. **Recovery**: `2025-weekly-reingest.sh` for fixing incomplete data
3. **Verification**: `verify-data.sh` for data quality assurance
4. **Discovery**: `fetch_github.py` for exploring new data sources

The main pipeline commands these scripts utilize:

- `bun run pipeline ingest` - GitHub data ingestion
- `bun run pipeline process` - Score calculation and analysis
- `bun run pipeline export` - JSON/MD file generation
- `bun run pipeline summarize` - AI-powered summary generation

## Troubleshooting

### Common Issues

**"GITHUB_TOKEN is not set"**

- Export your GitHub Personal Access Token: `export GITHUB_TOKEN=your_token`
- Ensure token has appropriate repository permissions

**"No such table: repositories"**

- Run database migrations: `bun run db:migrate`
- Verify database exists: `ls -la data/db.sqlite`

**Rate limit errors**

- Scripts have built-in rate limit handling
- For faster processing, use GitHub App tokens (higher rate limits)
- Consider running during off-peak hours

**Script timeouts**

- Increase timeout values in script configuration sections
- Check internet connectivity and GitHub API status
- Use `--verbose` flags for detailed debugging

### Getting Help

For pipeline-specific issues, see the main project README. For script-specific problems:

1. Check script output logs for specific error messages
2. Verify all prerequisites are installed and configured
3. Test with smaller date ranges first (`--days 7`)
4. Use verbose flags for detailed debugging information
