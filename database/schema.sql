CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`hold` text NOT NULL,
	`user` text NOT NULL,
	`show` text NOT NULL,
	`seats` text NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_user` ON `bookings` (`user`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_hold` ON `bookings` (`hold`);--> statement-breakpoint
CREATE TABLE `closed_shows` (
	`id` text PRIMARY KEY NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `holds` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`show` text NOT NULL,
	`seats` text NOT NULL,
	`total` integer NOT NULL,
	`expires` integer NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `holds_user` ON `holds` (`user`);--> statement-breakpoint
CREATE TABLE `locks` (
	`id` text PRIMARY KEY NOT NULL,
	`show` text NOT NULL,
	`seat` text NOT NULL,
	`hold` text NOT NULL,
	`user` text NOT NULL,
	`expires` integer,
	`booking` text
);
--> statement-breakpoint
CREATE INDEX `locks_show` ON `locks` (`show`);--> statement-breakpoint
CREATE INDEX `locks_hold` ON `locks` (`hold`);--> statement-breakpoint
CREATE TABLE `queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`show` text NOT NULL,
	`section` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	`offer` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `queue_show` ON `queue` (`show`,`created`);--> statement-breakpoint
CREATE INDEX `queue_user` ON `queue` (`user`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`movie` text NOT NULL,
	`created` integer NOT NULL
);
