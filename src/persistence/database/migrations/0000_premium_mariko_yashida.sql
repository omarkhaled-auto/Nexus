CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`current_task_id` text,
	`worktree_path` text,
	`branch_name` text,
	`tokens_used` integer DEFAULT 0,
	`tasks_completed` integer DEFAULT 0,
	`tasks_failed` integer DEFAULT 0,
	`spawned_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`terminated_at` integer,
	`termination_reason` text
);
--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text,
	`reason` text,
	`state` text,
	`git_commit` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'should' NOT NULL,
	`status` text DEFAULT 'backlog' NOT NULL,
	`estimated_tasks` integer DEFAULT 0,
	`completed_tasks` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_id` text,
	`task_id` text,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`metadata` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`root_path` text NOT NULL,
	`repository_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`source` text,
	`linked_features` text,
	`validated` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`data` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sub_features` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'backlog' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`feature_id` text,
	`sub_feature_id` text,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`size` text DEFAULT 'small' NOT NULL,
	`assigned_agent` text,
	`worktree_path` text,
	`branch_name` text,
	`depends_on` text,
	`blocked_by` text,
	`qa_iterations` integer DEFAULT 0,
	`max_iterations` integer DEFAULT 50,
	`estimated_minutes` integer DEFAULT 15,
	`actual_minutes` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_feature_id`) REFERENCES `sub_features`(`id`) ON UPDATE no action ON DELETE no action
);
