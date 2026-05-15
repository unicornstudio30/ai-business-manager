CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text,
	`source` text DEFAULT 'calendly' NOT NULL,
	`contact_id` text,
	`invitee_name` text,
	`invitee_email` text,
	`event_name` text,
	`scheduled_at` integer,
	`ended_at` integer,
	`status` text,
	`meeting_url` text,
	`reschedule_url` text,
	`cancel_url` text,
	`questions_and_answers` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_external_id_unique` ON `meetings` (`external_id`);--> statement-breakpoint
CREATE INDEX `meetings_scheduled_idx` ON `meetings` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `meetings_contact_idx` ON `meetings` (`contact_id`);