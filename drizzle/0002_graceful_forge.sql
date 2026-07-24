CREATE TABLE `event_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`offset_minutes` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `events` ADD `calendar_id` text DEFAULT 'primary' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reminder_offsets_minutes` text DEFAULT '[30]' NOT NULL;