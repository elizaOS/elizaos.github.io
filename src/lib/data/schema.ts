import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// User table - stores basic user information
export const users = sqliteTable("users", {
  username: text("username").primaryKey(),
  avatarUrl: text("avatar_url").default(""),
  isBot: integer("is_bot").notNull().default(0),
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  walletDataUpdatedAt: integer("wallet_data_updated_at"),
});

// Wallet addresses table - stores user wallet addresses across different chains
export const walletAddresses = sqliteTable(
  "wallet_addresses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.username, { onDelete: "cascade" }),
    chainId: text("chain_id", { length: 100 }).notNull(),
    accountAddress: text("account_address", { length: 100 }).notNull(),
    label: text("label", { length: 100 }),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_wallet_addresses_user_id").on(table.userId),
    index("idx_wallet_addresses_chain_id").on(table.chainId),
    index("idx_wallet_addresses_address").on(table.accountAddress),
    unique("unq_user_chain_address").on(
      table.userId,
      table.chainId,
      table.accountAddress,
    ),
    uniqueIndex("unq_user_chain_primary")
      .on(table.userId, table.chainId)
      .where(sql`${table.isPrimary} = 1`),
  ],
);

// Repositories being tracked
export const repositories = sqliteTable(
  "repositories",
  {
    repoId: text("repo_id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    stars: integer("stars").default(0),
    forks: integer("forks").default(0),
    lastFetchedAt: text("last_fetched_at").default(""),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique("unq_repo_owner_name").on(table.owner, table.name)],
);

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
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_raw_prs_author").on(table.author),
    index("idx_raw_prs_repo").on(table.repository),
    index("idx_raw_prs_created_at").on(table.createdAt),
    unique("unq_repo_number").on(table.repository, table.number),
    index("idx_raw_prs_repo_author_date").on(
      table.repository,
      table.author,
      table.createdAt,
    ),
    index("idx_raw_prs_state").on(table.state),
    index("idx_raw_prs_merged").on(table.merged),
  ],
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
  (table) => [
    index("idx_raw_pr_files_pr_id").on(table.prId),
    unique("unq_pr_id_path").on(table.prId, table.path),
  ],
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
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_raw_issues_author").on(table.author),
    index("idx_raw_issues_repo").on(table.repository),
    index("idx_raw_issues_created_at").on(table.createdAt),
    unique("unq_issue_repo_number").on(table.repository, table.number),
    index("idx_raw_issues_repo_author_date").on(
      table.repository,
      table.author,
      table.createdAt,
    ),
    index("idx_raw_issues_state").on(table.state),
  ],
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
  (table) => [
    index("idx_raw_commits_author").on(table.author),
    index("idx_raw_commits_repo").on(table.repository),
    index("idx_raw_commits_date").on(table.committedDate),
    index("idx_raw_commits_pr_id").on(table.pullRequestId),
    index("idx_raw_commits_repo_author_date").on(
      table.repository,
      table.author,
      table.committedDate,
    ),
  ],
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
  (table) => [index("idx_raw_commit_files_sha").on(table.sha)],
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
    createdAt: text("created_at").notNull(),
    author: text("author").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_pr_reviews_pr_id").on(table.prId),
    index("idx_pr_reviews_author").on(table.author),
    index("idx_pr_reviews_author_date").on(table.author, table.createdAt),
  ],
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
  (table) => [
    index("idx_pr_comments_pr_id").on(table.prId),
    index("idx_pr_comments_author").on(table.author),
    index("idx_pr_comments_author_date").on(table.author, table.createdAt),
  ],
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
  (table) => [
    index("idx_issue_comments_issue_id").on(table.issueId),
    index("idx_issue_comments_author").on(table.author),
    index("idx_issue_comments_author_date").on(table.author, table.createdAt),
  ],
);

