CREATE TABLE `executions` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`session_id` text,
	`turn_id` text,
	`submission_key` text NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`result` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
