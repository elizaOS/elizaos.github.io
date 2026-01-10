import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import { WorkItemType } from "../codeAreaHelpers";
import { RepositoryMetrics } from "../export/queries";
import { UTCDate } from "@date-fns/utc";
import {
  IntervalType,
  RepoIntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";

type IssueWithComments = RepositoryMetrics["issues"]["newIssues"][number];

function formatIssueForPrompt(
  issue: IssueWithComments,
  repoId: string,
): string {
  const comments =
    issue.comments
      ?.map(
        (c) =>
          `  - ${c.author || "unknown"} at ${c.createdAt}: ${c.body?.trim()}`,
      )
      .join("\n") || "";

  let issueStr = `[#${issue.number}](https://github.com/${repoId}/issues/${
    issue.number
  }) ${issue.title} (created: ${issue.createdAt}${
    issue.closedAt ? `, closed: ${issue.closedAt}` : ""
  }). BODY: ${issue.body?.slice(0, 240)}`;

  if (comments.length > 0) {
    issueStr += `\nCOMMENTS (newest to oldest):\n${comments}`;
  }

  return issueStr;
}

export interface CompletedItem {
  title: string;
  prNumber: number;
  type: WorkItemType;
  body?: string | null;
  files?: string[];
}

export interface FocusArea {
  area: string;
  count: number;
}

export interface PullRequestMetrics {
  total: number;
  merged: number;
  open: number;
  items?: unknown[];
  mergedThisPeriod?: number;
}

export interface IssueMetrics {
  total: number;
  opened: number;
  closed: number;
  items?: unknown[];
  closedThisPeriod?: unknown[];
}

export interface CodeChangeMetrics {
  additions: number;
  deletions: number;
  files: number;
  commitCount?: number;
}

export interface ContributorInfo {
  username: string;
}

export interface RepoMetricsForSummary {
  pullRequests: PullRequestMetrics;
  issues: IssueMetrics;
  uniqueContributors: number;
  topContributors: ContributorInfo[];
  codeChanges: CodeChangeMetrics;
  focusAreas: FocusArea[];
  completedItems: CompletedItem[];
}

export async function generateRepoSummary(
  metrics: RepositoryMetrics,
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: RepoIntervalType,
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  try {
    // Format the data for the AI prompt based on interval type
    const prompt = formatAnalysisPrompt(
      metrics,
      dateInfo,
      intervalType,
      config,
    );

    // Calculate token length based on prompt content and interval type
    const maxTokens = calculateMaxTokens(prompt, intervalType, config);
    console.log(`Max tokens: ${maxTokens}, intervalType: ${intervalType}`);
    // Get analysis from AI model
    return await callAIService(prompt, config, {
      maxTokens,
      model: config.models[intervalType],
    });
  } catch (error) {
    console.error(
      `Error generating ${intervalType} repository analysis:`,
      error,
    );
    return null;
  }
}

/**
 * Calculate appropriate max tokens based on prompt length and interval type
 * Returns a value using a basic scaling approach
 */
function calculateMaxTokens(
  prompt: string,
  intervalType: RepoIntervalType,
  config: AISummaryConfig,
): number {
  // Base tokens by interval type
  const baseTokensByInterval = {
    month: 3000,
    week: 1500,
    day: 1000,
  };

  // Get base token count for this interval type
  const baseTokens = baseTokensByInterval[intervalType] || 600;

  // Simple estimation: 1 token ≈ 4 characters in English
  const estimatedPromptTokens = prompt.length / 4;
  // Add 20% more tokens for every 400 estimated tokens in the prompt
  const scalingFactor = 1 + Math.floor(estimatedPromptTokens / 400) * 0.2;

  // Calculate final token count
  const calculatedTokens = Math.round(baseTokens * scalingFactor);

  // Ensure result is within a reasonable range, respecting config.max_tokens
  return Math.max(300, Math.min(config.max_tokens, calculatedTokens));
}

/**
 * Format repository metrics into a structured prompt for analysis based on interval type
 */
function formatAnalysisPrompt(
  metrics: RepositoryMetrics,
  dateInfo: { startDate: string },
  intervalType: IntervalType,
  config: AISummaryConfig,
): string {
  if (!metrics.repository) {
    throw new Error("Repository identifier is missing from metrics.");
  }
  const repoId = metrics.repository;
  const date = new UTCDate(dateInfo.startDate);

  // Format date information based on interval type
  const timeframeTitle = formatTimeframeTitle(date, intervalType);

  // Format top active areas
  const topActiveAreas = metrics.focusAreas
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((area) => `${area.area}: ${area.count} changes`);

  const formatCompletedItems = (type: WorkItemType) =>
    metrics.completedItems
      .filter((item) => item.type === type)
      .map(
        (item) =>
          ` ([#${item.prNumber}](https://github.com/${repoId}/pull/${item.prNumber})) ${item.title}. BODY: ${item.body}. FILES: ${item.files?.join(", ")}`,
      )
      .join("\n- ") || "None";

  // Format completed items for better clarity
  const completedFeatures = formatCompletedItems("feature");
  const completedBugfixes = formatCompletedItems("bugfix");
  const completedRefactors = formatCompletedItems("refactor");
  const completedDocs = formatCompletedItems("docs");
  const completedTests = formatCompletedItems("tests");
  const completedOtherWork = formatCompletedItems("other");
  const newIssues = metrics.issues.newIssues || [];
  const closedIssues = metrics.issues.closedIssues || [];
  const updatedIssues = metrics.issues.updatedIssues || [];
  const openPrs = metrics.pullRequests.newPRs?.filter((p) => !p.mergedAt) || [];

  return `
BACKGROUND CONTEXT:
  ${config.projectContext}

INSTRUCTIONS:
Generate a detailed yet concise ${intervalType}ly development report for the ${repoId} repo during ${timeframeTitle}, based on the following github activity.
  
COMPLETED WORK:
  
- **Features Added:** 
  - ${completedFeatures}
- **Bug Fixes:** 
  - ${completedBugfixes}
- **Code Refactoring:** 
  - ${completedRefactors}
- **Documentation Enhancements:** 
  - ${completedDocs}
- **Tests Added:** 
  - ${completedTests}
- **Other Work:** 
  - ${completedOtherWork}
  Most Active Development Areas:
  - ${topActiveAreas.join("\n- ")}

NEWLY OPENED PULL REQUESTS:
 - ${openPrs
   .map(
     (pr: { number: number; title: string }) =>
       `[#${pr.number}](https://github.com/${repoId}/pull/${pr.number}) ${pr.title}`,
   )
   .join("\n- ")}

NEW ISSUES:
  - ${newIssues.map((issue) => formatIssueForPrompt(issue, repoId)).join("\n- ")}

CLOSED ISSUES:
  - ${closedIssues.map((issue) => formatIssueForPrompt(issue, repoId)).join("\n- ")}

ACTIVE ISSUES:
  - ${updatedIssues.map((issue) => formatIssueForPrompt(issue, repoId)).join("\n- ")}

Format the report with the following sections:

# ${repoId} ${getIntervalTypeTitle(intervalType)} Update (${timeframeTitle})
## OVERVIEW 
  Provide a high-level summary (max 500 characters, min 40 characters) highlighting the overall progress and major achievements of the ${intervalType}.

## KEY TECHNICAL DEVELOPMENTS

  Group/cluster the completed work thematically into ${
    intervalType === "month" ? "8-12" : "2-4"
  } different headlines,
  and concisely describe the key changes and improvements in point form. Reference
   the PR numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${repoId}/pull/123)).
 
