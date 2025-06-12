CREATE TABLE `wallet_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`chain_id` text(100) NOT NULL,
	`account_address` text(100) NOT NULL,
	`label` text(100),
	`is_primary` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_wallet_addresses_user_id` ON `wallet_addresses` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wallet_addresses_chain_id` ON `wallet_addresses` (`chain_id`);--> statement-breakpoint
CREATE INDEX `idx_wallet_addresses_address` ON `wallet_addresses` (`account_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_user_chain_primary` ON `wallet_addresses` (`user_id`,`chain_id`) WHERE "wallet_addresses"."is_primary" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_user_chain_address` ON `wallet_addresses` (`user_id`,`chain_id`,`account_address`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `eth_address`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `sol_address`;