// Processed data tables
export const userSummaries = sqliteTable(
  "user_summaries",
  {
    id: text("id").primaryKey(), // username_intervalType_date
    username: text("username").references(() => users.username),
    intervalType: text("interval_type", {
      enum: ["day", "week", "month"] as const,
    })
      .notNull()
      .default("day"),
    date: text("date").notNull(),
    summary: text("summary").default(""),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_user_daily_summaries_username").on(table.username),
    index("idx_user_daily_summaries_date").on(table.date),
    // Unique constraint for username, interval type, and date combination
    uniqueIndex("idx_user_daily_summaries_unique_combo").on(
      table.username,
      table.intervalType,
      table.date,
    ),
  ],
);

// Repository summaries for storing monthly project analysis
export const repoSummaries = sqliteTable(
  "repo_summaries",
  {
    id: text("id").primaryKey(), // repo_id_intervalType_date
    repoId: text("repo_id").notNull(),
    intervalType: text("interval_type", {
      enum: ["day", "week", "month"] as const,
    })
      .notNull()
      .default("month"),
    date: text("date").notNull(),
    summary: text("summary").default(""),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_repo_summaries_repo_id").on(table.repoId),
    index("idx_repo_summaries_date").on(table.date),
    // Unique constraint for repoId, interval type, and date combination
    uniqueIndex("idx_repo_summaries_unique_combo").on(
      table.repoId,
      table.intervalType,
      table.date,
    ),
  ],
);

// Overall summaries for storing combined project analysis
export const overallSummaries = sqliteTable(
  "overall_summaries",
  {
    id: text("id").primaryKey(), // intervalType_date
    intervalType: text("interval_type", {
      enum: ["day", "week", "month"] as const,
    })
      .notNull()
      .default("month"),
    date: text("date").notNull(),
    summary: text("summary").default(""),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_overall_summaries_date").on(table.date),
    // Unique constraint for interval type and date combination
    uniqueIndex("idx_overall_summaries_unique_combo").on(
      table.intervalType,
      table.date,
    ),
  ],
);

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
  (table) => [
    index("idx_user_tag_scores_username").on(table.username),
    index("idx_user_tag_scores_tag").on(table.tag),
    index("idx_user_tag_scores_score").on(table.score),
    index("idx_user_tag_scores_username_tag").on(table.username, table.tag),
  ],
);

// Labels table for storing unique labels
export const labels = sqliteTable(
  "labels",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    description: text("description").default(""),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_labels_name").on(table.name)],
);

// Junction table for PR-Label relationships
export const pullRequestLabels = sqliteTable(
  "pull_request_labels",
  {
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.prId, table.labelId] }),
    index("idx_pr_labels_pr_id").on(table.prId),
    index("idx_pr_labels_label_id").on(table.labelId),
  ],
);

// Junction table for Issue-Label relationships
export const issueLabels = sqliteTable(
  "issue_labels",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => rawIssues.id),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    index("idx_issue_labels_issue_id").on(table.issueId),
    index("idx_issue_labels_label_id").on(table.labelId),
  ],
);

