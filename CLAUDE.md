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

## Automation Scripts

### Daily Automation

- `./scripts/daily-automation.sh` - Continuous daily pipeline automation (24-hour loop)
- Runs complete sequence: ingest → process → export → summarize (all types)
- Perfect for local development or simple server deployments

### Utility Scripts

- `./scripts/verify-data.sh` - Data quality verification and gap analysis
- `./scripts/fetch_github.py` - GitHub organization metrics collection
- See `scripts/README.md` for detailed documentation

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

# Task Master AI - Claude Code Integration Guide

## Essential Commands

### Core Workflow Commands

```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information (e.g., task-master show 1.2)
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks

# Dependencies & Organization
task-master add-dependency --id=<id> --depends-on=<id>       # Add task dependency
task-master move --from=<id> --to=<id>                       # Reorganize task hierarchy
task-master validate-dependencies                            # Check for dependency issues
task-master generate                                         # Update task markdown files (usually auto-called)
```

## Key Files & Project Structure

### Core Files

- `.taskmaster/tasks/tasks.json` - Main task data file (auto-managed)
- `.taskmaster/config.json` - AI model configuration (use `task-master models` to modify)
- `.taskmaster/docs/prd.txt` - Product Requirements Document for parsing
- `.taskmaster/tasks/*.txt` - Individual task files (auto-generated from tasks.json)
- `.env` - API keys for CLI usage

### Claude Code Integration Files

- `CLAUDE.md` - Auto-loaded context for Claude Code (this file)
- `.claude/settings.json` - Claude Code tool allowlist and preferences
- `.claude/commands/` - Custom slash commands for repeated workflows
- `.mcp.json` - MCP server configuration (project-specific)

### Directory Structure

```
project/
├── .taskmaster/
│   ├── tasks/              # Task files directory
│   │   ├── tasks.json      # Main task database
│   │   ├── task-1.md      # Individual task files
│   │   └── task-2.md
│   ├── docs/              # Documentation directory
│   │   ├── prd.txt        # Product requirements
│   ├── reports/           # Analysis reports directory
│   │   └── task-complexity-report.json
│   ├── templates/         # Template files
│   │   └── example_prd.txt  # Example PRD template
│   └── config.json        # AI models & settings
├── .claude/
│   ├── settings.json      # Claude Code configuration
│   └── commands/         # Custom slash commands
├── .env                  # API keys
├── .mcp.json            # MCP configuration
└── CLAUDE.md            # This file - auto-loaded by Claude Code
```

## MCP Integration

Task Master provides an MCP server that Claude Code can connect to. Configure in `.mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here",
        "OPENAI_API_KEY": "OPENAI_API_KEY_HERE",
        "GOOGLE_API_KEY": "GOOGLE_API_KEY_HERE",
        "XAI_API_KEY": "XAI_API_KEY_HERE",
        "OPENROUTER_API_KEY": "OPENROUTER_API_KEY_HERE",
        "MISTRAL_API_KEY": "MISTRAL_API_KEY_HERE",
        "AZURE_OPENAI_API_KEY": "AZURE_OPENAI_API_KEY_HERE",
        "OLLAMA_API_KEY": "OLLAMA_API_KEY_HERE"
      }
    }
  }
}
```

### Essential MCP Tools

```javascript
help; // = shows available taskmaster commands
// Project setup
initialize_project; // = task-master init
parse_prd; // = task-master parse-prd

// Daily workflow
get_tasks; // = task-master list
next_task; // = task-master next
get_task; // = task-master show <id>
set_task_status; // = task-master set-status

// Task management
add_task; // = task-master add-task
expand_task; // = task-master expand
update_task; // = task-master update-task
update_subtask; // = task-master update-subtask
update; // = task-master update

// Analysis
analyze_project_complexity; // = task-master analyze-complexity
complexity_report; // = task-master complexity-report
```

## Claude Code Workflow Integration

### Standard Development Workflow

