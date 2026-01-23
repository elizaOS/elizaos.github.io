CREATE TABLE `untracked_repositories` (
	`repo_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`stars` integer DEFAULT 0,
	`forks` integer DEFAULT 0,
	`watchers` integer DEFAULT 0,
	`is_archived` integer DEFAULT false,
	`primary_language` text,
	`last_updated_at` text,
	`last_pushed_at` text,
	`open_pr_count` integer DEFAULT 0,
	`merged_pr_count` integer DEFAULT 0,
	`closed_unmerged_pr_count` integer DEFAULT 0,
	`open_issue_count` integer DEFAULT 0,
	`closed_issue_count` integer DEFAULT 0,
	`activity_score` real DEFAULT 0,
	`last_fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_untracked_repos_owner` ON `untracked_repositories` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_untracked_repos_activity_score` ON `untracked_repositories` (`activity_score`);