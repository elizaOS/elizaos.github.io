import { pipe, mapStep, parallel, createStep } from "../types";
import { calculateTags } from "./calculateTags";
import { fetchContributors } from "./fetchContributors";
import { generateDailySummary } from "./generateDailySummary";

/**
 * Process a single repository
 */

export const processContributorTags = pipe(
  // Fetch contributors for the repository
  fetchContributors,

  // Process each contributor in parallel
  mapStep(calculateTags),
  // Format the combined results
  createStep("logResults", (results, context) => {
    // The first element is tags, the second is summary
    const totalContribtors = results.filter(Boolean).length;
    context.logger?.info(`Processed tags for ${totalContribtors} contributors`);
    return results;
  })
);

// todo: iterate over time intervals
export const generateContributorSummaries = pipe(
  fetchContributors,
  mapStep(generateDailySummary),
  // Format the combined results
  createStep("logResults", (results, context) => {
    // The first element is tags, the second is summary
    const totalContribtors = results.filter(Boolean).length;
    context.logger?.info(`Processed tags for ${totalContribtors} contributors`);
    return results;
  })
);
