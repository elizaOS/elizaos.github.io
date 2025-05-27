import { ingestWeeklyGithubData } from "./pipeline";
import { createIngestionContext } from "./context";
import { createStep, pipe } from "../types";
import { mapStep } from "../types";
import { getSelectedRepositories } from "../getSelectedRepositories";

export { createIngestionContext };

// Pipeline for generating monthly project summaries
export const ingestPipeline = pipe(
  getSelectedRepositories,
  createStep("mapRepos", (repositories) => {
    return repositories.map(({ repoId, org, name, defaultBranch }) => ({
      repository: { repoId, owner: org, name, defaultBranch },
    }));
  }),
  mapStep(ingestWeeklyGithubData),
  createStep("Log Project Summaries", (results, context) => {
    for (const intervals of results) {
      const totalPrs = intervals.reduce((acc, interval) => {
        return acc + interval.prs;
      }, 0);
      const totalIssues = intervals.reduce((acc, interval) => {
        return acc + interval.issues;
      }, 0);
      context.logger?.info(
        `Ingested ${totalPrs} total PRs and ${totalIssues} total issues across ${intervals.length} weeks`,
      );
    }
  }),
);
