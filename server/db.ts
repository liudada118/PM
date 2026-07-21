import { and, between, desc, eq, gte, inArray, isNull, isNotNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  architectureDocs,
  attachments,
  cycleIssues,
  cycles,
  featureRequests,
  feishuWebhooks,
  feedback,
  feedbackFeatureLinks,
  issueArchitectureLinks,
  issueDocLinks,
  issueFeatureLinks,
  issueNotificationSubscribers,
  issues,
  nodeFlowcharts,
  projectMembers,
  projects,
  scheduledTasks,
  users,
  wikiDocs,
  architectureVersions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    lastSignedIn: users.lastSignedIn,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function getProjects(includeArchived = false, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (userId) {
    // Get project IDs where user is a member (via project_members table)
    const memberProjects = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    const memberProjectIds = memberProjects.map(r => r.projectId);
    
    if (memberProjectIds.length === 0) return [];
    
    const visibilityCondition = inArray(projects.id, memberProjectIds);
    const conditions = includeArchived
      ? visibilityCondition
      : and(eq(projects.isArchived, false), visibilityCondition);
    
    return db.select().from(projects).where(conditions).orderBy(desc(projects.createdAt));
  }
  
  const conditions = includeArchived ? undefined : eq(projects.isArchived, false);
  return db.select().from(projects).where(conditions).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  deadline?: Date | null;
  parentId?: number | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(projects).values({
    name: data.name,
    description: data.description ?? null,
    color: data.color ?? "#6366f1",
    icon: data.icon ?? "📁",
    deadline: data.deadline ?? null,
    parentId: data.parentId ?? null,
    createdBy: data.createdBy,
  });
  return result[0];
}
export async function updateProject(
  id: number,
  data: { name?: string; description?: string; color?: string; icon?: string; status?: "planning" | "in_progress" | "completed"; deadline?: Date | null; isArchived?: boolean; parentId?: number | null; progressNotes?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projects).set({ isArchived: true }).where(eq(projects.id, id));
}

// ─── Wiki Docs ────────────────────────────────────────────────────────────────
export async function getWikiDocs(archived = false, projectId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  conditions.push(eq(wikiDocs.isArchived, archived));
  if (projectId !== undefined && projectId !== null) {
    conditions.push(eq(wikiDocs.projectId, projectId));
  }
  return db
    .select()
    .from(wikiDocs)
    .where(and(...conditions))
    .orderBy(desc(wikiDocs.updatedAt));
}

export async function getWikiDocById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wikiDocs).where(eq(wikiDocs.id, id)).limit(1);
  return result[0];
}

export async function createWikiDoc(data: {
  title: string;
  content?: string;
  category?: string;
  templateType?: "none" | "prd" | "meeting" | "flow" | "competitive" | "release" | "tech_design";
  authorId: number;
  projectId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(wikiDocs).values({
    title: data.title,
    content: data.content ?? "",
    category: data.category ?? null,
    templateType: data.templateType ?? "none",
    authorId: data.authorId,
    projectId: data.projectId ?? null,
  });
  return result[0];
}

export async function updateWikiDoc(
  id: number,
  data: { title?: string; content?: string; category?: string; isArchived?: boolean; projectId?: number | null }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(wikiDocs).set(data).where(eq(wikiDocs.id, id));
}

export async function deleteWikiDoc(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(wikiDocs).where(eq(wikiDocs.id, id));
}

// ─── Issues ───────────────────────────────────────────────────────────────────
export async function getIssues(filters?: {
  status?: string;
  type?: "bug" | "feature" | "task";
  assigneeId?: number;
  myTodoUserId?: number;
  projectId?: number | null;
  excludeDone?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(issues.status, filters.status as any));
  if (filters?.type) conditions.push(eq(issues.type, filters.type));
  if (filters?.assigneeId) conditions.push(eq(issues.assigneeId, filters.assigneeId));
  if (filters?.myTodoUserId) {
    conditions.push(
      or(
        eq(issues.assigneeId, filters.myTodoUserId),
        eq(issues.authorId, filters.myTodoUserId),
        and(eq(issues.originalAssigneeId, filters.myTodoUserId), eq(issues.status, "In Review" as any))
      )
    );
  }
  if (filters?.projectId !== undefined && filters?.projectId !== null) {
    conditions.push(eq(issues.projectId, filters.projectId));
  }
  if (filters?.excludeDone) conditions.push(sql`${issues.status} != 'Done'`);
  const rows = await db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
      type: issues.type,
      status: issues.status,
      priority: issues.priority,
      label: issues.label,
      assigneeId: issues.assigneeId,
      originalAssigneeId: issues.originalAssigneeId,
      authorId: issues.authorId,
      projectId: issues.projectId,
      dueDate: issues.dueDate,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(issues)
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      sql`FIELD(${issues.priority}, 'urgent', 'high', 'medium', 'low')`,
      desc(issues.updatedAt)
    );
  return rows;
}

