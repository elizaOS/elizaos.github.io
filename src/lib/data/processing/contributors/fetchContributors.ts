import { createStep, RepoPipelineContext } from "../types";
import { ContributorPipelineContext } from "./context";
import {
  users,
  rawPullRequests,
  rawIssues,
  rawCommits,
  prComments,
  issueComments,
  prReviews,
} from "../../schema";
import { db } from "../../db";
import { sql, eq, or } from "drizzle-orm";

/**
 * Fetch all contributors for a repository
 */

export const fetchContributors = createStep(
  "fetchContributors",
  async (
    { repoId }: { repoId: string },
    { logger }: ContributorPipelineContext
  ) => {
    // Fetch all unique users who have contributed to the repository through various means
    const contributors = await db
      .selectDistinct({ username: users.username })
      .from(users)
      .leftJoin(rawPullRequests, eq(users.username, rawPullRequests.author))
      .leftJoin(rawIssues, eq(users.username, rawIssues.author))
      .leftJoin(rawCommits, eq(users.username, rawCommits.author))
      .leftJoin(prComments, eq(users.username, prComments.author))
      .leftJoin(issueComments, eq(users.username, issueComments.author))
      .leftJoin(prReviews, eq(users.username, prReviews.author))
      .where(
        or(
          eq(rawPullRequests.repository, repoId),
          eq(rawIssues.repository, repoId),
          eq(rawCommits.repository, repoId),
          sql`${prComments.prId} IN (SELECT id FROM ${rawPullRequests} WHERE repository = ${repoId})`,
          sql`${issueComments.issueId} IN (SELECT id FROM ${rawIssues} WHERE repository = ${repoId})`,
          sql`${prReviews.prId} IN (SELECT id FROM ${rawPullRequests} WHERE repository = ${repoId})`
        )
      )
      .all();

    logger?.info(
      `Retrieved ${contributors.length} contributors from the repository`,
      { repoId }
    );
    return contributors.map((c) => c.username);
  }
);
