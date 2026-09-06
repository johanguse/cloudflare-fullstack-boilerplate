CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
DELETE FROM `subscriptions` WHERE `rowid` NOT IN (SELECT MAX(`rowid`) FROM `subscriptions` GROUP BY `user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);