export async function getIssueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(issues).where(eq(issues.id, id)).limit(1);
  return result[0];
}

export async function createIssue(data: {
  title: string;
  description?: string;
  type?: "bug" | "feature" | "task";
  status?: "Backlog" | "Todo" | "In Progress" | "In Review" | "Done";
  priority?: "urgent" | "high" | "medium" | "low";
  label?: string;
  assigneeId?: number;
  originalAssigneeId?: number | null;
  authorId: number;
  projectId?: number | null;
  dueDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(issues).values({
    title: data.title,
    description: data.description ?? null,
    type: data.type ?? "task",
    status: data.status ?? "Backlog",
    priority: data.priority ?? "medium",
    label: data.label ?? null,
    assigneeId: data.assigneeId ?? null,
    originalAssigneeId: data.originalAssigneeId ?? null,
    authorId: data.authorId,
    projectId: data.projectId ?? null,
    dueDate: data.dueDate ?? null,
  });
  return result[0];
}

export async function updateIssue(
  id: number,
  data: {
    title?: string;
    description?: string;
    type?: "bug" | "feature" | "task";
    status?: "Backlog" | "Todo" | "In Progress" | "In Review" | "Done";
    priority?: "urgent" | "high" | "medium" | "low";
    label?: string;
    assigneeId?: number | null;
    originalAssigneeId?: number | null;
    projectId?: number | null;
    dueDate?: Date | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(issues).set(data).where(eq(issues.id, id));
}

export async function deleteIssue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(issues).where(eq(issues.id, id));
}

// ─── Cycles ───────────────────────────────────────────────────────────────────
export async function getCycles(projectId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (projectId !== undefined && projectId !== null) {
    conditions.push(eq(cycles.projectId, projectId));
  }
  return db
    .select()
    .from(cycles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cycles.startDate));
}

export async function getCycleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cycles).where(eq(cycles.id, id)).limit(1);
  return result[0];
}

export async function createCycle(data: {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdBy: number;
  projectId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cycles).values({
    name: data.name,
    description: data.description ?? null,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy: data.createdBy,
    projectId: data.projectId ?? null,
    status: "planned",
  });
  return result[0];
}

export async function updateCycleStatus(id: number, status: "planned" | "active" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cycles).set({ status }).where(eq(cycles.id, id));
}

export async function getCycleIssues(cycleId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(cycleIssues).where(eq(cycleIssues.cycleId, cycleId));
  if (links.length === 0) return [];
  const issueIds = links.map((l) => l.issueId);
  const result = [];
  for (const id of issueIds) {
    const issue = await getIssueById(id);
    if (issue) result.push(issue);
  }
  return result;
}

