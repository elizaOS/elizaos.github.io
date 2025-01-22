CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL,
	`description` text DEFAULT '',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_daily_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`date` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`summary` text DEFAULT '',
	`total_commits` integer DEFAULT 0 NOT NULL,
	`total_prs` integer DEFAULT 0 NOT NULL,
	`additions` integer DEFAULT 0 NOT NULL,
	`deletions` integer DEFAULT 0 NOT NULL,
	`changed_files` integer DEFAULT 0 NOT NULL,
	`commits` text DEFAULT '[]' NOT NULL,
	`pull_requests` text DEFAULT '[]' NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_username` ON `user_daily_summaries` (`username`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_date` ON `user_daily_summaries` (`date`);--> statement-breakpoint
CREATE TABLE `user_stats` (
	`username` text PRIMARY KEY NOT NULL,
	`total_prs` integer DEFAULT 0 NOT NULL,
	`merged_prs` integer DEFAULT 0 NOT NULL,
	`closed_prs` integer DEFAULT 0 NOT NULL,
	`total_files` integer DEFAULT 0 NOT NULL,
	`total_additions` integer DEFAULT 0 NOT NULL,
	`total_deletions` integer DEFAULT 0 NOT NULL,
	`files_by_type` text DEFAULT '{}' NOT NULL,
	`prs_by_month` text DEFAULT '{}' NOT NULL,
	`focus_areas` text DEFAULT '[]' NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_tag_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`tag` text,
	`score` real DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`points_to_next` real DEFAULT 0 NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag`) REFERENCES `tags`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_username` ON `user_tag_scores` (`username`);--> statement-breakpoint
CREATE TABLE `users` (
	`username` text PRIMARY KEY NOT NULL,
	`avatar_url` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`score` real DEFAULT 0 NOT NULL
);
