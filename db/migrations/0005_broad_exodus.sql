CREATE TABLE `published_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text DEFAULT 'buffer' NOT NULL,
	`external_id` text,
	`channel` text,
	`channel_name` text,
	`sent_at` integer,
	`text` text,
	`external_link` text,
	`status` text,
	`content_item_id` text,
	`impressions` integer,
	`likes` integer,
	`comments` integer,
	`shares` integer,
	`clicks` integer,
	`metrics_fetched_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `published_posts_external_id_unique` ON `published_posts` (`external_id`);--> statement-breakpoint
CREATE INDEX `published_posts_sent_idx` ON `published_posts` (`sent_at`);--> statement-breakpoint
CREATE INDEX `published_posts_channel_idx` ON `published_posts` (`channel`);