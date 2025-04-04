CREATE TABLE `issue_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`body` text DEFAULT '',
	`created_at` text NOT NULL,
	`updated_at` text,
	`author` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `raw_issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_issue_comments_issue_id` ON `issue_comments` (`issue_id`);--> statement-breakpoint
CREATE INDEX `idx_issue_comments_author` ON `issue_comments` (`author`);--> statement-breakpoint
CREATE INDEX `idx_issue_comments_author_date` ON `issue_comments` (`author`,`created_at`);--> statement-breakpoint
CREATE TABLE `pr_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`body` text DEFAULT '',
	`created_at` text NOT NULL,
	`updated_at` text,
	`author` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_comments_pr_id` ON `pr_comments` (`pr_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_comments_author` ON `pr_comments` (`author`);--> statement-breakpoint
CREATE INDEX `idx_pr_comments_author_date` ON `pr_comments` (`author`,`created_at`);--> statement-breakpoint
CREATE TABLE `pr_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`state` text NOT NULL,
	`body` text DEFAULT '',
	`created_at` text NOT NULL,
	`author` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_pr_id` ON `pr_reviews` (`pr_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_author` ON `pr_reviews` (`author`);--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_author_date` ON `pr_reviews` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_state` ON `pr_reviews` (`state`);--> statement-breakpoint
CREATE TABLE `raw_commit_files` (
	`id` text PRIMARY KEY NOT NULL,
	`sha` text NOT NULL,
	`filename` text NOT NULL,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	`changes` integer DEFAULT 0,
	`changeType` text,
	`patch` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sha`) REFERENCES `raw_commits`(`oid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_raw_commit_files_sha` ON `raw_commit_files` (`sha`);--> statement-breakpoint
CREATE TABLE `raw_commits` (
	`oid` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`message_headline` text,
	`committed_date` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`author_date` text NOT NULL,
	`author` text,
	`repository` text NOT NULL,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	`changed_files` integer DEFAULT 0,
	`pull_request_id` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pull_request_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_raw_commits_author` ON `raw_commits` (`author`);--> statement-breakpoint
CREATE INDEX `idx_raw_commits_repo` ON `raw_commits` (`repository`);--> statement-breakpoint
CREATE INDEX `idx_raw_commits_date` ON `raw_commits` (`committed_date`);--> statement-breakpoint
CREATE INDEX `idx_raw_commits_pr_id` ON `raw_commits` (`pull_request_id`);--> statement-breakpoint
CREATE INDEX `idx_raw_commits_repo_author_date` ON `raw_commits` (`repository`,`author`,`committed_date`);--> statement-breakpoint
CREATE TABLE `raw_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '',
	`state` text NOT NULL,
	`locked` integer DEFAULT 0,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`closed_at` text,
	`repository` text NOT NULL,
	`labels` text DEFAULT '[]',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_raw_issues_author` ON `raw_issues` (`author`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_repo` ON `raw_issues` (`repository`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_created_at` ON `raw_issues` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_repo_author_date` ON `raw_issues` (`repository`,`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_state` ON `raw_issues` (`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_issue_repo_number` ON `raw_issues` (`repository`,`number`);--> statement-breakpoint
CREATE TABLE `raw_pr_files` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`path` text NOT NULL,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	`changeType` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_raw_pr_files_pr_id` ON `raw_pr_files` (`pr_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_pr_id_path` ON `raw_pr_files` (`pr_id`,`path`);--> statement-breakpoint
CREATE TABLE `raw_pull_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '',
	`state` text NOT NULL,
	`merged` integer DEFAULT 0 NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`closed_at` text,
	`merged_at` text,
	`repository` text NOT NULL,
	`head_ref_oid` text,
	`base_ref_oid` text,
	`additions` integer DEFAULT 0,
	`deletions` integer DEFAULT 0,
	`changed_files` integer DEFAULT 0,
	`labels` text DEFAULT '[]',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_raw_prs_author` ON `raw_pull_requests` (`author`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_repo` ON `raw_pull_requests` (`repository`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_created_at` ON `raw_pull_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_repo_author_date` ON `raw_pull_requests` (`repository`,`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_state` ON `raw_pull_requests` (`state`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_merged` ON `raw_pull_requests` (`merged`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_repo_number` ON `raw_pull_requests` (`repository`,`number`);--> statement-breakpoint
CREATE TABLE `repositories` (
	`repo_id` text PRIMARY KEY NOT NULL,
	`last_fetched_at` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '',
	`weight` real DEFAULT 1 NOT NULL,
	`patterns` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_daily_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`date` text NOT NULL,
	`summary` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_username` ON `user_daily_summaries` (`username`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_date` ON `user_daily_summaries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_username_date` ON `user_daily_summaries` (`username`,`date`);--> statement-breakpoint
CREATE TABLE `user_tag_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`tag` text NOT NULL,
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
CREATE INDEX `idx_user_tag_scores_tag` ON `user_tag_scores` (`tag`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_score` ON `user_tag_scores` (`score`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_username_tag` ON `user_tag_scores` (`username`,`tag`);--> statement-breakpoint
CREATE TABLE `users` (
	`username` text PRIMARY KEY NOT NULL,
	`avatar_url` text DEFAULT '',
	`is_bot` integer DEFAULT 0 NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`score` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_score` ON `users` (`score`);