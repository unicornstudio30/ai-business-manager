CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`type` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`source_url` text,
	`claude_run_id` text,
	`created_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_contact_created_idx` ON `activities` (`contact_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`url` text NOT NULL,
	`summary` text,
	`scores` text,
	`detected_stack` text,
	`missing_pages` text,
	`email_draft` text,
	`claude_run_id` text,
	`created_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `claude_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`command` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`summary` text,
	`args` text
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`platform` text,
	`type` text,
	`members` integer,
	`join_date` integer,
	`engagement_level` text,
	`lead_magnets_shared` integer DEFAULT 0,
	`leads_generated` integer DEFAULT 0,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_page_id` text,
	`notion_last_synced_at` integer,
	`notion_last_edited_at` integer,
	`name` text DEFAULT '' NOT NULL,
	`email` text,
	`contact_url` text,
	`other_contact_url` text,
	`website_url` text,
	`country` text,
	`platform` text,
	`category` text,
	`position` text,
	`profession` text,
	`status` text,
	`status_date` integer,
	`follow_up_date` integer,
	`closed_date` integer,
	`saved_date` integer,
	`connection_type` text,
	`invitation_type` text,
	`engage_touch` integer,
	`cross_outreach` text,
	`remarks` text,
	`sequence_track` text,
	`last_touch_at` integer,
	`last_scanned_at` integer,
	`created_at` integer,
	`updated_at` integer,
	`dirty` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_notion_page_id_unique` ON `contacts` (`notion_page_id`);--> statement-breakpoint
CREATE INDEX `contacts_status_idx` ON `contacts` (`status`);--> statement-breakpoint
CREATE INDEX `contacts_follow_up_idx` ON `contacts` (`follow_up_date`);--> statement-breakpoint
CREATE INDEX `contacts_status_date_idx` ON `contacts` (`status_date`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_page_id` text,
	`notion_last_synced_at` integer,
	`notion_last_edited_at` integer,
	`title` text DEFAULT '' NOT NULL,
	`topic` text,
	`engagement` text,
	`framework` text,
	`url` text,
	`type` text,
	`status` text,
	`content_method` text,
	`ready_to_post_platform` text,
	`reuse_platform` text,
	`repurpose_platform` text,
	`publish_date` integer,
	`reuse_date` integer,
	`assign_user_ids` text,
	`body_markdown` text,
	`claude_run_id` text,
	`created_at` integer,
	`updated_at` integer,
	`dirty` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_notion_page_id_unique` ON `content_items` (`notion_page_id`);--> statement-breakpoint
CREATE INDEX `content_status_idx` ON `content_items` (`status`);--> statement-breakpoint
CREATE INDEX `content_publish_idx` ON `content_items` (`publish_date`);--> statement-breakpoint
CREATE TABLE `daily_sales_kpis` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`cold_dms_sent` integer DEFAULT 0,
	`cold_emails_sent` integer DEFAULT 0,
	`follow_ups_sent` integer DEFAULT 0,
	`warm_dms_sent` integer DEFAULT 0,
	`responses` integer DEFAULT 0,
	`calls_booked` integer DEFAULT 0,
	`comments_on_prospects` integer DEFAULT 0,
	`new_prospects` integer DEFAULT 0,
	`inbound_leads` integer DEFAULT 0,
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kpis_date_idx` ON `daily_sales_kpis` (`date`);--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`contact_id` text,
	`project_id` text,
	`line_item` text,
	`amount` integer NOT NULL,
	`status` text,
	`payment_date` integer,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `networking_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`activity_type` text,
	`platform` text,
	`name` text,
	`action` text,
	`lead_magnet_shared` text,
	`follow_up_needed` integer DEFAULT false,
	`follow_up_date` integer,
	`outcome` text,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`first_project_date` integer,
	`total_revenue` integer DEFAULT 0,
	`projects_count` integer DEFAULT 0,
	`satisfaction` integer,
	`last_touchpoint` integer,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_id` text,
	`service_line` text,
	`scope_summary` text,
	`start_date` integer,
	`due_date` integer,
	`status` text,
	`price` integer,
	`setup_fee` integer,
	`monthly_retainer` integer,
	`deliverables` text,
	`blockers` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `referral_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`type` text,
	`how_met` text,
	`status` text,
	`first_contact` integer,
	`last_contact` integer,
	`referrals_sent` integer DEFAULT 0,
	`referrals_received` integer DEFAULT 0,
	`incentive` text,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`direction` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`rows_changed` integer DEFAULT 0,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `tracker_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_page_id` text,
	`notion_last_synced_at` integer,
	`notion_last_edited_at` integer,
	`name` text DEFAULT '' NOT NULL,
	`tags` text,
	`notion_created_at` integer,
	`body_markdown` text,
	`created_at` integer,
	`updated_at` integer,
	`dirty` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracker_entries_notion_page_id_unique` ON `tracker_entries` (`notion_page_id`);