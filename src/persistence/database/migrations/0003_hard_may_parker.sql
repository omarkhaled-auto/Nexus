CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`embedding` text,
	`context` text,
	`task_id` text,
	`agent_id` text,
	`importance` real DEFAULT 1,
	`access_count` integer DEFAULT 0,
	`last_accessed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
