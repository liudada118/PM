CREATE TABLE `node_flowcharts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archDocId` int NOT NULL,
	`nodePath` varchar(500) NOT NULL,
	`mermaidContent` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `node_flowcharts_id` PRIMARY KEY(`id`)
);