## NEWLY OPENED PULL REQUESTS
  Summarize the newly opened pull requests and their status / progress. Reference each PR with a markdown link.

## CLOSED ISSUES

  Group related closed issues into  ${
    intervalType === "month" ? "6-9" : "2-4"
  } different headlines and concisely summarize them.
   Reference the issue numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${repoId}/issues/123)).

## NEW ISSUES

  Group the new issues thematically into ${
    intervalType === "month" ? "6-9" : "2-4"
  } different headlines,
  and concisely describe the key challenges and problems in point form. Reference
  the issue numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${repoId}/issues/123)).

## ACTIVE ISSUES

   Analyze the discussions on the active issues and summarize the key points, challenges, and progress, focusing on the latest comments. Only include issues that have more than 3 comments.

 ${
   intervalType === "month"
     ? `
## SUMMARY
Close with a short summary of the months achievements
`
     : ""
 }

GUIDELINES:
- Be factual and precise; focus on concrete changes and verifiable data.
- Use clear, accessible language for both technical and non-technical audiences.
- Ensure all information is organized into the specified sections for clarity.
- Use markdown formatting for the report.
`;
}

function formatAggregatedRepoSummaryPrompt(
  repoId: string,
  dailySummaries: { date: string; summary: string }[],
  intervalType: IntervalType,
  timeframeTitle: string,
  config: AISummaryConfig,
): string {
  const summariesText = dailySummaries
    .map((d) => `### Daily Report for ${d.date}\n${d.summary}`)
    .join("\n\n---\n\n");

  return `
BACKGROUND CONTEXT:
  Project: "${repoId}" - ${config.projectContext}
  Your audience consists of contributors, maintainers, and users of this open-source project. They are technically savvy and interested in both high-level progress and specific technical details.

TASK:
Synthesize the following daily development reports from the timeframe "${timeframeTitle}" into a single, cohesive ${intervalType}ly summary. Your goal is to identify trends, group related work, and create a narrative of the project's progress. Do not simply list the daily entries.

DAILY REPORTS (Input):
---
${summariesText}
---

REQUIRED OUTPUT FORMAT:

# ${repoId} ${getIntervalTypeTitle(intervalType)} Report (${timeframeTitle})

## 🚀 Highlights
A concise, information-dense paragraph (3-5 sentences) summarizing the most significant achievements, challenges, and overall theme of the work done this ${intervalType}. This should be the "executive summary" that gives a full overview.

## 🛠️ Key Developments
This section should detail the concrete work completed. Analyze the "KEY TECHNICAL DEVELOPMENTS" and "Completed Work" sections from the daily reports.
- Group related pull requests thematically under descriptive subheadings (e.g., "Authentication Service Refactor", "New Dashboard Widgets").
- For each theme, provide a brief explanation of the goal and the outcome.
- Mention the most impactful PRs by their number (e.g., [#123](https://github.com/${repoId}/pull/123)).
- Distinguish between new features, bug fixes, performance improvements, and refactoring efforts.

## 🐛 Issues & Triage
Summarize the state of issues in the project. Review the "NEW ISSUES", "CLOSED ISSUES", and "ACTIVE ISSUES" sections from the daily reports.
- **Closed Issues:** Group closed issues thematically. What key problems were resolved this ${intervalType}?
- **New & Active Issues:** What are the most important new issues that were opened? Are there any ongoing discussions on active issues that are particularly noteworthy, controversial, or represent significant future work? Highlight potential blockers.

## 💬 Community & Collaboration
Based on the daily reports, describe the collaboration dynamics.
- Were there any PRs or issues with a high degree of discussion or many reviews?
- Is there evidence of new contributors, or significant collaboration between team members? (You may need to infer this if specific names appear frequently in the reports).
- This section is for qualitative observations about the health and activity of the contributor community.

GUIDELINES:
- Synthesize, don't just aggregate. Find the story in the data.
- Be factual and anchor your summary in the data from the daily reports.
- Use clear, professional language appropriate for a technical audience.
- Use Markdown for all formatting.
`;
}

export async function generateAggregatedRepoSummary(
  repoId: string,
  dailySummaries: { date: string; summary: string }[],
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: RepoIntervalType,
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  if (dailySummaries.length === 0) {
    return null;
  }

  try {
    const date = new UTCDate(dateInfo.startDate);
    const timeframeTitle = formatTimeframeTitle(date, intervalType);
    const prompt = formatAggregatedRepoSummaryPrompt(
      repoId,
      dailySummaries,
      intervalType,
      timeframeTitle,
      config,
    );

    const model =
      config.models[intervalType === "month" ? "week" : intervalType];

    return await callAIService(prompt, config, {
      model: model,
      maxTokens: config.max_tokens * 2, // allow more tokens for aggregation
    });
  } catch (error) {
    console.error(
      `Error generating aggregated ${intervalType} repository analysis:`,
      error,
    );
    return null;
  }
}
