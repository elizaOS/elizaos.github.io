import { callAIService } from "./callAIService";
import { AISummaryConfig } from "./config";
import { getContributorMetrics } from "./queries";
import { getTimePeriodText, IntervalType } from "@/lib/date-utils";

export type ContributorMetricsForSummary = Awaited<
  ReturnType<typeof getContributorMetrics>
>;

/**
 * Generate an AI summary of a contributor's activity
 */
export async function generateAISummaryForContributor(
  metrics: ContributorMetricsForSummary,
  config: AISummaryConfig,
  intervalType: IntervalType | "lifetime",
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  // Skip summary generation if no meaningful activity
  const hasActivity =
    metrics.pullRequests.merged > 0 ||
    metrics.pullRequests.open > 0 ||
    metrics.issues.total > 0 ||
    metrics.reviews.total > 0 ||
    // metrics.comments.total > 0 ||
    metrics.codeChanges.files > 0;

  if (!hasActivity) {
    return null;
  }

  try {
    // Format the metrics data for the AI prompt
    const prompt = formatContributorPrompt(metrics, intervalType);

    // Get model for this interval (use "month" model for lifetime)
    const modelKey: IntervalType =
      intervalType === "lifetime" ? "month" : intervalType;

    // Lifetime summaries need more tokens for comprehensive multi-section output
    const maxTokens =
      intervalType === "lifetime" ? config.max_tokens * 3 : undefined;

    // Get summary from AI model
    return await callAIService(prompt, config, {
      model: config.models[modelKey],
      maxTokens,
    });
  } catch (error) {
    console.error(`Error generating summary for ${metrics.username}:`, error);
    return null;
  }
}

/**
 * Format contributor metrics into a structured prompt
 */
