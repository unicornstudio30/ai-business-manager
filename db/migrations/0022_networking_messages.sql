CREATE TABLE `networking_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`purpose` text,
	`context_chips` text,
	`context_detail` text,
	`cta_chips` text,
	`tone` text,
	`framework` text,
	`channel` text,
	`language` text,
	`topic` text,
	`generated_short` text,
	`generated_standard` text,
	`generated_detailed` text,
	`chosen_variant` text,
	`strength_score` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`sent_at` integer,
	`response_at` integer,
	`response_type` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `networking_messages_contact_idx` ON `networking_messages` (`contact_id`);
--> statement-breakpoint
CREATE INDEX `networking_messages_status_idx` ON `networking_messages` (`status`);
