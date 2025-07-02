CREATE TABLE `overall_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`interval_type` text DEFAULT 'month' NOT NULL,
	`date` text NOT NULL,
	`summary` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_overall_summaries_date` ON `overall_summaries` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_overall_summaries_unique_combo` ON `overall_summaries` (`interval_type`,`date`);