export async function addIssueToCycle(cycleId: number, issueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(cycleIssues)
    .where(and(eq(cycleIssues.cycleId, cycleId), eq(cycleIssues.issueId, issueId)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(cycleIssues).values({ cycleId, issueId });
}

export async function removeIssueFromCycle(cycleId: number, issueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(cycleIssues)
    .where(and(eq(cycleIssues.cycleId, cycleId), eq(cycleIssues.issueId, issueId)));
}

export async function getCycleStats(cycleId: number) {
  const cycleIssueList = await getCycleIssues(cycleId);
  const total = cycleIssueList.length;
  const done = cycleIssueList.filter((i) => i.status === "Done").length;
  const inProgress = cycleIssueList.filter((i) => i.status === "In Progress").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, inProgress, completionRate, issues: cycleIssueList };
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export async function getFeedback(status?: string, projectId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (status) conditions.push(eq(feedback.status, status as any));
  if (projectId !== undefined && projectId !== null) {
    conditions.push(eq(feedback.projectId, projectId));
  }
  return db
    .select()
    .from(feedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(feedback.createdAt));
}

export async function createFeedback(data: {
  summary: string;
  description?: string;
  source?: "internal" | "email" | "slack" | "other";
  sentiment?: "positive" | "neutral" | "negative";
  submittedBy?: number;
  submitterName?: string;
  projectId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(feedback).values({
    summary: data.summary,
    description: data.description ?? null,
    source: data.source ?? "internal",
    sentiment: data.sentiment ?? "neutral",
    submittedBy: data.submittedBy ?? null,
    submitterName: data.submitterName ?? null,
    projectId: data.projectId ?? null,
  });
  return result[0];
}

export async function updateFeedbackStatus(
  id: number,
  status: "New" | "Reviewed" | "Actioned" | "Archived"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
}

// ─── Feature Requests ─────────────────────────────────────────────────────────
export async function getFeatureRequests(projectId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (projectId !== undefined && projectId !== null) {
    conditions.push(eq(featureRequests.projectId, projectId));
  }
  return db
    .select()
    .from(featureRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(featureRequests.feedbackCount));
}

export async function createFeatureRequest(data: {
  name: string;
  description?: string;
  productArea?: string;
  createdBy: number;
  projectId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(featureRequests).values({
    name: data.name,
    description: data.description ?? null,
    productArea: data.productArea ?? null,
    createdBy: data.createdBy,
    projectId: data.projectId ?? null,
  });
  return result[0];
}

export async function updateFeatureRequest(
  id: number,
  data: {
    name?: string;
    description?: string;
    productArea?: string;
    status?: "Considering" | "Planned" | "In Progress" | "Shipped";
    priorityScore?: number;
    linkedIssueId?: number | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(featureRequests).set(data).where(eq(featureRequests.id, id));
}

export async function linkFeedbackToFeature(feedbackId: number, featureRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(feedbackFeatureLinks)
    .where(
      and(
        eq(feedbackFeatureLinks.feedbackId, feedbackId),
        eq(feedbackFeatureLinks.featureRequestId, featureRequestId)
      )
    )
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(feedbackFeatureLinks).values({ feedbackId, featureRequestId });
  await db
    .update(featureRequests)
    .set({ feedbackCount: sql`feedbackCount + 1` })
    .where(eq(featureRequests.id, featureRequestId));
}

// ─── Linkage: Issue <-> Doc / Feature ─────────────────────────────────────────
export async function linkIssueToDoc(issueId: number, docId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(issueDocLinks)
    .where(and(eq(issueDocLinks.issueId, issueId), eq(issueDocLinks.docId, docId)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(issueDocLinks).values({ issueId, docId });
}

export async function getDocLinksForIssue(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: issueDocLinks.id,
      issueId: issueDocLinks.issueId,
      docId: issueDocLinks.docId,
      docTitle: wikiDocs.title,
      docCategory: wikiDocs.category,
    })
    .from(issueDocLinks)
    .leftJoin(wikiDocs, eq(issueDocLinks.docId, wikiDocs.id))
    .where(eq(issueDocLinks.issueId, issueId));
}

export async function linkIssueToFeature(issueId: number, featureRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(issueFeatureLinks)
    .where(
      and(
        eq(issueFeatureLinks.issueId, issueId),
        eq(issueFeatureLinks.featureRequestId, featureRequestId)
      )
    )
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(issueFeatureLinks).values({ issueId, featureRequestId });
}

export async function getFeatureLinksForIssue(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: issueFeatureLinks.id,
      issueId: issueFeatureLinks.issueId,
      featureRequestId: issueFeatureLinks.featureRequestId,
      featureTitle: featureRequests.name,
      featureStatus: featureRequests.status,
      featurePriority: featureRequests.priorityScore,
    })
    .from(issueFeatureLinks)
    .leftJoin(featureRequests, eq(issueFeatureLinks.featureRequestId, featureRequests.id))
    .where(eq(issueFeatureLinks.issueId, issueId));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getProjectsWithProgress(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  let conditions: any = eq(projects.isArchived, false);
  if (userId) {
    // Use project_members table for visibility
    const memberProjects = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    const memberProjectIds = memberProjects.map(r => r.projectId);
    if (memberProjectIds.length === 0) return [];
    conditions = and(eq(projects.isArchived, false), inArray(projects.id, memberProjectIds));
  }
  const allProjects = await db.select().from(projects).where(conditions).orderBy(desc(projects.createdAt));
  const result = [];
  for (const proj of allProjects) {
    const total = await db.select({ count: sql<number>`count(*)` }).from(issues).where(eq(issues.projectId, proj.id));
    const done = await db.select({ count: sql<number>`count(*)` }).from(issues).where(and(eq(issues.projectId, proj.id), eq(issues.status, "Done" as any)));
    const totalCount = Number(total[0]?.count ?? 0);
    const doneCount = Number(done[0]?.count ?? 0);
    // Get creator name
    const creator = await db.select({ name: users.name }).from(users).where(eq(users.id, proj.createdBy)).limit(1);
    result.push({
      ...proj,
      totalIssues: totalCount,
      doneIssues: doneCount,
      completionRate: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
      creatorName: creator[0]?.name ?? "未知",
    });
  }
  return result;
}

export async function getDashboardStats(projectId?: number | null, memberProjectIds?: number[]) {
  const db = await getDb();
  if (!db) return null;

  // Build project scope filter: specific project OR user's member projects
  const buildProjectScope = (projectIdCol: any) => {
    if (projectId !== undefined && projectId !== null) {
      return eq(projectIdCol, projectId);
    }
    if (memberProjectIds !== undefined) {
      // If user has no member projects, return impossible condition to get empty results
      if (memberProjectIds.length === 0) {
        return sql`1 = 0`;
      }
      return inArray(projectIdCol, memberProjectIds);
    }
    return undefined;
  };

  const cycleConditions = [];
  const cycleScope = buildProjectScope(cycles.projectId);
  if (cycleScope) cycleConditions.push(cycleScope);
  const allCycles = await db
    .select()
    .from(cycles)
    .where(cycleConditions.length > 0 ? and(...cycleConditions) : undefined)
    .orderBy(desc(cycles.startDate))
    .limit(1);
  const activeCycle = allCycles[0] ?? null;

  const fbConditions: any[] = [eq(feedback.status, "New" as any)];
  const fbScope = buildProjectScope(feedback.projectId);
  if (fbScope) fbConditions.push(fbScope);
  const pendingFeedback = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(and(...fbConditions));

  const docConditions: any[] = [eq(wikiDocs.isArchived, false)];
  const docScope = buildProjectScope(wikiDocs.projectId);
  if (docScope) docConditions.push(docScope);
  const recentDocs = await db
    .select()
    .from(wikiDocs)
    .where(and(...docConditions))
    .orderBy(desc(wikiDocs.updatedAt))
    .limit(5);

  const issueConditions = [];
  const issueScope = buildProjectScope(issues.projectId);
  if (issueScope) issueConditions.push(issueScope);
  const totalIssues = await db
    .select({ count: sql<number>`count(*)` })
    .from(issues)
    .where(issueConditions.length > 0 ? and(...issueConditions) : undefined);

  const doneConditions: any[] = [eq(issues.status, "Done" as any)];
  if (issueScope) doneConditions.push(issueScope);
  const doneIssues = await db
    .select({ count: sql<number>`count(*)` })
    .from(issues)
    .where(and(...doneConditions));

  let cycleStats = null;
  if (activeCycle) {
    cycleStats = await getCycleStats(activeCycle.id);
  }

  return {
    activeCycle,
    cycleStats,
    pendingFeedbackCount: Number(pendingFeedback[0]?.count ?? 0),
    recentDocs,
    totalIssues: Number(totalIssues[0]?.count ?? 0),
    doneIssues: Number(doneIssues[0]?.count ?? 0),
  };
}


// ─── Project Members ──────────────────────────────────────────────────────────
export async function getProjectMembers(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const members = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(projectMembers.joinedAt);
  return members;
}

export type ProjectMemberRole = "owner" | "member" | "tester";

export async function getProjectTesters(projectId: number) {
  const members = await getProjectMembers(projectId);
  return members.filter((member) => member.role === "tester");
}

export async function addProjectMember(projectId: number, userId: number, role: ProjectMemberRole = "member") {
  const db = await getDb();
  if (!db) return null;
  // Check if already a member
  const existing = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(projectMembers).values({ projectId, userId, role });
  return { id: result[0].insertId, projectId, userId, role };
}

export async function updateProjectMemberRole(projectId: number, userId: number, role: Exclude<ProjectMemberRole, "owner">) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(projectMembers)
    .set({ role })
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  return true;
}

export async function removeProjectMember(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  return true;
}

export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check direct membership
  const result = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  if (result.length > 0) return true;
  // Check parent project membership (two-level inheritance)
  const project = await db.select({ parentId: projects.parentId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project[0]?.parentId) {
    const parentResult = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, project[0].parentId), eq(projectMembers.userId, userId)))
      .limit(1);
    return parentResult.length > 0;
  }
  return false;
}

