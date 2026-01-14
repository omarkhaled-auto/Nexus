CREATE TABLE `continue_points` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`last_action` text NOT NULL,
	`file` text,
	`line` integer,
	`function_name` text,
	`next_steps` text,
	`agent_id` text,
	`iteration_count` integer DEFAULT 0 NOT NULL,
	`saved_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
