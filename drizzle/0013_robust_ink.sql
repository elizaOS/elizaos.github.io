CREATE TABLE `social_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`platform` text DEFAULT 'x' NOT NULL,
	`platform_user_id` text NOT NULL,
	`platform_username` text NOT NULL,
	`display_name` text,
	`profile_url` text,
	`is_verified` integer DEFAULT false,
	`is_primary` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`verification_method` text,
	`last_synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_social_accounts_user_id` ON `social_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_social_accounts_platform` ON `social_accounts` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_social_accounts_platform_user_id` ON `social_accounts` (`platform_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_user_platform` ON `social_accounts` (`user_id`,`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_platform_user_id` ON `social_accounts` (`platform`,`platform_user_id`);--> statement-breakpoint
CREATE TABLE `x_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`activity_type` text NOT NULL,
	`content` text,
	`target_post_id` text,
	`target_user_id` text,
	`is_about_sendo` integer DEFAULT true NOT NULL,
	`mentions_sendo_market` integer DEFAULT false,
	`hashtags_used` text,
	`media_count` integer DEFAULT 0,
	`engagement_count` integer DEFAULT 0,
	`likes_count` integer DEFAULT 0,
	`reposts_count` integer DEFAULT 0,
	`replies_count` integer DEFAULT 0,
	`views_count` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_x_activities_username` ON `x_activities` (`username`);--> statement-breakpoint
CREATE INDEX `idx_x_activities_type` ON `x_activities` (`activity_type`);--> statement-breakpoint
CREATE INDEX `idx_x_activities_created_at` ON `x_activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_x_activities_sendo` ON `x_activities` (`is_about_sendo`);--> statement-breakpoint
CREATE INDEX `idx_x_activities_username_date` ON `x_activities` (`username`,`created_at`);--> statement-breakpoint
ALTER TABLE `user_daily_scores` ADD `social_score` real DEFAULT 0;