#### 1. Project Initialization

```bash
# Initialize Task Master
task-master init

# Create or obtain PRD, then parse it
task-master parse-prd .taskmaster/docs/prd.txt

# Analyze complexity and expand tasks
task-master analyze-complexity --research
task-master expand --all --research
```

If tasks already exist, another PRD can be parsed (with new information only!) using parse-prd with --append flag. This will add the generated tasks to the existing list of tasks..

#### 2. Daily Development Loop

```bash
# Start each session
task-master next                           # Find next available task
task-master show <id>                     # Review task details

# During implementation, check in code context into the tasks and subtasks
task-master update-subtask --id=<id> --prompt="implementation notes..."

# Complete tasks
task-master set-status --id=<id> --status=done
```

#### 3. Multi-Claude Workflows

For complex projects, use multiple Claude Code sessions:

```bash
# Terminal 1: Main implementation
cd project && claude

# Terminal 2: Testing and validation
cd project-test-worktree && claude

# Terminal 3: Documentation updates
cd project-docs-worktree && claude
```

### Custom Slash Commands

Create `.claude/commands/taskmaster-next.md`:

```markdown
Find the next available Task Master task and show its details.

Steps:

1. Run `task-master next` to get the next task
2. If a task is available, run `task-master show <id>` for full details
3. Provide a summary of what needs to be implemented
4. Suggest the first implementation step
```

Create `.claude/commands/taskmaster-complete.md`:

```markdown
Complete a Task Master task: $ARGUMENTS

Steps:

1. Review the current task with `task-master show $ARGUMENTS`
2. Verify all implementation is complete
3. Run any tests related to this task
4. Mark as complete: `task-master set-status --id=$ARGUMENTS --status=done`
5. Show the next available task with `task-master next`
```

## Tool Allowlist Recommendations

Add to `.claude/settings.json`:

```json
{
  "allowedTools": [
    "Edit",
    "Bash(task-master *)",
    "Bash(git commit:*)",
    "Bash(git add:*)",
    "Bash(npm run *)",
    "mcp__task_master_ai__*"
  ]
}
```

## Configuration & Setup

### API Keys Required

At least **one** of these API keys must be configured:

- `ANTHROPIC_API_KEY` (Claude models) - **Recommended**
- `PERPLEXITY_API_KEY` (Research features) - **Highly recommended**
- `OPENAI_API_KEY` (GPT models)
- `GOOGLE_API_KEY` (Gemini models)
- `MISTRAL_API_KEY` (Mistral models)
- `OPENROUTER_API_KEY` (Multiple models)
- `XAI_API_KEY` (Grok models)

An API key is required for any provider used across any of the 3 roles defined in the `models` command.

### Model Configuration

```bash
# Interactive setup (recommended)
task-master models --setup

# Set specific models
task-master models --set-main claude-3-5-sonnet-20241022
task-master models --set-research perplexity-llama-3.1-sonar-large-128k-online
task-master models --set-fallback gpt-4o-mini
```

## Task Structure & IDs

### Task ID Format

- Main tasks: `1`, `2`, `3`, etc.
- Subtasks: `1.1`, `1.2`, `2.1`, etc.
- Sub-subtasks: `1.1.1`, `1.1.2`, etc.

### Task Status Values

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `deferred` - Postponed
- `cancelled` - No longer needed
- `blocked` - Waiting on external factors

### Task Fields

```json
{
  "id": "1.2",
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system",
  "status": "pending",
  "priority": "high",
  "dependencies": ["1.1"],
  "details": "Use bcrypt for hashing, JWT for tokens...",
  "testStrategy": "Unit tests for auth functions, integration tests for login flow",
  "subtasks": []
}
```

## Claude Code Best Practices with Task Master

### Context Management

- Use `/clear` between different tasks to maintain focus
- This CLAUDE.md file is automatically loaded for context
- Use `task-master show <id>` to pull specific task context when needed

