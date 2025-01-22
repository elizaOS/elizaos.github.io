import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  username: text("username").primaryKey(),
  avatarUrl: text("avatar_url").default(""),
  lastUpdated: text("last_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  score: real("score").notNull().default(0),
});

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
  description: text("description").default(""),
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
    id: text("id").primaryKey(), // username_tag
    username: text("username").references(() => users.username),
    tag: text("tag").references(() => tags.name),
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
