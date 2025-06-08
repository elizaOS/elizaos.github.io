---
sidebar_position: 1
---

# Installation

This guide will walk you through the steps to set up the project on your local machine.

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- GitHub Personal Access Token with `repo` scope
- [OpenRouter API Key](https://openrouter.ai/) (optional, for AI summaries)
- [uv](https://astral.sh/uv) (optional, for syncing from production DB)

## 1. Install Dependencies

Clone the repository and install the required dependencies using Bun:

```bash
git clone https://github.com/elizaos/elizaos.github.io.git
cd elizaos.github.io
bun install
```

To work on the documentation site, navigate to the `docs` directory and install its dependencies as well:

```bash
cd docs
bun install
```

## 2. Set Up Environment Variables

Create a `.env` file in the root of the project. You can use the `.env.example` file as a reference.

```bash title=".env"
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

After creating the file, load the environment variables:

```bash
source .env
# Or if you use direnv:
# direnv allow
```

## 3. Configure Repositories

You can configure which repositories to track by editing `config/pipeline.config.ts`:

```typescript title="config/pipeline.config.ts"
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

  // ... other configurations
};
```

The `pipeline.config.ts` file is the central hub for customizing the behavior of the data processing pipeline. Here's a brief overview of its main sections:

- **`repositories`**: A list of the GitHub repositories you want to track.
- **`botUsers`**: A list of bot usernames to exclude from the analytics.
- **`scoring`**: This section defines the points awarded for different types of contributions (e.g., creating a pull request, leaving a review, closing an issue). You can adjust these values to weigh different activities according to your project's priorities.
- **`tags`**: This is where you define patterns to categorize contributions.
  - **`area` tags** identify which part of the codebase was affected (e.g., `core`, `ui`, `docs`).
  - **`role` tags** recognize different types of work (e.g., `architect`, `maintainer`, `bug-fixer`).
  - **`tech` tags** identify the technologies used (e.g., `typescript`, `react`, `database`).
- **`aiSummary`**: This section controls the AI-powered summary generation. You can enable or disable it, set your API key, and choose which language models to use for different summary types.
