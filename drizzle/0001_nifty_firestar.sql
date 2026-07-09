CREATE TABLE `cycle_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`issueId` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cycle_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('planned','active','completed') NOT NULL DEFAULT 'planned',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`productArea` varchar(100),
	`status` enum('Considering','Planned','In Progress','Shipped') NOT NULL DEFAULT 'Considering',
	`priorityScore` float DEFAULT 0,
	`feedbackCount` int NOT NULL DEFAULT 0,
	`linkedIssueId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summary` varchar(255) NOT NULL,
	`description` text,
	`source` enum('internal','email','slack','other') NOT NULL DEFAULT 'internal',
	`sentiment` enum('positive','neutral','negative') NOT NULL DEFAULT 'neutral',
	`status` enum('New','Reviewed','Actioned','Archived') NOT NULL DEFAULT 'New',
	`submittedBy` int,
	`submitterName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_feature_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedbackId` int NOT NULL,
	`featureRequestId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_feature_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_doc_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`docId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_doc_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_feature_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`featureRequestId` int NOT NULL,
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_feature_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('Backlog','Todo','In Progress','In Review','Done') NOT NULL DEFAULT 'Backlog',
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`label` varchar(100),
	`assigneeId` int,
	`authorId` int NOT NULL,
	`dueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`category` varchar(100),
	`templateType` enum('none','prd','meeting') NOT NULL DEFAULT 'none',
	`authorId` int NOT NULL,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wiki_docs_id` PRIMARY KEY(`id`)
);
