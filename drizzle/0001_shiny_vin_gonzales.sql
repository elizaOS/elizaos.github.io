CREATE TABLE `issue_labels` (
	`issue_id` text NOT NULL,
	`label_id` text NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`issue_id`, `label_id`),
	FOREIGN KEY (`issue_id`) REFERENCES `raw_issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_issue_labels_issue_id` ON `issue_labels` (`issue_id`);--> statement-breakpoint
CREATE INDEX `idx_issue_labels_label_id` ON `issue_labels` (`label_id`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`description` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_labels_name` ON `labels` (`name`);--> statement-breakpoint
CREATE TABLE `pull_request_labels` (
	`pr_id` text NOT NULL,
	`label_id` text NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`pr_id`, `label_id`),
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_labels_pr_id` ON `pull_request_labels` (`pr_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_labels_label_id` ON `pull_request_labels` (`label_id`);--> statement-breakpoint
ALTER TABLE `raw_issues` DROP COLUMN `labels`;--> statement-breakpoint
ALTER TABLE `raw_pull_requests` DROP COLUMN `labels`;