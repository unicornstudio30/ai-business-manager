DROP INDEX `content_status_idx`;--> statement-breakpoint
DROP INDEX `content_publish_idx`;--> statement-breakpoint
CREATE INDEX `content_linkedin_publish_idx` ON `content_items` (`linkedin_publish_date`);--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `topic`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `engagement`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `engaged_people_list`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `framework`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `instagram_status`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `instagram_metrics`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `instagram_engaged_people`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `content_method`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `ready_to_post_platform`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `published_platform`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `publish_date`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `reuse_date`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `instagram_publish_date`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `instagram_reuse_date`;--> statement-breakpoint
ALTER TABLE `content_items` DROP COLUMN `assign_user_ids`;