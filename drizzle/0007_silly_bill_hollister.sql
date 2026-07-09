CREATE TABLE `feishu_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`webhookUrl` text NOT NULL,
	`name` varchar(255),
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feishu_webhooks_id` PRIMARY KEY(`id`)
);
