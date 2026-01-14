-- Hotfix #2: Add missing metadata fields
-- Issue 1: ProjectSettings
ALTER TABLE `projects` ADD `settings` text;--> statement-breakpoint

-- Issue 2: Agent Configuration
ALTER TABLE `agents` ADD `model_provider` text DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `model_name` text DEFAULT 'claude-sonnet-4' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `temperature` real DEFAULT 0.3 NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `max_tokens` integer DEFAULT 8000 NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `system_prompt` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `tools` text;--> statement-breakpoint

-- Issue 3: Requirement Metadata
ALTER TABLE `requirements` ADD `confidence` real DEFAULT 1.0;--> statement-breakpoint
ALTER TABLE `requirements` ADD `tags` text;--> statement-breakpoint

-- Issue 4: Task Metadata
ALTER TABLE `tasks` ADD `priority` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `notes` text;
