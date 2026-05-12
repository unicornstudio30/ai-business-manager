CREATE TABLE `lead_scores` (
	`contact_id` text PRIMARY KEY NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`stage_weight` integer DEFAULT 0 NOT NULL,
	`recency_score` integer DEFAULT 0 NOT NULL,
	`engagement_score` integer DEFAULT 0 NOT NULL,
	`reply_score` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
