CREATE TABLE `user_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`badge_type` text NOT NULL,
	`tier` text NOT NULL,
	`earned_at` text NOT NULL,
	`trigger_value` real NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_badges_username` ON `user_badges` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_badges_unique` ON `user_badges` (`username`,`badge_type`);