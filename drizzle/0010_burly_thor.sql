ALTER TABLE `repositories` RENAME COLUMN "org" TO "owner";--> statement-breakpoint
ALTER TABLE `repositories` ADD `name` text NOT NULL;