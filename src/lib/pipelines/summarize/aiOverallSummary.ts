import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import {
  IntervalType,
  RepoIntervalType,
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


A concise, high-level paragraph (2-3 sentences) summarizing the day's most important activities, achievements, and any emerging challenges across the entire project. This should answer "what's the one thing I need to know about today?".

## 🚨 Needs Attention 
This is the most critical section. Scan all reports for items that require immediate action from the team.
- **Pull Requests to Review**: List any PRs that are explicitly ready for review or have been open for more than a day without comments.
- **Blocked Issues/PRs**: Identify any issues or PRs where progress is stalled waiting for a decision, answer, or dependency.
- **Urgent Discussions**: Highlight any active issue discussions that need input to move forward.
- For every item, provide a link and a brief (1-sentence) explanation of what is needed.

## ✅ Completed Work
This section celebrates what got done. Analyze all technical developments and merged PRs from the per-repository reports.
- Group the work into 2-4 high-level themes for the day (e.g., "API Performance Enhancements", "Frontend Cleanup", "CI/CD Pipeline Fixes").
- Under each theme, provide bullet points summarizing the specific PRs or commits that contributed to it.
- Focus on the *impact* of the work, not just the title of the PR.
- Each bullet point MUST include a full markdown link to the PR or issue (e.g., "[elizaos/eliza#123](https://github.com/elizaos/eliza/pull/123)").

## 🏗️ Work in Progress
This section provides a forward-looking view of ongoing work.
- **New Pull Requests**: Collate all newly opened PRs from the reports. Group them by repository and provide a markdown link for each.
- **Active Discussions**: Briefly mention any other issues that have notable ongoing discussions but are not yet blocked.

## 🐞 Issue Triage
Summarize the day's issue activity.
- Group by repository and link to each issue.
- **New Issues**: List important new bugs or feature requests that were filed.
- **Closed Issues**: Celebrate significant issues that were resolved.

## ✨ Contributor Spotlight
Acknowledge key contributors for the day.
- Identify 1-3 developers who made a significant impact (e.g., merged a large feature, fixed a critical bug, reviewed multiple PRs).
- Briefly describe their key contribution.

GUIDELINES:
- **IMPORTANT: Omit any section if there is no relevant activity to report for it.** For example, if nothing needs attention, do not include the "🚨 Needs Attention" section.
- Consolidate information accurately from the provided reports. Do not invent details.
- Maintain the repository context for each item.
- Focus on the most important changes and highlights.
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

Provide a high-level strategic overview of the project's progress, written for a general audience (e.g., high-school reading level). Focus on the "why" and the impact, not deep technical details.

## Executive Summary (2-3 sentences)
Start with a punchy, high-level summary of the most important story this ${intervalType}. What was the overarching goal and what was the outcome?

### Key Strategic Initiatives & Outcomes
Instead of a single block of text, break down the progress into major themes. For each theme:
- Provide a clear, bolded headline that describes a high-level goal (e.g., "**Making the Platform Faster and More Reliable**" or "**Improving the New User Experience**").
- Write a short sentence explaining the *strategic importance* of this initiative (the "why").
- Use a sub-bulleted list to highlight the most significant outcomes that contributed to this theme. **Translate technical work into understandable results.**
- When mentioning an outcome, you can attribute it to the repository that did the work, with a link.

### Cross-Repository Coordination
Highlight initiatives that required coordination across multiple repositories (if any occurred this ${intervalType}):
- **Integration Work**: How different project parts were connected to create new features.
- **Shared Dependencies**: How foundational changes impacted the whole project.
- **Coordinated Releases**: How synchronized updates delivered a larger piece of value.
- For each initiative, explain the goal and the result in simple terms.

**Example of a good theme:**

**Making our Platform Faster for Users**
_Goal: We wanted to make the application feel more responsive and reduce loading times._
-   The core services were overhauled in [elizaos/eliza](https://github.com/elizaos/eliza), making key pages load 30% faster for all users.
-   We fixed a major issue in our data system ([elizaos/data-pipelines](https://github.com/elizaos/data-pipelines)) that was causing slowdowns and instability.

GUIDELINES:
- **IMPORTANT: Omit any section if there is no relevant activity to report for it.** For example, if there was no cross-repository work, do not include the "Cross-Repository Coordination" section.
- **AVOID DUPLICATION:** The **Strategic Synthesis** tells the high-level story of *why* the work matters to the project. The **Repository Spotlights** section provides the more detailed, repo-specific list of *what* was done. Do not repeat the same list of PRs/issues in both sections.
- **TRANSLATE, DON'T TRANSCRIBE:** Convert technical jargon into plain English.
    -   **Bad:** "Completed a major refactor of the API service."
    -   **Good:** "Overhauled our core API to make the application faster and more reliable."
- **FOCUS ON IMPACT:** Explain *why* the work was important. What did it enable? What problem did it solve for users or the project?
- **ATTRIBUTE CLEARLY:** Always state which repository the work happened in and link to it.

## Repository Spotlights
For each repository that had meaningful activity, create a dedicated subsection. This is the place for more technical, repo-specific details. If a repository had only minor changes, you can omit it.
- The subsection heading should be the repository name (e.g., "### elizaos/eliza").
- Under each repository, provide a point-form list of its most significant updates, features, and resolved issues from its report.
- When mentioning an update, feature, or resolved issue that corresponds to a specific PR or issue, you MUST include a full markdown link to it. The source reports contain these links; you must extract and reuse them.
- Focus on impact. What were the most important changes for this specific repository?
- Example:
  ### elizaos/eliza
  - Completed a major refactor of the API service ([elizaos/eliza#123](https://github.com/elizaos/eliza/pull/123)), improving average response times by 30%.
  - Launched the new user profile page ([elizaos/eliza#125](https://github.com/elizaos/eliza/pull/125)), delivering a key roadmap item.
  - Resolved a long-standing memory leak issue ([elizaos/eliza#119](https://github.com/elizaos/eliza/issues/119)) that was affecting production stability.

GUIDELINES:
- When you reference a specific contribution (PR, commit, or issue), ALWAYS include a markdown link to it.
- Focus on the "why" and "so what" behind the updates, not just "what" happened.
- Be selective. Highlight what is strategically important, not every small change.
- The tone should be professional, confident, and forward-looking.
`;
}

export async function generateOverallSummary(
  repoSummaries: RepoSummary[],
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: RepoIntervalType,
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
