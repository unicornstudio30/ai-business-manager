CREATE TABLE `ai_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`response` text NOT NULL,
	`created_at` integer,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `icp_classification` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `icp_classified_at` integer;