import { faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import * as schema from "@/lib/data/schema";
import type {
  users,
  userDailyScores,
  rawPullRequests,
  rawIssues,
  issueComments,
  rawPullRequestFiles,
  repositories,
} from "@/lib/data/schema";
import { toDateString } from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";

type User = InferInsertModel<typeof users>;
type UserDailyScore = InferInsertModel<typeof userDailyScores>;
type RawPullRequest = InferInsertModel<typeof rawPullRequests>;
type RawIssue = InferInsertModel<typeof rawIssues>;
type IssueComment = InferInsertModel<typeof issueComments>;
type PRReview = InferInsertModel<typeof schema.prReviews>;
type PRComment = InferInsertModel<typeof schema.prComments>;
type RawCommit = InferInsertModel<typeof schema.rawCommits>;

export function generateMockUsers(items: Partial<User>[]): User[] {
  return items.map((overrides) => ({
    username: faker.internet.username(),
    avatarUrl: faker.image.avatar(),
    isBot: 0,
    ...overrides,
  }));
}

export function generateMockUserDailyScores(
  items: Partial<UserDailyScore>[],
  baseDate: Date | string = new UTCDate(),
): UserDailyScore[] {
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    username: faker.internet.username(),
    date: toDateString(baseDate),
    score: faker.number.int({ min: 10, max: 1000 }),
    category: "day",
    metrics: JSON.stringify({
      pullRequests: {
        total: 1,
        merged: 2,
        open: 3,
        closed: 4,
      },
      issues: {
        total: 2,
        closed: 3,
        open: 4,
      },
      reviews: {
        total: 3,
        approved: 4,
        changesRequested: 5,
        commented: 6,
      },
      comments: {
        pullRequests: 4,
        issues: 5,
      },
      codeChanges: {
        additions: 100,
        deletions: 50,
        files: 2,
      },
    }),
    ...overrides,
  }));
}

export function generateMockPullRequests(
  items: Partial<RawPullRequest>[],
  baseDate: Date | string = new UTCDate(),
): RawPullRequest[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => {
    const state = overrides.state ?? "OPEN";
    const merged = state === "MERGED" ? 1 : 0;
    const mergedAt = state === "MERGED" ? today : null;
    const closedAt = ["MERGED", "CLOSED"].includes(state) ? today : null;

    return {
      id: faker.string.uuid(),
      number: faker.number.int({ min: 1, max: 10000 }),
      title: faker.lorem.sentence(),
      author: faker.internet.username(),
      createdAt: today,
      updatedAt: today,
      repository: "test-repo",
      additions: faker.number.int({ min: 0, max: 500 }),
      deletions: faker.number.int({ min: 0, max: 500 }),
      merged,
      mergedAt,
      closedAt,
      state,
      ...overrides,
    };
  });
}

export function generateMockReviews(
  items: Partial<PRReview>[],
  baseDate: Date | string = new UTCDate(),
): PRReview[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    prId: faker.string.uuid(),
    author: faker.internet.username(),
    createdAt: today,
    state: "COMMENTED",
    ...overrides,
  }));
}

export function generateMockPRComments(
  items: Partial<PRComment>[],
  baseDate: Date | string = new UTCDate(),
): PRComment[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    prId: faker.string.uuid(),
    author: faker.internet.username(),
    createdAt: today,
    ...overrides,
  }));
}

export function generateMockCommits(
  items: Partial<RawCommit>[],
  baseDate: Date | string = new UTCDate(),
): RawCommit[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => ({
    sha: faker.git.commitSha(),
    oid: faker.git.commitSha(),
    author: faker.internet.username(),
    authorName: faker.person.fullName(),
    authorEmail: faker.internet.email(),
    authorDate: toDateString(baseDate),
    message: faker.git.commitMessage(),
    committedDate: today,
    additions: faker.number.int({ min: 0, max: 100 }),
    deletions: faker.number.int({ min: 0, max: 100 }),
    changedFiles: faker.number.int({ min: 1, max: 5 }),
    repository: "test-repo",
    ...overrides,
  }));
}

export function generateMockIssues(
  items: Partial<RawIssue>[],
  baseDate: Date | string = new UTCDate(),
): RawIssue[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => {
    const state = overrides.state ?? "OPEN";
    const closedAt = state === "CLOSED" ? today : null;
    return {
      id: faker.string.uuid(),
      number: faker.number.int({ min: 1, max: 1000 }),
      title: faker.lorem.sentence(),
      author: faker.internet.username(),
      createdAt: today,
      updatedAt: today,
      repository: "test-repo",
      state,
      closedAt,
      ...overrides,
    };
  });
}

export function generateMockIssueComments(
  items: Partial<IssueComment>[],
  baseDate: Date | string = new UTCDate(),
): IssueComment[] {
  const today = toDateString(baseDate);

  return items.map((overrides) => ({
    id: faker.string.uuid(),
    issueId: faker.string.uuid(),
    author: faker.internet.username(),
    createdAt: today,
    ...overrides,
  }));
}

export function generateMockPullRequestFiles(
  items: Partial<InferInsertModel<typeof rawPullRequestFiles>>[],
): InferInsertModel<typeof rawPullRequestFiles>[] {
  return items.map((overrides) => {
    const prId = overrides.prId ?? faker.string.uuid();
    const path = overrides.path ?? faker.system.filePath();
    return {
      id: `${prId}_${Buffer.from(path).toString("base64")}`,
      prId,
      path,
      additions: faker.number.int({ min: 0, max: 200 }),
      deletions: faker.number.int({ min: 0, max: 100 }),
      changeType: "ADDED",
      ...overrides,
    };
  });
}

export function generateMockRepositories(
  items: Partial<InferInsertModel<typeof repositories>>[],
): InferInsertModel<typeof repositories>[] {
  return items.map((overrides) => {
    const owner = overrides.owner ?? faker.company.name();
    const name = overrides.name ?? faker.lorem.word();
    return {
      repoId: `${owner}/${name}`,
      owner,
      name,
      ...overrides,
    };
  });
}

export function generateMockUserSummaries(
  items: Partial<InferInsertModel<typeof schema.userSummaries>>[],
): InferInsertModel<typeof schema.userSummaries>[] {
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    username: faker.internet.username(),
    date: toDateString(new UTCDate()),
    summary: faker.lorem.paragraph(),
    intervalType: "day",
    ...overrides,
  }));
}

export function generateMockRepoSummaries(
  items: Partial<InferInsertModel<typeof schema.repoSummaries>>[],
): InferInsertModel<typeof schema.repoSummaries>[] {
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    repoId: faker.string.uuid(),
    date: toDateString(new UTCDate()),
    summary: faker.lorem.paragraph(),
    intervalType: "day",
    ...overrides,
  }));
}