// Get all project IDs a user is a member of (includes child projects of parent memberships)
export async function getUserMemberProjectIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  // Direct memberships
  const rows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const directIds = rows.map(r => r.projectId);
  if (directIds.length === 0) return [];
  // Also include child projects of directly joined parent projects
  const childProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.parentId, directIds));
  const childIds = childProjects.map(c => c.id);
  return Array.from(new Set([...directIds, ...childIds]));
}

// Get child projects of a parent project
export async function getChildProjects(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(and(eq(projects.parentId, parentId), eq(projects.isArchived, false))).orderBy(desc(projects.createdAt));
}

// ─── Feishu Webhooks ──────────────────────────────────────────────────────────
export async function getUserFeishuWebhook(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(feishuWebhooks).where(eq(feishuWebhooks.userId, userId));
  return rows[0] ?? null;
}

export async function setUserFeishuWebhook(userId: number, webhookUrl: string, name: string | null) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getUserFeishuWebhook(userId);
  if (existing) {
    await db.update(feishuWebhooks).set({ webhookUrl, name, enabled: true }).where(eq(feishuWebhooks.id, existing.id));
    return { id: existing.id };
  } else {
    const [result] = await db.insert(feishuWebhooks).values({ userId, webhookUrl, name, enabled: true, createdBy: userId });
    return { id: (result as any).insertId };
  }
}

