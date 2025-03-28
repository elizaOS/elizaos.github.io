import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

// User table - stores basic user information
export const users = sqliteTable("users", {
  username: text("username").primaryKey(),
  avatarUrl: text("avatar_url").default(""),
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  score: real("score").notNull().default(0),
});

// Raw GitHub data tables
export const rawPullRequests = sqliteTable(
  "raw_pull_requests",
  {
    id: text("id").primaryKey(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body").default(""),
    state: text("state").notNull(),
    merged: integer("merged").notNull().default(0),
    author: text("author")
      .notNull()
      .references(() => users.username),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    closedAt: text("closed_at"),
    mergedAt: text("merged_at"),
    repository: text("repository").notNull(),
    headRefOid: text("head_ref_oid"),
    baseRefOid: text("base_ref_oid"),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    changedFiles: integer("changed_files").default(0),
    labels: text("labels").default("[]"), // JSON array of labels
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    authorIdx: index("idx_raw_prs_author").on(table.author),
    repoIdx: index("idx_raw_prs_repo").on(table.repository),
    createdAtIdx: index("idx_raw_prs_created_at").on(table.createdAt),
    repoNumberUnique: unique("unq_repo_number").on(
      table.repository,
      table.number
    ),
  })
);

export const rawPullRequestFiles = sqliteTable(
  "raw_pr_files",
  {
    id: text("id").primaryKey(), // prId_path
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    path: text("path").notNull(),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    changeType: text("changeType"),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    prIdIdx: index("idx_raw_pr_files_pr_id").on(table.prId),
    prIdPathUnique: unique("unq_pr_id_path").on(table.prId, table.path),
  })
);

export const rawIssues = sqliteTable(
  "raw_issues",
  {
    id: text("id").primaryKey(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body").default(""),
    state: text("state").notNull(),
    locked: integer("locked").default(0),
    author: text("author")
      .notNull()
      .references(() => users.username),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    closedAt: text("closed_at"),
    repository: text("repository").notNull(),
    labels: text("labels").default("[]"), // JSON array of labels
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    authorIdx: index("idx_raw_issues_author").on(table.author),
    repoIdx: index("idx_raw_issues_repo").on(table.repository),
    createdAtIdx: index("idx_raw_issues_created_at").on(table.createdAt),
    repoNumberUnique: unique("unq_issue_repo_number").on(
      table.repository,
      table.number
    ),
  })
);

export const rawCommits = sqliteTable(
  "raw_commits",
  {
    oid: text("oid").primaryKey(),
    message: text("message").notNull(),
    messageHeadline: text("message_headline"),
    committedDate: text("committed_date").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    authorDate: text("author_date").notNull(),
    author: text("author").references(() => users.username),
    repository: text("repository").notNull(),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    changedFiles: integer("changed_files").default(0),
    pullRequestId: text("pull_request_id").references(() => rawPullRequests.id),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    authorIdx: index("idx_raw_commits_author").on(table.author),
    repoIdx: index("idx_raw_commits_repo").on(table.repository),
    dateIdx: index("idx_raw_commits_date").on(table.committedDate),
    prIdx: index("idx_raw_commits_pr_id").on(table.pullRequestId),
  })
);

export const rawCommitFiles = sqliteTable(
  "raw_commit_files",
  {
    id: text("id").primaryKey(), // sha_filename
    sha: text("sha")
      .notNull()
      .references(() => rawCommits.oid),
    filename: text("filename").notNull(),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    changes: integer("changes").default(0),
    changeType: text("changeType"),
    patch: text("patch"),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shaIdx: index("idx_raw_commit_files_sha").on(table.sha),
  })
);

export const prReviews = sqliteTable(
  "pr_reviews",
  {
    id: text("id").primaryKey(),
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    state: text("state").notNull(),
    body: text("body").default(""),
    submittedAt: text("submitted_at").notNull(),
    author: text("author").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    prIdIdx: index("idx_pr_reviews_pr_id").on(table.prId),
    authorIdx: index("idx_pr_reviews_author").on(table.author),
  })
);

export const prComments = sqliteTable(
  "pr_comments",
  {
    id: text("id").primaryKey(),
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    body: text("body").default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at"),
    author: text("author").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    prIdIdx: index("idx_pr_comments_pr_id").on(table.prId),
    authorIdx: index("idx_pr_comments_author").on(table.author),
  })
);

export const issueComments = sqliteTable(
  "issue_comments",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => rawIssues.id),
    body: text("body").default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at"),
    author: text("author").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    issueIdIdx: index("idx_issue_comments_issue_id").on(table.issueId),
    authorIdx: index("idx_issue_comments_author").on(table.author),
  })
);

// Processed data tables
export const userDailySummaries = sqliteTable(
  "user_daily_summaries",
  {
    id: text("id").primaryKey(), // username_date
    username: text("username").references(() => users.username),
    date: text("date").notNull(),
    score: real("score").notNull().default(0),
    summary: text("summary").default(""),
    totalCommits: integer("total_commits").notNull().default(0),
    totalPRs: integer("total_prs").notNull().default(0),
    additions: integer("additions").notNull().default(0),
    deletions: integer("deletions").notNull().default(0),
    changedFiles: integer("changed_files").notNull().default(0),
    commits: text("commits").notNull().default("[]"), // JSON array of commits
    pullRequests: text("pull_requests").notNull().default("[]"), // JSON array of PRs
    issues: text("issues").notNull().default("[]"), // JSON array of issues
  },
  (table) => ({
    usernameIdx: index("idx_user_daily_summaries_username").on(table.username),
    dateIdx: index("idx_user_daily_summaries_date").on(table.date),
  })
);

export const userStats = sqliteTable("user_stats", {
  username: text("username")
    .references(() => users.username)
    .primaryKey(),
  totalPRs: integer("total_prs").notNull().default(0),
  mergedPRs: integer("merged_prs").notNull().default(0),
  closedPRs: integer("closed_prs").notNull().default(0),
  totalFiles: integer("total_files").notNull().default(0),
  totalAdditions: integer("total_additions").notNull().default(0),
  totalDeletions: integer("total_deletions").notNull().default(0),
  filesByType: text("files_by_type").notNull().default("{}"), // JSON string
  prsByMonth: text("prs_by_month").notNull().default("{}"), // JSON string
  focusAreas: text("focus_areas").notNull().default("[]"), // JSON array of [area, count] tuples
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tags = sqliteTable("tags", {
  name: text("name").primaryKey(),
  category: text("category").notNull(), // AREA, ROLE, TECH
  description: text("description").default(""),
  weight: real("weight").notNull().default(1.0),
  patterns: text("patterns").notNull().default("[]"), // JSON array of patterns
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userTagScores = sqliteTable(
  "user_tag_scores",
  {
    id: text("id").primaryKey(),
    username: text("username")
      .notNull()
      .references(() => users.username),
    tag: text("tag")
      .notNull()
      .references(() => tags.name),
    score: real("score").notNull().default(0),
    level: integer("level").notNull().default(0),
    progress: real("progress").notNull().default(0),
    pointsToNext: real("points_to_next").notNull().default(0),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    usernameIdx: index("idx_user_tag_scores_username").on(table.username),
  })
);

// Pipeline configuration table
export const pipelineConfig = sqliteTable("pipeline_config", {
  id: text("id").primaryKey(), // e.g., "scoring", "tags", "general"
  config: text("config").notNull(), // JSON configuration data
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Repositories being tracked
export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(), // owner/repo
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  lastFetchedAt: text("last_fetched_at").default(""),
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
