import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#6366f1").notNull(),
  icon: varchar("icon", { length: 10 }).default("📁").notNull(),
  status: mysqlEnum("status", ["planning", "in_progress", "completed"]).default("planning").notNull(),
  deadline: timestamp("deadline"),
  parentId: int("parentId"), // null = top-level project, non-null = sub-project
  createdBy: int("createdBy").notNull(),
  progressNotes: text("progressNotes"), // Markdown-based progress notes with image support
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Members ────────────────────────────────────────────────────────────
export const projectMembers = mysqlTable("project_members", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "member", "tester"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// ─── Wiki Documents ───────────────────────────────────────────────────────────
export const wikiDocs = mysqlTable("wiki_docs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  category: varchar("category", { length: 100 }),
  templateType: mysqlEnum("templateType", ["none", "prd", "meeting", "flow", "competitive", "release", "tech_design"]).default("none").notNull(),
  authorId: int("authorId").notNull(),
  projectId: int("projectId"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WikiDoc = typeof wikiDocs.$inferSelect;
export type InsertWikiDoc = typeof wikiDocs.$inferInsert;

// ─── Issues ───────────────────────────────────────────────────────────────────
export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["bug", "feature", "task"]).default("task").notNull(),
  status: mysqlEnum("status", ["Backlog", "Todo", "In Progress", "In Review", "Done"]).default("Backlog").notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  label: varchar("label", { length: 100 }),
  assigneeId: int("assigneeId"),
  originalAssigneeId: int("originalAssigneeId"),
  authorId: int("authorId").notNull(),
  projectId: int("projectId"),
  dueDate: timestamp("dueDate"),
  reminderMinutes: text("reminderMinutes"), // JSON array e.g. "[60,1440]" - minutes before dueDate to remind
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = typeof issues.$inferInsert;

// ─── Cycles (Sprints) ─────────────────────────────────────────────────────────
export const cycles = mysqlTable("cycles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: mysqlEnum("status", ["planned", "active", "completed"]).default("planned").notNull(),
  createdBy: int("createdBy").notNull(),
  projectId: int("projectId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cycle = typeof cycles.$inferSelect;
export type InsertCycle = typeof cycles.$inferInsert;

// ─── Cycle <-> Issue ──────────────────────────────────────────────────────────
export const cycleIssues = mysqlTable("cycle_issues", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  issueId: int("issueId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CycleIssue = typeof cycleIssues.$inferSelect;

// ─── User Feedback ────────────────────────────────────────────────────────────
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  summary: varchar("summary", { length: 255 }).notNull(),
  description: text("description"),
  source: mysqlEnum("source", ["internal", "email", "slack", "other"]).default("internal").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).default("neutral").notNull(),
  status: mysqlEnum("status", ["New", "Reviewed", "Actioned", "Archived"]).default("New").notNull(),
  submittedBy: int("submittedBy"),
  submitterName: varchar("submitterName", { length: 100 }),
  projectId: int("projectId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

// ─── Feature Requests ─────────────────────────────────────────────────────────
export const featureRequests = mysqlTable("feature_requests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productArea: varchar("productArea", { length: 100 }),
  status: mysqlEnum("status", ["Considering", "Planned", "In Progress", "Shipped"]).default("Considering").notNull(),
  priorityScore: float("priorityScore").default(0),
  feedbackCount: int("feedbackCount").default(0).notNull(),
  linkedIssueId: int("linkedIssueId"),
  createdBy: int("createdBy").notNull(),
  projectId: int("projectId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type InsertFeatureRequest = typeof featureRequests.$inferInsert;

// ─── Feedback <-> FeatureRequest ──────────────────────────────────────────────
export const feedbackFeatureLinks = mysqlTable("feedback_feature_links", {
  id: int("id").autoincrement().primaryKey(),
  feedbackId: int("feedbackId").notNull(),
  featureRequestId: int("featureRequestId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
});

// ─── Issue <-> WikiDoc ────────────────────────────────────────────────────────
export const issueDocLinks = mysqlTable("issue_doc_links", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull(),
  docId: int("docId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
});

// ─── Issue <-> FeatureRequest ─────────────────────────────────────────────────
export const issueFeatureLinks = mysqlTable("issue_feature_links", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull(),
  featureRequestId: int("featureRequestId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
});

// ─── Feishu Webhooks ──────────────────────────────────────────────────────────
export const feishuWebhooks = mysqlTable("feishu_webhooks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  userId: int("userId"),
  webhookUrl: text("webhookUrl").notNull(),
  name: varchar("name", { length: 255 }),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Attachments (文件附件) ──────────────────────────────────────────────────
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId"),
  projectId: int("projectId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Architecture Docs (架构文档) ─────────────────────────────────────────────
export const architectureDocs = mysqlTable("architecture_docs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  projectId: int("projectId"),
  viewMode: mysqlEnum("viewMode", ["mindmap", "hybrid"]).default("mindmap").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArchitectureDoc = typeof architectureDocs.$inferSelect;
export type InsertArchitectureDoc = typeof architectureDocs.$inferInsert;

// ─── Issue <-> Architecture Node ─────────────────────────────────────────────
export const issueArchitectureLinks = mysqlTable("issue_architecture_links", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull(),
  archDocId: int("archDocId").notNull(),
  nodePath: varchar("nodePath", { length: 500 }).notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
});

export type IssueArchitectureLink = typeof issueArchitectureLinks.$inferSelect;

// ─── Issue Notification Subscribers ─────────────────────────────────────────
export const issueNotificationSubscribers = mysqlTable("issue_notification_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  issueId: int("issueId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IssueNotificationSubscriber = typeof issueNotificationSubscribers.$inferSelect;

// ─── Scheduled Tasks (cron job registry) ────────────────────────────────────
export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  taskUid: varchar("taskUid", { length: 65 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cronExpression", { length: 50 }),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;

// ─── Node Flowcharts (Mermaid flowchart embedded in mind map nodes) ──────────
export const nodeFlowcharts = mysqlTable("node_flowcharts", {
  id: int("id").autoincrement().primaryKey(),
  archDocId: int("archDocId").notNull(),
  nodePath: varchar("nodePath", { length: 500 }).notNull(), // mind map node text
  mermaidContent: text("mermaidContent").notNull(), // Mermaid flowchart source
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NodeFlowchart = typeof nodeFlowcharts.$inferSelect;
export type InsertNodeFlowchart = typeof nodeFlowcharts.$inferInsert;

// ─── Architecture Versions (version history) ────────────────────────────────
export const architectureVersions = mysqlTable("architecture_versions", {
  id: int("id").autoincrement().primaryKey(),
  archDocId: int("archDocId").notNull(),
  version: int("version").notNull(), // auto-increment per doc
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // full Markdown snapshot
  description: varchar("description", { length: 500 }), // optional commit message
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArchitectureVersion = typeof architectureVersions.$inferSelect;
export type InsertArchitectureVersion = typeof architectureVersions.$inferInsert;