// User daily scores for leaderboard and time-based analytics
export const userDailyScores = sqliteTable(
  "user_daily_scores",
  {
    id: text("id").primaryKey(), // username_date_category
    username: text("username")
      .notNull()
      .references(() => users.username, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD format
    timestamp: text("timestamp")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    score: real("score").notNull().default(0),
    prScore: real("pr_score").default(0),
    issueScore: real("issue_score").default(0),
    reviewScore: real("review_score").default(0),
    commentScore: real("comment_score").default(0),
    metrics: text("metrics").notNull().default("{}"), // JSON string of all metrics
    category: text("category").default("day"),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_user_daily_scores_username").on(table.username),
    index("idx_user_daily_scores_date").on(table.date),
    index("idx_user_daily_scores_category").on(table.category),
    uniqueIndex("idx_user_daily_scores_username_date_category").on(
      table.username,
      table.date,
      table.category,
    ),
    index("idx_user_daily_scores_username_date").on(table.username, table.date),
  ],
);

// Now define all relations after all tables are defined
export const usersRelations = relations(users, ({ many }) => ({
  pullRequests: many(rawPullRequests),
  issues: many(rawIssues),
  commits: many(rawCommits),
  tagScores: many(userTagScores),
  dailySummaries: many(userSummaries),
  dailyScores: many(userDailyScores),
  walletAddresses: many(walletAddresses),
  badges: many(userBadges),
}));

export const walletAddressesRelations = relations(
  walletAddresses,
  ({ one }) => ({
    user: one(users, {
      fields: [walletAddresses.userId],
      references: [users.username],
    }),
  }),
);

export const pullRequestRelations = relations(
  rawPullRequests,
  ({ one, many }) => ({
    author: one(users, {
      fields: [rawPullRequests.author],
      references: [users.username],
    }),
    files: many(rawPullRequestFiles),
    reviews: many(prReviews),
    comments: many(prComments),
    commits: many(rawCommits),
    labels: many(pullRequestLabels),
  }),
);

export const pullRequestFilesRelations = relations(
  rawPullRequestFiles,
  ({ one }) => ({
    pullRequest: one(rawPullRequests, {
      fields: [rawPullRequestFiles.prId],
      references: [rawPullRequests.id],
    }),
  }),
);

export const issuesRelations = relations(rawIssues, ({ one, many }) => ({
  author: one(users, {
    fields: [rawIssues.author],
    references: [users.username],
  }),
  comments: many(issueComments),
  labels: many(issueLabels),
}));

export const commitsRelations = relations(rawCommits, ({ one, many }) => ({
  author: one(users, {
    fields: [rawCommits.author],
    references: [users.username],
  }),
  files: many(rawCommitFiles),
  pullRequest: one(rawPullRequests, {
    fields: [rawCommits.pullRequestId],
    references: [rawPullRequests.id],
  }),
}));

export const commitFilesRelations = relations(rawCommitFiles, ({ one }) => ({
  commit: one(rawCommits, {
    fields: [rawCommitFiles.sha],
    references: [rawCommits.oid],
  }),
}));

export const prReviewsRelations = relations(prReviews, ({ one }) => ({
  pullRequest: one(rawPullRequests, {
    fields: [prReviews.prId],
    references: [rawPullRequests.id],
  }),
  author: one(users, {
    fields: [prReviews.author],
    references: [users.username],
  }),
}));

export const prCommentsRelations = relations(prComments, ({ one }) => ({
  pullRequest: one(rawPullRequests, {
    fields: [prComments.prId],
    references: [rawPullRequests.id],
  }),
  author: one(users, {
    fields: [prComments.author],
    references: [users.username],
  }),
}));

export const issueCommentsRelations = relations(issueComments, ({ one }) => ({
  issue: one(rawIssues, {
    fields: [issueComments.issueId],
    references: [rawIssues.id],
  }),
  author: one(users, {
    fields: [issueComments.author],
    references: [users.username],
  }),
}));

export const userDailySummariesRelations = relations(
  userSummaries,
  ({ one }) => ({
    user: one(users, {
      fields: [userSummaries.username],
      references: [users.username],
    }),
  }),
);

export const userTagScoresRelations = relations(userTagScores, ({ one }) => ({
  user: one(users, {
    fields: [userTagScores.username],
    references: [users.username],
  }),
  tagRef: one(tags, {
    fields: [userTagScores.tag],
    references: [tags.name],
  }),
}));

// Add relations for labels
export const labelsRelations = relations(labels, ({ many }) => ({
  pullRequests: many(pullRequestLabels),
  issues: many(issueLabels),
}));

export const pullRequestLabelsRelations = relations(
  pullRequestLabels,
  ({ one }) => ({
    pullRequest: one(rawPullRequests, {
      fields: [pullRequestLabels.prId],
      references: [rawPullRequests.id],
    }),
    label: one(labels, {
      fields: [pullRequestLabels.labelId],
      references: [labels.id],
    }),
  }),
);

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(rawIssues, {
    fields: [issueLabels.issueId],
    references: [rawIssues.id],
  }),
  label: one(labels, {
    fields: [issueLabels.labelId],
    references: [labels.id],
  }),
}));

// Add relations for repoSummaries
export const repoSummariesRelations = relations(repoSummaries, ({ one }) => ({
  repository: one(repositories, {
    fields: [repoSummaries.repoId],
    references: [repositories.repoId],
  }),
}));

