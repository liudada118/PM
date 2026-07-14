ALTER TABLE `project_members` MODIFY COLUMN `role` enum('owner','member','tester') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `issues` ADD `originalAssigneeId` int;