export async function updateUserFeishuWebhook(userId: number, data: { webhookUrl?: string; name?: string | null; enabled?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.update(feishuWebhooks).set(data).where(eq(feishuWebhooks.userId, userId));
}

export async function deleteUserFeishuWebhook(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(feishuWebhooks).where(eq(feishuWebhooks.userId, userId));
}

// 发送飞书个人推送（只推送给被指派人）
export async function sendFeishuNotificationToUser(targetUserId: number, message: { title: string; content: string }) {
  const webhook = await getUserFeishuWebhook(targetUserId);
  if (!webhook || !webhook.enabled) return;

  const payload = {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: message.title },
        template: "blue",
      },
      elements: [
        {
          tag: "markdown",
          content: message.content,
        },
      ],
    },
  };

  try {
    await fetch(webhook.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(`[Feishu] Failed to send notification to user ${targetUserId}:`, e);
  }
}

// ─── Attachments (文件附件) ──────────────────────────────────────────────────
export async function createAttachment(data: {
  issueId?: number | null;
  projectId?: number | null;
  fileName: string;
  fileKey: string;
  url: string;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(attachments).values(data as any);
  return { id: (result as any).insertId };
}

export async function getAttachmentsByIssue(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments).where(eq(attachments.issueId, issueId)).orderBy(desc(attachments.createdAt));
}

