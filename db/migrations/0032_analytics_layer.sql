ALTER TABLE `contacts` ADD `in_notion` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE `stage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`from_stage` text,
	`to_stage` text,
	`seat` text,
	`at` integer NOT NULL,
	`source` text DEFAULT 'pull' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `stage_events_contact_idx` ON `stage_events` (`contact_id`,`at`);--> statement-breakpoint
CREATE INDEX `stage_events_at_idx` ON `stage_events` (`at`);--> statement-breakpoint
CREATE TABLE `pipeline_metrics` (
	`date` text NOT NULL,
	`seat` text NOT NULL,
	`metric` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_metrics_pk` ON `pipeline_metrics` (`date`,`seat`,`metric`);--> statement-breakpoint
CREATE INDEX `pipeline_metrics_seat_idx` ON `pipeline_metrics` (`seat`,`metric`);--> statement-breakpoint
CREATE TABLE `pipeline_pushes` (
	`id` text PRIMARY KEY NOT NULL,
	`received_at` integer NOT NULL,
	`generated_at` integer,
	`own_seat` text,
	`seats` text,
	`freshness` text,
	`metric_count` integer DEFAULT 0 NOT NULL
);