function formatContributorPrompt(
  metrics: ContributorMetricsForSummary,
  intervalType: IntervalType | "lifetime",
): string {
  // Helper to truncate long titles
  const truncateTitle = (title: string, maxLength = 64) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + "...";
  };

  // Get time period description for the prompt
  const timePeriod =
    intervalType === "lifetime"
      ? {
          timeFrame: "all-time",
          timeFrameShort: "lifetime",
          sentenceCount: 100,
        }
      : getTimePeriodText(intervalType);

  // Get the most significant directories from focus areas
  const topDirs = metrics.focusAreas
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((area) => {
      const parts = area.area.split("/");
      // If it's a package, use the package name
      if (parts.includes("packages")) {
        const pkgIndex = parts.indexOf("packages");
        return parts[pkgIndex + 1] || area.area;
      }
      // For docs, distinguish between package and markdown files
      if (parts[0] === "docs" || parts.includes("docs")) {
        return "docs-package";
      }
      if (
        area.area.endsWith(".md") ||
        area.area.endsWith(".mdx") ||
        area.area.includes("/docs/") ||
        area.area.includes("documentation")
      ) {
        return "documentation";
      }
      // Otherwise use the first meaningful directory
      return parts[0] || area.area;
    });

  // Helper to group items by repository (uses full org/repo format)
  const groupByRepo = <T extends { repository: string }>(
    items: T[],
  ): Map<string, T[]> => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const repo = item.repository; // Already in "org/repo" format from DB
      if (!grouped.has(repo)) {
        grouped.set(repo, []);
      }
      grouped.get(repo)!.push(item);
    }
    return grouped;
  };

  // Format merged PRs - use grouped format for lifetime, flat format for other intervals
  const mergedPRs = metrics.pullRequests.items.filter((pr) => pr.merged === 1);
  let mergedPRDetails: string;

  if (intervalType === "lifetime" && mergedPRs.length > 0) {
    // Grouped by repository for lifetime summaries (org/repo format)
    const mergedByRepo = groupByRepo(mergedPRs);
    mergedPRDetails = Array.from(mergedByRepo.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([repo, prs]) => {
        const prList = prs
          .map((pr) => {
            const additions =
              pr.commits?.reduce((sum, c) => sum + (c.additions || 0), 0) || 0;
            const deletions =
              pr.commits?.reduce((sum, c) => sum + (c.deletions || 0), 0) || 0;
            return `#${pr.number} "${truncateTitle(pr.title)}" (+${additions}/-${deletions})`;
          })
          .join(", ");
        return `  - ${repo} (${prs.length} PRs): ${prList}`;
      })
      .join("\n");
  } else {
    // Flat format for day/week/month (org/repo#number format)
    mergedPRDetails =
      mergedPRs.length > 0
        ? mergedPRs
            .map((pr) => {
              const additions =
                pr.commits?.reduce((sum, c) => sum + (c.additions || 0), 0) ||
                0;
              const deletions =
                pr.commits?.reduce((sum, c) => sum + (c.deletions || 0), 0) ||
                0;
              return `${pr.repository}#${pr.number} "${truncateTitle(pr.title)}" (+${additions}/-${deletions} lines)`;
            })
            .join(", ")
        : "None";
  }

  // Format open PRs - use grouped format for lifetime
  const openPRs = metrics.pullRequests.items.filter((pr) => pr.merged !== 1);
  let openPRDetails: string;

  if (intervalType === "lifetime" && openPRs.length > 0) {
    const openByRepo = groupByRepo(openPRs);
    openPRDetails = Array.from(openByRepo.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([repo, prs]) => {
        const prList = prs
          .map((pr) => `#${pr.number} "${truncateTitle(pr.title)}"`)
          .join(", ");
        return `  - ${repo} (${prs.length} PRs): ${prList}`;
      })
      .join("\n");
  } else {
    openPRDetails =
      openPRs.length > 0
        ? openPRs
            .map(
              (pr) =>
                `${pr.repository}#${pr.number} "${truncateTitle(pr.title)}"`,
            )
            .join(", ")
        : "None";
  }

  // Format issues - use grouped format for lifetime
  let issueDetails: string;

  if (intervalType === "lifetime" && metrics.issues.items.length > 0) {
    const issuesByRepo = groupByRepo(metrics.issues.items);
    issueDetails = Array.from(issuesByRepo.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([repo, issues]) => {
        const issueList = issues
          .map(
            (issue) =>
              `#${issue.number} "${truncateTitle(issue.title)}" (${issue.state})`,
          )
          .join(", ");
        return `  - ${repo} (${issues.length}): ${issueList}`;
      })
      .join("\n");
  } else {
    issueDetails =
      metrics.issues.items.length > 0
        ? metrics.issues.items
            .map(
              (issue) =>
                `${issue.repository}#${issue.number} "${truncateTitle(issue.title)}" (${issue.state})`,
            )
            .join(", ")
        : "None";
  }

  // Work pattern analysis
  const workPatternDescription =
    metrics.activityPattern.frequency >= 0.7
      ? "very consistent work (active most days)"
      : metrics.activityPattern.frequency >= 0.4
        ? "moderately consistent work (active several days per week)"
        : metrics.activityPattern.frequency >= 0.2
          ? "occasional activity (active a few days per week)"
          : "sporadic activity (active a few days this period)";

  // Commit type analysis
  const commitTypes = metrics.codeChanges.commitTypes;
  const totalCommits = metrics.codeChanges.commitCount;

  let workFocus = "";
  if (totalCommits > 0) {
    const typePercentages = {
      feature: Math.round((commitTypes.feature / totalCommits) * 100),
      bugfix: Math.round((commitTypes.bugfix / totalCommits) * 100),
      refactor: Math.round((commitTypes.refactor / totalCommits) * 100),
      docs: Math.round((commitTypes.docs / totalCommits) * 100),
      tests: Math.round((commitTypes.tests / totalCommits) * 100),
      other: Math.round((commitTypes.other / totalCommits) * 100),
    };

    const sortedTypes = Object.entries(typePercentages)
      .filter(([_, percentage]) => percentage > 10)
      .sort(([_, a], [_2, b]) => b - a);

    if (sortedTypes.length > 0) {
      workFocus = sortedTypes
        .map(([type, percentage]) => `${type} work (${percentage}%)`)
        .join(", ");
    }
  }

  // File type analysis
  const fileTypes = metrics.pullRequests.fileTypes;
  const totalFiles = Object.values(fileTypes).reduce(
    (sum, count) => sum + count,
    0,
  );

  let fileTypesFocus = "";
  if (totalFiles > 0) {
    const filePercentages = {
      code: Math.round((fileTypes.code / totalFiles) * 100),
      tests: Math.round((fileTypes.tests / totalFiles) * 100),
      docs: Math.round((fileTypes.docs / totalFiles) * 100),
      config: Math.round((fileTypes.config / totalFiles) * 100),
    };

    const sortedFileTypes = Object.entries(filePercentages)
      .filter(([_, percentage]) => percentage > 10)
      .sort(([_, a], [__, b]) => b - a);

    if (sortedFileTypes.length > 0) {
      fileTypesFocus = sortedFileTypes
        .map(([type, percentage]) => `${type} (${percentage}%)`)
        .join(", ");
    }
  }

  // PR complexity insights
  const prMetrics = metrics.pullRequests.metrics;
  const prComplexityInsights =
    metrics.pullRequests.merged > 0
      ? `Average PR: +${prMetrics.avgAdditions}/-${prMetrics.avgDeletions} lines, ${prMetrics.avgTimeToMerge} hours to merge
Largest PR: ${prMetrics.largestPR.repository}#${prMetrics.largestPR.number} with +${prMetrics.largestPR.additions}/-${prMetrics.largestPR.deletions} lines`
      : "No merged PRs";

  // === LIFETIME-ONLY STRATEGIC METRICS ===

  // 1. Quality Signals - PR merge rate
  const prMergeRate =
    metrics.pullRequests.total > 0
      ? Math.round(
          (metrics.pullRequests.merged / metrics.pullRequests.total) * 100,
        )
      : 0;

  // 2. Timeline Context - first and last activity dates
  let timelineContext = "";
  if (intervalType === "lifetime" && metrics.pullRequests.items.length > 0) {
    const allDates = metrics.pullRequests.items
      .map((pr) => pr.createdAt)
      .filter((d): d is string => d !== null)
      .sort();

    if (allDates.length > 0) {
      const firstDate = allDates[0].split("T")[0];
      const lastDate = allDates[allDates.length - 1].split("T")[0];
      const firstYear = firstDate.substring(0, 4);
      const firstMonth = firstDate.substring(5, 7);
      const lastYear = lastDate.substring(0, 4);
      const lastMonth = lastDate.substring(5, 7);

      // Calculate duration in months
      const startDate = new Date(firstDate);
      const endDate = new Date(lastDate);
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      timelineContext = `First contribution: ${firstYear}-${firstMonth}, Most recent: ${lastYear}-${lastMonth}, Active span: ${monthsDiff} months`;
    }
  }

  // 3. Bus Factor - contribution concentration per repo (now with actual percentages)
  let busFactorAnalysis = "";
  if (
    intervalType === "lifetime" &&
    metrics.strategicMetrics?.busFactor?.length > 0
  ) {
    const significantRepos = metrics.strategicMetrics.busFactor
      .filter((r) => r.userPRs >= 3) // Only repos with meaningful contribution
      .slice(0, 5);

    if (significantRepos.length > 0) {
      busFactorAnalysis = significantRepos
        .map(
          (r) => `${r.repo}: ${r.percentage}% (${r.userPRs}/${r.totalPRs} PRs)`,
        )
        .join(", ");
    }
  }

  // 4. Issue-PR Linkage - how structured is their work?
  let issueLinkageAnalysis = "";
  if (intervalType === "lifetime" && metrics.strategicMetrics?.issueLinkage) {
    const linkage = metrics.strategicMetrics.issueLinkage;
    if (linkage.totalMergedPRs > 0) {
      issueLinkageAnalysis = `${linkage.rate}% of merged PRs close tracked issues (${linkage.linkedPRs}/${linkage.totalMergedPRs})`;
    }
  }

  // 5. Collaboration Network - who reviews their work?
  let collaborationAnalysis = "";
  if (
    intervalType === "lifetime" &&
    metrics.strategicMetrics?.collaborationNetwork
  ) {
    const network = metrics.strategicMetrics.collaborationNetwork;
    if (network.reviewersOfTheirPRs.length > 0) {
      const topReviewers = network.reviewersOfTheirPRs
        .slice(0, 3)
        .map(
          (r) =>
            `@${r.reviewer} (${r.reviewCount} reviews, ${r.approvals} approvals)`,
        )
        .join(", ");
      collaborationAnalysis = `Primary reviewers: ${topReviewers}. Total unique reviewers: ${network.totalReviewers}`;
    }
  }

  return `You are an expert engineering manager writing a concise, single-paragraph performance summary for ${
    metrics.username
  } based on the data provided for the ${timePeriod.timeFrame}.
Your goal is to synthesize their activity across all repositories into a holistic narrative. Prioritize the **impact** of the work over the volume of contributions. Do not invent or assume any information beyond what is provided.

DATA:
---
PULL REQUESTS:
- Merged: ${
    metrics.pullRequests.merged > 0
      ? `${metrics.pullRequests.merged} PRs: ${mergedPRDetails}`
      : "None"
  }
- Open: ${
    metrics.pullRequests.open > 0
      ? `${metrics.pullRequests.open} PRs: ${openPRDetails}`
      : "None"
  }
- Complexity: ${prComplexityInsights}

ISSUES:
- Created: ${metrics.issues.opened > 0 ? metrics.issues.opened : "None"}${
    issueDetails && issueDetails !== "None"
      ? intervalType === "lifetime"
        ? `:\n${issueDetails}`
        : ` (${issueDetails})`
      : ""
  }
- Closed: ${metrics.issues.closed > 0 ? metrics.issues.closed : "None"}
- Commented on: ${
    metrics.issues.commented > 0 ? metrics.issues.commented : "None"
  }

REVIEWS & COMMENTS:
- Reviews: ${
    metrics.reviews.total > 0
      ? `${metrics.reviews.total} total (${metrics.reviews.approved} approvals, ${metrics.reviews.changesRequested} change requests, ${metrics.reviews.commented} comments)`
      : "None"
  }
- PR Comments: ${
    metrics.comments.prComments > 0 ? metrics.comments.prComments : "None"
  }
- Issue Comments: ${
    metrics.comments.issueComments > 0 ? metrics.comments.issueComments : "None"
  }

CODE CHANGES:
${
  metrics.codeChanges.files > 0
    ? `- Modified ${metrics.codeChanges.files} files (+${
        metrics.codeChanges.additions
      }/-${metrics.codeChanges.deletions} lines)