### Iterative Implementation

1. `task-master show <subtask-id>` - Understand requirements
2. Explore codebase and plan implementation
3. `task-master update-subtask --id=<id> --prompt="detailed plan"` - Log plan
4. `task-master set-status --id=<id> --status=in-progress` - Start work
5. Implement code following logged plan
6. `task-master update-subtask --id=<id> --prompt="what worked/didn't work"` - Log progress
7. `task-master set-status --id=<id> --status=done` - Complete task

### Complex Workflows with Checklists

For large migrations or multi-step processes:

1. Create a markdown PRD file describing the new changes: `touch task-migration-checklist.md` (prds can be .txt or .md)
2. Use Taskmaster to parse the new prd with `task-master parse-prd --append` (also available in MCP)
3. Use Taskmaster to expand the newly generated tasks into subtasks. Consdier using `analyze-complexity` with the correct --to and --from IDs (the new ids) to identify the ideal subtask amounts for each task. Then expand them.
4. Work through items systematically, checking them off as completed
5. Use `task-master update-subtask` to log progress on each task/subtask and/or updating/researching them before/during implementation if getting stuck

### Git Integration

Task Master works well with `gh` CLI:

```bash
# Create PR for completed task
gh pr create --title "Complete task 1.2: User authentication" --body "Implements JWT auth system as specified in task 1.2"

# Reference task in commits
git commit -m "feat: implement JWT auth (task 1.2)"
```

### Parallel Development with Git Worktrees

```bash
# Create worktrees for parallel task development
git worktree add ../project-auth feature/auth-system
git worktree add ../project-api feature/api-refactor

# Run Claude Code in each worktree
cd ../project-auth && claude    # Terminal 1: Auth work
cd ../project-api && claude     # Terminal 2: API work
```

## Troubleshooting

### AI Commands Failing

```bash
# Check API keys are configured
cat .env                           # For CLI usage

# Verify model configuration
task-master models

# Test with different model
task-master models --set-fallback gpt-4o-mini
```

### MCP Connection Issues

- Check `.mcp.json` configuration
- Verify Node.js installation
- Use `--mcp-debug` flag when starting Claude Code
- Use CLI as fallback if MCP unavailable

### Task File Sync Issues

```bash
# Regenerate task files from tasks.json
task-master generate

# Fix dependency issues
task-master fix-dependencies
```

DO NOT RE-INITIALIZE. That will not do anything beyond re-adding the same Taskmaster core files.

## Important Notes

### AI-Powered Operations

These commands make AI calls and may take up to a minute:

- `parse_prd` / `task-master parse-prd`
- `analyze_project_complexity` / `task-master analyze-complexity`
- `expand_task` / `task-master expand`
- `expand_all` / `task-master expand --all`
- `add_task` / `task-master add-task`
- `update` / `task-master update`
- `update_task` / `task-master update-task`
- `update_subtask` / `task-master update-subtask`

### File Management

- Never manually edit `tasks.json` - use commands instead
- Never manually edit `.taskmaster/config.json` - use `task-master models`
- Task markdown files in `tasks/` are auto-generated
- Run `task-master generate` after manual changes to tasks.json

### Claude Code Session Management

- Use `/clear` frequently to maintain focused context
- Create custom slash commands for repeated Task Master workflows
- Configure tool allowlist to streamline permissions
- Use headless mode for automation: `claude -p "task-master next"`

### Multi-Task Updates

- Use `update --from=<id>` to update multiple future tasks
- Use `update-task --id=<id>` for single task updates
- Use `update-subtask --id=<id>` for implementation logging

### Research Mode

- Add `--research` flag for research-based AI enhancement
- Requires a research model API key like Perplexity (`PERPLEXITY_API_KEY`) in environment
- Provides more informed task creation and updates
- Recommended for complex technical tasks

---

_This guide ensures Claude Code has immediate access to Task Master's essential functionality for agentic development workflows._
