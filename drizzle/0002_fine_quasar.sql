CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20) NOT NULL DEFAULT '#6366f1',
	`icon` varchar(10) NOT NULL DEFAULT '📁',
	`createdBy` int NOT NULL,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cycles` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `feature_requests` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `feedback` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `issues` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `wiki_docs` ADD `projectId` int;