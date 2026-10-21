CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`shop` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`owner` text NOT NULL,
	`shop` text NOT NULL,
	`name` text NOT NULL,
	`credentials` text NOT NULL,
	`scopes` text NOT NULL,
	`connected_at` text NOT NULL,
	PRIMARY KEY(`owner`, `shop`)
);
