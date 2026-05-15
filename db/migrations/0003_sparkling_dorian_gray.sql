ALTER TABLE `activities` ADD `channel` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `needs_reply` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `replied_at` integer;--> statement-breakpoint
CREATE INDEX `activities_needs_reply_idx` ON `activities` (`needs_reply`);