export async function getAttachmentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments).where(eq(attachments.projectId, projectId)).orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attachments).where(eq(attachments.id, id));
}

export async function getAttachmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(attachments).where(eq(attachments.id, id));
  return rows[0] ?? null;
}

// ─── Architecture Docs ───────────────────────────────────────────────────────
export async function getArchitectureDocs(projectId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (projectId !== undefined && projectId !== null) {
    conditions.push(eq(architectureDocs.projectId, projectId));
  }
  return db
    .select()
    .from(architectureDocs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(architectureDocs.updatedAt));
}

export async function getArchitectureDocsOverview() {
  const db = await getDb();
  if (!db) return [];
  // Get all docs with project name joined
  const docs = await db
    .select({
      id: architectureDocs.id,
      title: architectureDocs.title,
      content: architectureDocs.content,
      projectId: architectureDocs.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      projectIcon: projects.icon,
      createdBy: architectureDocs.createdBy,
      createdAt: architectureDocs.createdAt,
      updatedAt: architectureDocs.updatedAt,
    })
    .from(architectureDocs)
    .leftJoin(projects, eq(architectureDocs.projectId, projects.id))
    .orderBy(desc(architectureDocs.updatedAt));

  // Get linked task counts per doc
  const linkCounts = await db
    .select({
      archDocId: issueArchitectureLinks.archDocId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(issueArchitectureLinks)
    .groupBy(issueArchitectureLinks.archDocId);

  const linkMap = new Map(linkCounts.map((l) => [l.archDocId, l.count]));

  return docs.map((doc) => ({
    ...doc,
    linkedTaskCount: linkMap.get(doc.id) ?? 0,
  }));
}

export async function getArchitectureDocById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(architectureDocs).where(eq(architectureDocs.id, id)).limit(1);
  return result[0];
}

export async function createArchitectureDoc(data: {
  title: string;
  content?: string;
  projectId?: number | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(architectureDocs).values({
    title: data.title,
    content: data.content ?? "",
    projectId: data.projectId ?? null,
    createdBy: data.createdBy,
  });
  const insertId = (result[0] as any).insertId;
  return { id: insertId };
}

export async function updateArchitectureDoc(
  id: number,
  data: { title?: string; content?: string; projectId?: number | null }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(architectureDocs).set(data).where(eq(architectureDocs.id, id));
}

export async function deleteArchitectureDoc(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(architectureDocs).where(eq(architectureDocs.id, id));
  // Also delete all links
  await db.delete(issueArchitectureLinks).where(eq(issueArchitectureLinks.archDocId, id));
}

// ─── Issue <-> Architecture Links ────────────────────────────────────────────
export async function linkIssueToArchNode(issueId: number, archDocId: number, nodePath: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(issueArchitectureLinks)
    .where(
      and(
        eq(issueArchitectureLinks.issueId, issueId),
        eq(issueArchitectureLinks.archDocId, archDocId),
        eq(issueArchitectureLinks.nodePath, nodePath)
      )
    )
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(issueArchitectureLinks).values({ issueId, archDocId, nodePath });
}

export async function unlinkIssueFromArchNode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(issueArchitectureLinks).where(eq(issueArchitectureLinks.id, id));
}

export async function getArchLinksForIssue(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: issueArchitectureLinks.id,
      issueId: issueArchitectureLinks.issueId,
      archDocId: issueArchitectureLinks.archDocId,
      nodePath: issueArchitectureLinks.nodePath,
      archDocTitle: architectureDocs.title,
    })
    .from(issueArchitectureLinks)
    .leftJoin(architectureDocs, eq(issueArchitectureLinks.archDocId, architectureDocs.id))
    .where(eq(issueArchitectureLinks.issueId, issueId));
}

