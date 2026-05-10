CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_amount` integer NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`number` text NOT NULL,
	`stripe_invoice_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`amount_subtotal` integer DEFAULT 0 NOT NULL,
	`amount_tax` integer DEFAULT 0 NOT NULL,
	`amount_total` integer DEFAULT 0 NOT NULL,
	`description` text,
	`customer_name` text,
	`customer_email` text,
	`customer_document` text,
	`pdf_url` text,
	`pdf_r2_key` text,
	`due_date` integer,
	`issued_at` integer,
	`paid_at` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_stripe_invoice_id_unique` ON `invoices` (`stripe_invoice_id`);