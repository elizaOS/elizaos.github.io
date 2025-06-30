ALTER TABLE `wallet_addresses` ADD `domain_name` text(255);--> statement-breakpoint
CREATE INDEX `idx_wallet_addresses_domain_name` ON `wallet_addresses` (`domain_name`);