- Commits: ${metrics.codeChanges.commitCount}
- Primary focus: ${workFocus || "Mixed work"}
- File types: ${fileTypesFocus || "Various file types"}`
    : "No code changes"
}

PRIMARY AREAS: ${topDirs.join(", ") || "N/A"}
${
  intervalType === "lifetime"
    ? `
STRATEGIC METRICS (lifetime only):
- PR Merge Rate: ${prMergeRate}% (${metrics.pullRequests.merged}/${metrics.pullRequests.total} PRs merged)
- Avg Time to Merge: ${prMetrics.avgTimeToMerge} hours
- Timeline: ${timelineContext || "N/A"}
- Repo Ownership (bus factor): ${busFactorAnalysis || "Distributed across repos"}
- Issue Linkage: ${issueLinkageAnalysis || "No issue-closing PRs tracked"}
- Collaboration Network: ${collaborationAnalysis || "No reviewer data available"}`
    : ""
}
---

${
  intervalType === "lifetime"
    ? `Generate a factual contribution dossier. This is NOT a performance review.

OUTPUT FORMAT - Start with username header, then sections:

# ${metrics.username}

## Activity Ledger
- **Pull Requests Authored:** X merged, Y open/closed
- **Pull Requests Reviewed:** X total (Y approvals, Z change requests, W comments)
- **Issues:** X opened, Y closed
- **Avg Time to Merge:** X hours

