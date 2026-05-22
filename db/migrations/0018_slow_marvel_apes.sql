ALTER TABLE `daily_sales_kpis` ADD `breakdown` text;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `lead_magnets_sent` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `engager_dms` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `revenue_generated` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `pipeline_added` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `avg_deal_size` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `daily_sales_kpis` ADD `win_analysis` text;