---
sidebar_position: 2
---

# AI Summaries

A key feature of this project is its ability to generate AI-powered summaries of repository activity. This turns a high volume of development events into concise, human-readable narratives, making it easier to track progress and understand contributions.

## How It Works

The AI summary pipeline leverages Large Language Models (LLMs) via [OpenRouter.ai](https://openrouter.ai/) to process the data collected during the ingestion phase. It can generate two main types of summaries:

1.  **Project Summaries**: These provide a high-level overview of all activity within a repository over a specific time period (daily, weekly, or monthly). They cover new pull requests, issues, and key changes.
2.  **Contributor Summaries**: These focus on the specific contributions of an individual developer, detailing the work they've completed and its impact.

## Configuration

To enable AI summaries, you must provide an OpenRouter API key in your `.env` file:

```bash title=".env"
OPENROUTER_API_KEY=your_api_key_here
```

You can also configure which LLM to use. By default, the system is configured to use a smaller, more cost-effective model for local development:

```bash title=".env"
LARGE_MODEL=openai/gpt-4o-mini
```

Further configuration is available in `config/pipeline.config.ts`, where you can toggle summaries on or off and set other parameters.

## Usage

You can trigger the summary generation process using the `summarize` pipeline command:

```bash
# Generate project summaries
bun run pipeline summarize -t project

# Generate contributor summaries
bun run pipeline summarize -t contributors

# Generate summaries for a specific date range
bun run pipeline summarize -t project --after 2025-01-01 --before 2025-02-20
```

By default, the `summarize` command will not regenerate summaries that already exist. To force regeneration, you can use the `-f` or `--force` flag.

The generated summaries are stored in the `data/<owner_repo>/<interval>/summaries/` directory and are displayed on the website.

## Implementation Details

The AI summary generation is orchestrated within the `src/lib/pipelines/summarize/` directory. Here's a breakdown of the key files and their roles:

- **`index.ts`**: The entry point for the `summarize` pipeline command. It parses command-line arguments (like `--type`, `--repository`, `--force`) and kicks off the appropriate summary generation function.

- **`generateProjectSummary.ts` & `generateContributorSummary.ts`**: These files contain the core logic for preparing the data for the AI. They use functions from `queries.ts` to fetch the necessary metrics from the database for a given time interval.

- **`queries.ts`**: This is a critical file containing all the Drizzle ORM queries needed to pull data for the summaries. It fetches everything from top contributors and PRs to detailed code changes and issue metrics. The functions here are responsible for aggregating the raw data into a format suitable for summarization.

- **`aiProjectSummary.ts` & `aiContributorSummary.ts`**: These files take the data prepared by the `generate*.ts` files and construct the specific prompts that will be sent to the LLM. They contain the prompt templates and the logic for formatting the data into a human-readable context for the AI.

- **`callAIService.ts`**: This file contains the generic function responsible for making the actual API call to the AI service (e.g., OpenRouter). It takes the prepared prompt, sends it, and returns the AI-generated text. It also handles basic error handling and retries.

- **`mutations.ts`**: Once the AI service returns a summary, the functions in this file are used to save the summary back into the SQLite database. It contains `insert` statements for the `repoSummaries` and `userSummaries` tables.

- **`context.ts` & `config.ts`**: These files manage the configuration and context for the pipeline, including reading settings from `pipeline.config.ts` and environment variables.
