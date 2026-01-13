ALTER TABLE `features` ADD `complexity` text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE `requirements` ADD `user_stories` text;--> statement-breakpoint
ALTER TABLE `requirements` ADD `acceptance_criteria` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `type` text DEFAULT 'auto' NOT NULL;