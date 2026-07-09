CREATE TABLE `architecture_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`projectId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `architecture_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_architecture_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`archDocId` int NOT NULL,
	`nodePath` varchar(500) NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_architecture_links_id` PRIMARY KEY(`id`)
);