export async function getIssuesForArchNode(archDocId: number, nodePath?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(issueArchitectureLinks.archDocId, archDocId)];
  if (nodePath) {
    conditions.push(eq(issueArchitectureLinks.nodePath, nodePath));
  }
  return db
    .select({
      id: issueArchitectureLinks.id,
      issueId: issueArchitectureLinks.issueId,
      nodePath: issueArchitectureLinks.nodePath,
      issueTitle: issues.title,
      issueStatus: issues.status,
      issueType: issues.type,
      issuePriority: issues.priority,
    })
    .from(issueArchitectureLinks)
    .leftJoin(issues, eq(issueArchitectureLinks.issueId, issues.id))
    .where(and(...conditions));
}

// ─── Node Flowcharts ────────────────────────────────────────────────────────

export async function getNodeFlowchart(archDocId: number, nodePath: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(nodeFlowcharts)
    .where(and(eq(nodeFlowcharts.archDocId, archDocId), eq(nodeFlowcharts.nodePath, nodePath)))
    .limit(1);
  return result[0] || null;
}

export async function listNodeFlowcharts(archDocId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: nodeFlowcharts.id, nodePath: nodeFlowcharts.nodePath, updatedAt: nodeFlowcharts.updatedAt })
    .from(nodeFlowcharts)
    .where(eq(nodeFlowcharts.archDocId, archDocId));
}

export async function saveNodeFlowchart(archDocId: number, nodePath: string, mermaidContent: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Upsert: check if exists
  const existing = await db
    .select({ id: nodeFlowcharts.id })
    .from(nodeFlowcharts)
    .where(and(eq(nodeFlowcharts.archDocId, archDocId), eq(nodeFlowcharts.nodePath, nodePath)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(nodeFlowcharts)
      .set({ mermaidContent })
      .where(eq(nodeFlowcharts.id, existing[0].id));
    return { id: existing[0].id, updated: true };
  } else {
    const result = await db.insert(nodeFlowcharts).values({ archDocId, nodePath, mermaidContent });
    return { id: result[0].insertId, updated: false };
  }
}

export async function deleteNodeFlowchart(archDocId: number, nodePath: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(nodeFlowcharts)
    .where(and(eq(nodeFlowcharts.archDocId, archDocId), eq(nodeFlowcharts.nodePath, nodePath)));
  return { success: true };
}

// ─── Architecture Versions ──────────────────────────────────────────────────

export async function createArchitectureVersion(
  archDocId: number,
  title: string,
  content: string | null,
  createdBy: number,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Get next version number
  const [latest] = await db
    .select({ maxVer: sql<number>`COALESCE(MAX(${architectureVersions.version}), 0)` })
    .from(architectureVersions)
    .where(eq(architectureVersions.archDocId, archDocId));
  const nextVersion = (latest?.maxVer ?? 0) + 1;
  const [result] = await db.insert(architectureVersions).values({
    archDocId,
    version: nextVersion,
    title,
    content,
    description: description || null,
    createdBy,
  }).$returningId();
  return { id: result.id, version: nextVersion };
}

export async function getArchitectureVersions(archDocId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: architectureVersions.id,
      version: architectureVersions.version,
      title: architectureVersions.title,
      description: architectureVersions.description,
      createdBy: architectureVersions.createdBy,
      createdAt: architectureVersions.createdAt,
      creatorName: users.name,
    })
    .from(architectureVersions)
    .leftJoin(users, eq(architectureVersions.createdBy, users.id))
    .where(eq(architectureVersions.archDocId, archDocId))
    .orderBy(desc(architectureVersions.version));
}

export async function getArchitectureVersionContent(versionId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(architectureVersions)
    .where(eq(architectureVersions.id, versionId));
  return result || null;
}