## Contribution Domains
Group by functional area. ALWAYS use full org/repo#number format.
Scale detail by volume - for high-volume contributors, list MORE representative PRs per domain:
- **[Domain Name]:** Description of what was built/fixed in this area
  - PRs: org/repo#N (description), org/repo#N (description), ...

## Contribution Patterns
Observable patterns only - describe what happened, not why or what it indicates. Use verbs, not traits. Scale richness with volume:
- **Code Patterns:** PR size distribution, file modification patterns, commit type breakdown (e.g., "Submits PRs averaging +X/-Y lines across N files. 76% documentation changes, 15% code. Largest PR: +M/-K lines.")
- **Review Patterns:** Review activity distribution and decision ratios (e.g., "Conducted N reviews: 66% approvals, 0% change requests, 34% comments.")
- **Collaboration Patterns:** Cross-repo activity, issue engagement, co-authorship (e.g., "Contributed to N repositories. Opened M issues, closed K. Co-authored L commits with @user.")

## Temporal Analysis
Describe the evolution of focus over time. For high-volume contributors, be MORE granular:
- **Entry:** When and where did contributions start?
- **Growth phases:** How did scope expand? What new areas were added when?
- **Shifts:** Any notable pivots between areas? (e.g., "shifted from client work to core runtime")
- **Current:** Where is recent activity concentrated?

## Repository Metrics
Report quantitative data from STRATEGIC METRICS without interpretation:
- **PR Distribution:** List repos where ≥30% of merged PRs are theirs with exact percentages and PR counts
- **Issue-PR Linkage:** Percentage of PRs that close tracked issues (count/total)
- **Review Network:** Top 3 reviewers with review counts, approval counts, and total unique reviewers

