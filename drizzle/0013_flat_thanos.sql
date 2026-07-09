CREATE TABLE `architecture_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archDocId` int NOT NULL,
	`version` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`description` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `architecture_versions_id` PRIMARY KEY(`id`)
);
