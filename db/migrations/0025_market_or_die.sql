CREATE TABLE `marketing_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`platform` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`points` integer NOT NULL,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `marketing_activities_user_week_idx` ON `marketing_activities` (`user_id`,`week_start`);
--> statement-breakpoint
CREATE INDEX `marketing_activities_week_idx` ON `marketing_activities` (`week_start`);
--> statement-breakpoint
CREATE TABLE `marketing_weekly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`target_points` integer NOT NULL,
	`set_by` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_targets_user_week_unique` ON `marketing_weekly_targets` (`user_id`,`week_start`);
