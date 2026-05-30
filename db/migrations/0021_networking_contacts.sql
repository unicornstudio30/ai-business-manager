CREATE TABLE `networking_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_page_id` text,
	`notion_last_synced_at` integer,
	`notion_last_edited_at` integer,
	`name` text DEFAULT '' NOT NULL,
	`relationship` text,
	`source` text,
	`profile_url` text,
	`email` text,
	`phone` text,
	`platform` text,
	`location` text,
	`profession` text,
	`company` text,
	`role` text,
	`interests` text,
	`tags` text,
	`stage` text,
	`last_contact_at` integer,
	`next_follow_up_at` integer,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	`dirty` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `networking_contacts_notion_page_id_unique` ON `networking_contacts` (`notion_page_id`);
--> statement-breakpoint
CREATE INDEX `networking_contacts_name_idx` ON `networking_contacts` (`name`);
--> statement-breakpoint
CREATE INDEX `networking_contacts_stage_idx` ON `networking_contacts` (`stage`);
--> statement-breakpoint
CREATE INDEX `networking_contacts_follow_up_idx` ON `networking_contacts` (`next_follow_up_at`);