export async function restoreArchitectureVersion(archDocId: number, versionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [version] = await db
    .select()
    .from(architectureVersions)
    .where(eq(architectureVersions.id, versionId));
  if (!version) throw new Error("Version not found");
  // Update the doc with the version's content
  await db
    .update(architectureDocs)
    .set({ title: version.title, content: version.content })
    .where(eq(architectureDocs.id, archDocId));
  return { success: true, title: version.title, content: version.content };
}

// ─── Issue Notification Subscribers ──────────────────────────────────────────
export async function getIssueSubscribers(issueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: issueNotificationSubscribers.id,
      issueId: issueNotificationSubscribers.issueId,
      userId: issueNotificationSubscribers.userId,
      userName: users.name,
      userEmail: users.email,
      createdAt: issueNotificationSubscribers.createdAt,
    })
    .from(issueNotificationSubscribers)
    .leftJoin(users, eq(issueNotificationSubscribers.userId, users.id))
    .where(eq(issueNotificationSubscribers.issueId, issueId));
}

export async function addIssueSubscriber(issueId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if already subscribed
  const existing = await db
    .select({ id: issueNotificationSubscribers.id })
    .from(issueNotificationSubscribers)
    .where(and(eq(issueNotificationSubscribers.issueId, issueId), eq(issueNotificationSubscribers.userId, userId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(issueNotificationSubscribers).values({ issueId, userId });
  return { id: result[0].insertId, issueId, userId };
}

export async function removeIssueSubscriber(issueId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(issueNotificationSubscribers)
    .where(and(eq(issueNotificationSubscribers.issueId, issueId), eq(issueNotificationSubscribers.userId, userId)));
  return true;
}

// ─── Scheduled Tasks Registry ────────────────────────────────────────────────
export async function getScheduledTask(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scheduledTasks).where(eq(scheduledTasks.name, name)).limit(1);
  return result[0] ?? null;
}

export async function upsertScheduledTask(data: { name: string; taskUid: string; description?: string; cronExpression?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select({ id: scheduledTasks.id }).from(scheduledTasks).where(eq(scheduledTasks.name, data.name)).limit(1);
  if (existing.length > 0) {
    await db.update(scheduledTasks).set({ taskUid: data.taskUid, description: data.description, cronExpression: data.cronExpression }).where(eq(scheduledTasks.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(scheduledTasks).values({ name: data.name, taskUid: data.taskUid, description: data.description ?? null, cronExpression: data.cronExpression ?? null });
  return result[0].insertId;
}

// ─── Issues: completed today query ──────────────────────────────────────────
export async function getIssuesCompletedToday() {
  const db = await getDb();
  if (!db) return [];
  // Get issues whose status is Done and updatedAt is today (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);
  return db
    .select({
      id: issues.id,
      title: issues.title,
      projectId: issues.projectId,
      projectName: projects.name,
      assigneeId: issues.assigneeId,
      assigneeName: users.name,
      priority: issues.priority,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(users, eq(issues.assigneeId, users.id))
    .where(and(eq(issues.status, "Done"), between(issues.updatedAt, todayStart, todayEnd)));
}

// ─── Issues: due reminder query ─────────────────────────────────────────────
export async function getIssuesDueForReminder() {
  const db = await getDb();
  if (!db) return [];
  // Get all issues with dueDate set, not Done, and have reminderMinutes set
  return db
    .select({
      id: issues.id,
      title: issues.title,
      projectId: issues.projectId,
      assigneeId: issues.assigneeId,
      dueDate: issues.dueDate,
      reminderMinutes: issues.reminderMinutes,
      status: issues.status,
    })
    .from(issues)
    .where(and(
      isNotNull(issues.dueDate),
      isNotNull(issues.reminderMinutes),
      sql`${issues.status} != 'Done'`
    ));
}

// ─── Notify all subscribers of an issue ─────────────────────────────────────
export async function notifyIssueSubscribers(issueId: number, message: { title: string; content: string }) {
  const subscribers = await getIssueSubscribers(issueId);
  for (const sub of subscribers) {
    sendFeishuNotificationToUser(sub.userId, message).catch(() => {});
  }
}
