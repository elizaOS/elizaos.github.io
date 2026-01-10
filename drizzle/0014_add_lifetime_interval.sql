PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`interval_type` text DEFAULT 'day' NOT NULL CHECK(`interval_type` IN ('day', 'week', 'month', 'lifetime')),
	`date` text NOT NULL,
	`summary` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_user_summaries`("id", "username", "interval_type", "date", "summary", "last_updated") SELECT "id", "username", "interval_type", "date", "summary", "last_updated" FROM `user_summaries`;--> statement-breakpoint
DROP TABLE `user_summaries`;--> statement-breakpoint
ALTER TABLE `__new_user_summaries` RENAME TO `user_summaries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_username` ON `user_summaries` (`username`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_date` ON `user_summaries` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_daily_summaries_unique_combo` ON `user_summaries` (`username`,`interval_type`,`date`);