## Key Signals
Flag statistical patterns and distributions without interpretation:
- **Scale Indicators:** Report PR and commit scale (e.g., "PRs average +7,312/-2,373 lines", "Modified 18,892 files across 657 commits", "Largest PR: +80k/-32k lines")
- **Review Concentration:** Report approval distribution (e.g., "Top 2 reviewers provided 87% of approvals (13/15)", "14 unique reviewers across all PRs")
- **Engagement Patterns:** Note interaction distributions (e.g., "5% of PRs close tracked issues (3/65)", "0% of reviews requested changes (0/15)")
- **Temporal Span:** Report activity timeline (e.g., "Active span: 14 months from Nov 2024 to Jan 2026", "First PR: 2024-11, Most recent: 2026-01")

## Competing Hypotheses
Present multiple plausible explanations for observed patterns. DO NOT select or rank hypotheses:
- **For large PR sizes (when avg >5k lines):** Could indicate bulk refactoring, automated generation, documentation consolidation, or infrequent merge cadence
- **For low issue linkage (when <15% of PRs):** Could indicate work coordinated via external channels, proactive contributions not tied to issues, or undocumented requirements
- **For high contribution share (when >40% in a repo):** Could indicate specialized domain expertise, primary maintainer role, limited team size, or recent project phase
- **For review concentration (when top 2 >70%):** Could indicate subject matter expert dependencies, timezone availability patterns, or small active maintainer pool
- **For file type skew (when one type >70%):** Could indicate role specialization, project phase focus, or domain-specific initiatives

BANNED WORDS: "high-velocity", "dedicated", "prolific", "leader", "key contributor", "core maintainer", "central pillar", "top", "best", "critical", "essential", "drives", "champions", "leads", "impressive", "significant", "remarkable", "primary", "operates", "acts as", "serves as"

BANNED INTERPRETIVE PHRASES: "indicating", "suggesting", "showing", "demonstrating", "implying", "creating a", "resulting in", "leading to", "dependency", "autonomy", "ownership" (use "contribution share" instead)

SCALING (sections AND depth):
- <10 PRs: Activity Ledger + Contribution Domains (2-3 PRs per domain). Skip Key Signals and Competing Hypotheses. ~20 lines.
- 10-50 PRs: Add Patterns + Temporal Analysis. Skip Key Signals and Competing Hypotheses. ~40 lines.
- 50-150 PRs: Add Repository Metrics + Key Signals. Include 2-3 competing hypotheses for prominent patterns. ~75 lines.
- 150+ PRs: All sections including comprehensive Key Signals (4-5 anomalies) and Competing Hypotheses (3-4 explanations per pattern). ~100+ lines.

RULES:
- Start with "# ${metrics.username}" header
- ALWAYS use org/repo#N format for PRs (elizaos/eliza#123, not #123)
- Use verbs not adjectives
- State facts, not inferences
- Never attribute intent or motivation
- Never compare to others
- OUTPUT LENGTH SHOULD SCALE WITH CONTRIBUTION VOLUME

If no activity: "# ${metrics.username}\n\nNo contribution activity in this time window."`
    : `INSTRUCTIONS:
- Write a single, flowing paragraph of no more than ${timePeriod.sentenceCount} sentences, starting with "${metrics.username}: ".
- Begin with a high-level summary of their main focus and area of impact (e.g., "focused on improving API performance").
- Weave in their most impactful contributions, such as fixing critical bugs, implementing key features, or making significant refactors. Use the PR/issue number for reference (e.g., "resolved a critical performance issue in elizaos/api via PR #45").
- Use quantitative data like line counts or review numbers only when they signal significant complexity or effort on an important task.
- Conclude with a summary of their primary focus areas based on the code they touched.
- If there is no activity, output only: "${metrics.username}: No activity ${timePeriod.timeFrameShort}."`
}

${
  intervalType !== "lifetime"
    ? `Example Summaries:
- "${metrics.username}: No activity ${timePeriod.timeFrameShort}."
- "${metrics.username}: Focused heavily on UI improvements across the project, merging 3 PRs in elizaos/eliza (+2k/-500 lines) that rebuilt the settings page, and also reviewed 5 PRs in elizaos-plugins/plugin-A."
- "${metrics.username}: Drove a major backend refactor, landing a significant PR in elizaos/api (#45) with +1.5k lines of changes. They also triaged and fixed 2 critical bugs in elizaos/ingest (#99, #101), showing a focus on API stability."`
    : ""
}
`;
}
