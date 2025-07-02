import { createStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { TimeInterval } from "@/lib/date-utils";
import { getActiveReposInInterval } from "./queries";

export const getActiveReposForInterval = createStep(
  "GetActiveReposForInterval",
  async (
    { interval }: { interval: TimeInterval },
    context: SummarizerPipelineContext,
  ) => {
    const { logger } = context;
    const activeRepos = await getActiveReposInInterval(interval);
    logger?.info(
      `Found ${activeRepos.length} active repos for interval starting ${interval.intervalStart}`,
    );
    return activeRepos.map((repoId) => ({ interval, repoId }));
  },
);
