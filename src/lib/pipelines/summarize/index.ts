/**
 * Pipeline for generating AI-powered summaries of contributor activity
 */
import { pipe, createStep, sequence } from "../types";
import {
  generateDailyContributorSummaries,
  generateMonthlyContributorSummaries,
  generateWeeklyContributorSummaries,
} from "./generateContributorSummary";
import { generateLifetimeContributorSummaries } from "./generateLifetimeSummary";
import { SummarizerPipelineContext, createSummarizerContext } from "./context";
import {
  generateDailyRepoSummaries,
  generateMonthlyRepoSummaries,
  generateWeeklyRepoSummaries,
} from "./generateRepoSummary";
import {
  generateDailyOverallSummaries,
  generateMonthlyOverallSummaries,
  generateWeeklyOverallSummaries,
} from "./generateOverallSummary";

export { type SummarizerPipelineContext, createSummarizerContext };

// Tier 1: Per-repository summaries
export const repositorySummariesPipeline = sequence(
  generateDailyRepoSummaries,
  generateWeeklyRepoSummaries,
  generateMonthlyRepoSummaries,
);

// Tier 2: Overall summaries (synthesizing per-repo summaries)
export const overallSummariesPipeline = sequence(
  generateDailyOverallSummaries,
  generateWeeklyOverallSummaries,
  generateMonthlyOverallSummaries,
);

// Existing Contributor Summaries Pipeline (can be run independently)
export const contributorSummariesPipeline = pipe(
  sequence(
    sequence(
      generateMonthlyContributorSummaries,
      generateWeeklyContributorSummaries,
    ),
    generateDailyContributorSummaries,
    generateLifetimeContributorSummaries,
  ),
  createStep("Log Results", (results, context) => {
    const [[monthly, weekly], daily, lifetime] = results;
    context.logger?.info(
      `Generated ${monthly?.length || 0} monthly, ${weekly?.length || 0} weekly, ${daily?.length || 0} daily, and ${lifetime?.length || 0} lifetime contributor summaries.`,
    );
  }),
);
