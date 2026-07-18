ALTER TABLE `sales_activities` ADD `contact_id` text;
--> statement-breakpoint
CREATE INDEX `sales_activities_contact_idx` ON `sales_activities` (`contact_id`);
--> statement-breakpoint
-- Backfill contact_id from existing source keys ("contact_stage:<id>:<stage>"
-- from auto-sync + manual stage logs).
UPDATE `sales_activities`
SET `contact_id` = substr(`source`, 15, instr(substr(`source`, 15), ':') - 1)
WHERE `source` LIKE 'contact_stage:%' AND `contact_id` IS NULL;
--> statement-breakpoint
-- Also backfill from crm_activity:<activityId> by joining to activities table.
UPDATE `sales_activities`
SET `contact_id` = (
  SELECT a.contact_id FROM `activities` a
  WHERE `sales_activities`.`source` = 'crm_activity:' || a.id
)
WHERE `source` LIKE 'crm_activity:%' AND `contact_id` IS NULL;
