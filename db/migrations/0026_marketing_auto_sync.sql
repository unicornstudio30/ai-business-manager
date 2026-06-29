ALTER TABLE `users` ADD `notion_person` text;
--> statement-breakpoint
ALTER TABLE `marketing_activities` ADD `source` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_activities_source_unique` ON `marketing_activities` (`source`);
