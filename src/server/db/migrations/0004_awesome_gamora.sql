CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_notification_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`notify_payment_receipt` integer DEFAULT true NOT NULL,
	`notify_invoice` integer DEFAULT true NOT NULL,
	`notify_nfse_issued` integer DEFAULT true NOT NULL,
	`notify_low_balance` integer DEFAULT true NOT NULL,
	`notify_subscription_changed` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
