import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import {
  IntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";

type RepoSummary = {
  repoId: string;
  summary: string;
};

function formatDailyOverallSummaryPrompt(
  repoSummaries: RepoSummary[],
  timeframeTitle: string,
  config: AISummaryConfig,
): string {
  const summariesText = repoSummaries
    .map(
      (s) =>
        `--- START OF REPORT FOR ${s.repoId} ---\n${s.summary}\n--- END OF REPORT FOR ${s.repoId} ---`,
    )
    .join("\n\n");

  return `
BACKGROUND CONTEXT:
  ${config.projectContext}
  You are creating a daily digest for a team of developers, project managers, and community members for a complex open-source project with multiple repositories.

TASK:
Synthesize the following detailed, per-repository daily reports from "${timeframeTitle}" into a single, cohesive "Overall Project" summary. Your goal is to extract and aggregate the most critical information into a scannable format.

PER-REPOSITORY DAILY REPORTS (Input):
${summariesText}

REQUIRED OUTPUT FORMAT:

# Overall Project Update (${timeframeTitle})

## Overview
A concise, high-level paragraph summarizing the day's most important activities, achievements, and any emerging challenges across the entire project. This should answer "what's the one thing I need to know about today?".

## Key Technical Developments
Analyze all technical developments from the per-repository reports and group them into 2-4 high-level themes for the day (e.g., "API Performance Enhancements", "Frontend Cleanup", "CI/CD Pipeline Fixes").
- Under each theme, provide bullet points summarizing the specific PRs or commits that contributed to it.
- Each bullet point MUST include a full markdown link to the PR or issue, including the repository name (e.g., "[elizaos/eliza#123](https://github.com/elizaos/eliza/pull/123)"). The source reports contain these links; you must extract and reuse them.
- Focus on summarizing the *work*, not just listing the PR titles.

## New Pull Requests
Collate all newly opened PRs from the "NEWLY OPENED PULL REQUESTS" section of each report.
- Group the PRs by repository.
- This section gives a forward-looking view of work that has just started.

## Issue Triage
Summarize issue activity from the "NEW ISSUES", "CLOSED ISSUES", and "ACTIVE ISSUES" sections of each report.
- Group by repository.
- **New Issues**: Briefly list important new bugs or feature requests.
- **Closed Issues**: List significant issues that were resolved.
- **Active Discussions**: Mention any issues that have notable ongoing discussions.

GUIDELINES:
- Consolidate information accurately from the provided reports. Do not invent details.
- Maintain the repository context for each item.
- Focus on the most important changes and highlights instead of listing every single change, users can read the individual reports for the details.
- Use clear headers and formatting to make the report easy to scan.
`;
}

function formatWeeklyMonthlyOverallSummaryPrompt(
  repoSummaries: RepoSummary[],
  intervalType: IntervalType,
  timeframeTitle: string,
  config: AISummaryConfig,
): string {
  const summariesText = repoSummaries
    .map(
      (s) =>
        `--- START OF ${intervalType.toUpperCase()} REPORT FOR ${
          s.repoId
        } ---\n${s.summary}\n--- END OF REPORT FOR ${s.repoId} ---`,
    )
    .join("\n\n");

  return `
BACKGROUND CONTEXT:
  ${config.projectContext}
  Your audience includes project stakeholders, leadership, and the wider community. They need a strategic overview of the project's trajectory and key results over the last ${intervalType}.

TASK:
Synthesize the following per-repository ${intervalType}ly reports from "${timeframeTitle}" into a single, high-level "Overall Project" summary. Your goal is to identify major themes, significant accomplishments, and strategic direction.

PER-REPOSITORY ${intervalType.toUpperCase()}LY REPORTS (Input):
${summariesText}

REQUIRED OUTPUT FORMAT:

# Overall Project ${getIntervalTypeTitle(
    intervalType,
  )} Summary (${timeframeTitle})

## Strategic Synthesis
Provide a comprehensive analysis (2-4 paragraphs) of the entire project's progress during this period.
- What were the overarching goals for this ${intervalType}?
- What were the most significant technical achievements or features delivered across all repositories?
- What major challenges were addressed (e.g., tech debt, critical bugs)?
- How has the work this ${intervalType} positioned the project for the future? Summarize the overall trajectory.

## Repository Spotlights
For each repository that had meaningful activity, create a dedicated subsection. If a repository had only minor changes, you can omit it.
- The subsection heading should be the repository name (e.g., "### elizaos/eliza").
- Under each repository, provide a point-form list of its most significant updates, features, and resolved issues from its report.
- Focus on impact. What were the most important changes for this specific repository?
- Example:
  ### elizaos/eliza
  - Completed a major refactor of the API service, improving average response times by 30%.
  - Launched the new user profile page, delivering a key roadmap item.
  - Resolved a long-standing memory leak issue that was affecting production stability.

GUIDELINES:
- Focus on the "why" and "so what" behind the updates, not just "what" happened.
- Be selective. Highlight what is strategically important, not every small change.
- The tone should be professional, confident, and forward-looking.
`;
}

export async function generateOverallSummary(
  repoSummaries: RepoSummary[],
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: IntervalType,
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  if (repoSummaries.length === 0) {
    return null;
  }

  try {
    const date = new UTCDate(dateInfo.startDate);
    const timeframeTitle = formatTimeframeTitle(date, intervalType);

    const prompt =
      intervalType === "day"
        ? formatDailyOverallSummaryPrompt(repoSummaries, timeframeTitle, config)
        : formatWeeklyMonthlyOverallSummaryPrompt(
            repoSummaries,
            intervalType,
            timeframeTitle,
            config,
          );

    const model = config.models[intervalType];

    return await callAIService(prompt, config, {
      model: model,
      maxTokens: config.max_tokens * 2.5, // allow more tokens for overall summary
    });
  } catch (error) {
    console.error(
      `Error generating overall ${intervalType} repository analysis:`,
      error,
    );
    return null;
  }
}
