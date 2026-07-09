CREATE TABLE `issue_notification_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_notification_subscribers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`description` text,
	`cronExpression` varchar(50),
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `issues` ADD `reminderMinutes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `parentId` int;