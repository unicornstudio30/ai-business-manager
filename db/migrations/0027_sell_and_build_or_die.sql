CREATE TABLE `sales_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`points` integer NOT NULL,
	`notes` text,
	`source` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `sales_activities_user_week_idx` ON `sales_activities` (`user_id`,`week_start`);
--> statement-breakpoint
CREATE INDEX `sales_activities_week_idx` ON `sales_activities` (`week_start`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_activities_source_unique` ON `sales_activities` (`source`);
--> statement-breakpoint
CREATE TABLE `sales_weekly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`target_points` integer NOT NULL,
	`set_by` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_targets_user_week_unique` ON `sales_weekly_targets` (`user_id`,`week_start`);
--> statement-breakpoint
CREATE TABLE `build_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`stack` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`points` integer NOT NULL,
	`notes` text,
	`source` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `build_activities_user_week_idx` ON `build_activities` (`user_id`,`week_start`);
--> statement-breakpoint
CREATE INDEX `build_activities_week_idx` ON `build_activities` (`week_start`);
--> statement-breakpoint
CREATE UNIQUE INDEX `build_activities_source_unique` ON `build_activities` (`source`);
--> statement-breakpoint
CREATE TABLE `build_weekly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`target_points` integer NOT NULL,
	`set_by` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `build_targets_user_week_unique` ON `build_weekly_targets` (`user_id`,`week_start`);
