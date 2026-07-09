CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int,
	`projectId` int,
	`fileName` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feishu_webhooks` MODIFY COLUMN `projectId` int;--> statement-breakpoint
ALTER TABLE `feishu_webhooks` ADD `userId` int;