// Add relations for userDailyScores
export const userDailyScoresRelations = relations(
  userDailyScores,
  ({ one }) => ({
    user: one(users, {
      fields: [userDailyScores.username],
      references: [users.username],
    }),
  }),
);

// Add relations for tags
export const tagsRelations = relations(tags, ({ many }) => ({
  userScores: many(userTagScores),
}));

// New tables for reactions and closing issue references

// Reactions on PRs
export const prReactions = sqliteTable(
  "pr_reactions",
  {
    id: text("id").primaryKey(),
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    content: text("content").notNull(), // thumbs_up, thumbs_down, laugh, hooray, confused, heart, rocket, eyes
    createdAt: text("created_at").notNull(),
    user: text("user").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_pr_reactions_pr_id").on(table.prId),
    index("idx_pr_reactions_user").on(table.user),
    index("idx_pr_reactions_content").on(table.content),
    unique("unq_pr_reaction_user_content").on(
      table.prId,
      table.user,
      table.content,
    ),
  ],
);

// Reactions on PR comments
export const prCommentReactions = sqliteTable(
  "pr_comment_reactions",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => prComments.id),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    user: text("user").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_pr_comment_reactions_comment_id").on(table.commentId),
    index("idx_pr_comment_reactions_user").on(table.user),
    index("idx_pr_comment_reactions_content").on(table.content),
    unique("unq_pr_comment_reaction_user_content").on(
      table.commentId,
      table.user,
      table.content,
    ),
  ],
);

// Reactions on issues
export const issueReactions = sqliteTable(
  "issue_reactions",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => rawIssues.id),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    user: text("user").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_issue_reactions_issue_id").on(table.issueId),
    index("idx_issue_reactions_user").on(table.user),
    index("idx_issue_reactions_content").on(table.content),
    unique("unq_issue_reaction_user_content").on(
      table.issueId,
      table.user,
      table.content,
    ),
  ],
);

// Reactions on issue comments
export const issueCommentReactions = sqliteTable(
  "issue_comment_reactions",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => issueComments.id),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    user: text("user").references(() => users.username),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_issue_comment_reactions_comment_id").on(table.commentId),
    index("idx_issue_comment_reactions_user").on(table.user),
    index("idx_issue_comment_reactions_content").on(table.content),
    unique("unq_issue_comment_reaction_user_content").on(
      table.commentId,
      table.user,
      table.content,
    ),
  ],
);

// Closing issue references for PRs
export const prClosingIssueReferences = sqliteTable(
  "pr_closing_issue_references",
  {
    id: text("id").primaryKey(), // prId_issueId
    prId: text("pr_id")
      .notNull()
      .references(() => rawPullRequests.id),
    issueId: text("issue_id")
      .notNull()
      .references(() => rawIssues.id),
    issueNumber: integer("issue_number").notNull(),
    issueTitle: text("issue_title").notNull(),
    issueState: text("issue_state").notNull(),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_pr_closing_issue_refs_pr_id").on(table.prId),
    index("idx_pr_closing_issue_refs_issue_id").on(table.issueId),
    unique("unq_pr_closing_issue_ref").on(table.prId, table.issueId),
  ],
);

// User badges for achievement/recognition system
export const userBadges = sqliteTable(
  "user_badges",
  {
    id: text("id").primaryKey(), // username_badgeType
    username: text("username")
      .notNull()
      .references(() => users.username, { onDelete: "cascade" }),
    badgeType: text("badge_type").notNull(), // 'level', 'streak', 'pr_master', etc.
    tier: text("tier").notNull(), // 'beginner', 'elite', 'legend'
    earnedAt: text("earned_at").notNull(),
    triggerValue: real("trigger_value").notNull(), // Value that earned the badge
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_user_badges_username").on(table.username),
    unique("idx_user_badges_unique").on(table.username, table.badgeType),
  ],
);

// Add relations for userBadges
export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.username],
    references: [users.username],
  }),
}));
