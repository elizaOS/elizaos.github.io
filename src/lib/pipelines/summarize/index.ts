/**
 * Pipeline for generating AI-powered summaries of contributor activity
 */
import { pipe, createStep, sequence } from "../types";
import {
  generateDailyContributorSummaries,
  generateMonthlyContributorSummaries,
  generateWeeklyContributorSummaries,
} from "./generateContributorSummary";
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
const generateAllRepoSummaries = sequence(
  generateDailyRepoSummaries,
  generateWeeklyRepoSummaries,
  generateMonthlyRepoSummaries,
);

// Tier 2: Overall summaries (synthesizing per-repo summaries)
const generateAllOverallSummaries = sequence(
  generateDailyOverallSummaries,
  generateWeeklyOverallSummaries,
  generateMonthlyOverallSummaries,
);

// Final Summarization Pipeline
export const summarizationPipeline = createStep(
  "Summarize",
  async (input: { repoId?: string }, context: SummarizerPipelineContext) => {
    context.logger?.info("Starting Tier 1: Per-Repository Summaries");
    await generateAllRepoSummaries(input, context);

    context.logger?.info(
      "Finished Tier 1. Starting Tier 2: Overall Project Summaries.",
    );
    await generateAllOverallSummaries(input, context);

    context.logger?.info("Finished Tier 2. All summaries generated.");
  },
);

// Existing Contributor Summaries Pipeline (can be run independently)
export const contributorSummariesPipeline = pipe(
  sequence(
    generateMonthlyContributorSummaries,
    generateWeeklyContributorSummaries,
    generateDailyContributorSummaries,
  ),
  createStep("Log Results", (results, context) => {
    const [monthly, weekly, daily] = results;
    context.logger?.info(
      `Generated ${monthly.length} monthly, ${weekly.length} weekly, and ${daily.length} daily contributor summaries.`,
    );
  }),
);
