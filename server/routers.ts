import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addIssueToCycle,
  createCycle,
  createFeedback,
  createFeatureRequest,
  createIssue,
  createProject,
  createWikiDoc,
  deleteIssue,
  deleteProject,
  deleteWikiDoc,
  getAllUsers,
  getCycleById,
  getCycleIssues,
  getCycles,
  getCycleStats,
  getDashboardStats,
  getDocLinksForIssue,
  getFeatureLinksForIssue,
  getFeatureRequests,
  getFeedback,
  getIssueById,
  getIssues,
  getProjectById,
  getProjects,
  getProjectsWithProgress,
  getWikiDocById,
  getWikiDocs,
  linkFeedbackToFeature,
  linkIssueToDoc,
  linkIssueToFeature,
  removeIssueFromCycle,
  updateCycleStatus,
  updateFeatureRequest,
  updateFeedbackStatus,
  updateIssue,
  updateProject,
  updateWikiDoc,
  getProjectMembers,
  getProjectTesters,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  isProjectMember,
  getUserMemberProjectIds,
  getUserFeishuWebhook,
  setUserFeishuWebhook,
  updateUserFeishuWebhook,
  deleteUserFeishuWebhook,
  sendFeishuNotificationToUser,
  createAttachment,
  getAttachmentsByIssue,
  getAttachmentsByProject,
  deleteAttachment,
  getAttachmentById,
  getArchitectureDocs,
  getArchitectureDocsOverview,
  getArchitectureDocById,
  createArchitectureDoc,
  updateArchitectureDoc,
  deleteArchitectureDoc,
  linkIssueToArchNode,
  unlinkIssueFromArchNode,
  getArchLinksForIssue,
  getIssuesForArchNode,
  getNodeFlowchart,
  listNodeFlowcharts,
  saveNodeFlowchart,
  deleteNodeFlowchart,
  getChildProjects,
  getIssueSubscribers,
  addIssueSubscriber,
  removeIssueSubscriber,
  notifyIssueSubscribers,
  getIssuesCompletedToday,
  getIssuesDueForReminder,
  createArchitectureVersion,
  getArchitectureVersions,
  getArchitectureVersionContent,
  restoreArchitectureVersion,
} from "./db";
import { storagePut, storageGetSignedUrl } from "./storage";
import { TRPCError } from "@trpc/server";

export const emailLoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    loginWithEmail: publicProcedure
      .input(emailLoginInputSchema)
      .mutation(async ({ input, ctx }) => {
        const user = await sdk.loginWithEmail(input.email);
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        return user;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    allUsers: protectedProcedure.query(() => getAllUsers()),
  }),

  // ─── Projects ─────────────────────────────────────────────────────────────
  projects: router({
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .query(({ input, ctx }) => getProjects(input?.includeArchived ?? false, ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await isProjectMember(input.id, ctx.user.id);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        return getProjectById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
          deadline: z.string().nullable().optional(),
          parentId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { deadline, parentId, ...rest } = input;
        // If creating a sub-project, verify user is member of parent
        if (parentId) {
          const isMember = await isProjectMember(parentId, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "你不是父项目的成员" });
        }
        const result = await createProject({ ...rest, deadline: deadline ? new Date(deadline) : null, parentId: parentId ?? null, createdBy: ctx.user.id });
        // Auto-add creator as owner member
        const insertId = (result as any)?.insertId;
        if (insertId) {
          await addProjectMember(insertId, ctx.user.id, "owner");
        }
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
          status: z.enum(["planning", "in_progress", "completed"]).optional(),
          deadline: z.string().nullable().optional(),
          isArchived: z.boolean().optional(),
          parentId: z.number().nullable().optional(),
          progressNotes: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const member = await isProjectMember(input.id, ctx.user.id);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        // Validate parentId if provided
        if (input.parentId !== undefined && input.parentId !== null) {
          // Cannot set self as parent
          if (input.parentId === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能将项目设为自己的父项目" });
          const parentMember = await isProjectMember(input.parentId, ctx.user.id);
          if (!parentMember) throw new TRPCError({ code: "FORBIDDEN", message: "你不是父项目的成员" });
        }
        const { id, deadline, parentId, ...data } = input;
        const updateData: any = { ...data };
        if (deadline !== undefined) {
          updateData.deadline = deadline ? new Date(deadline) : null;
        }
        if (parentId !== undefined) {
          updateData.parentId = parentId;
        }
        return updateProject(id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const members = await getProjectMembers(input.id);
        const currentMember = members.find(m => m.userId === ctx.user.id);
        if (!currentMember) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        if (currentMember.role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "只有项目创建者才能删除项目" });
        return deleteProject(input.id);
      }),

    // ─── Children (sub-projects) ────────────────────────────────────────────
    children: protectedProcedure
      .input(z.object({ parentId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await isProjectMember(input.parentId, ctx.user.id);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        return getChildProjects(input.parentId);
      }),

    // ─── Members ──────────────────────────────────────────────────────────────
    members: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const member = await isProjectMember(input.projectId, ctx.user.id);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        return getProjectMembers(input.projectId);
      }),

    addMember: protectedProcedure
      .input(z.object({ projectId: z.number(), userId: z.number(), role: z.enum(["member", "tester"]).optional() }))
      .mutation(async ({ input, ctx }) => {
        // Only project owner/member can add members
        const isMember = await isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return addProjectMember(input.projectId, input.userId, input.role ?? "member");
      }),

    updateMemberRole: protectedProcedure
      .input(z.object({ projectId: z.number(), userId: z.number(), role: z.enum(["member", "tester"]) }))
      .mutation(async ({ input, ctx }) => {
        const isMember = await isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a project member" });
        }
        const members = await getProjectMembers(input.projectId);
        const targetMember = members.find(m => m.userId === input.userId);
        if (!targetMember) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project member not found" });
        }
        if (targetMember.role === "owner") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change owner role" });
        }
        return updateProjectMemberRole(input.projectId, input.userId, input.role);
      }),

    removeMember: protectedProcedure
      .input(z.object({ projectId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Only project owner can remove members
        const isMember = await isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        // Cannot remove the owner
        const members = await getProjectMembers(input.projectId);
        const targetMember = members.find(m => m.userId === input.userId);
        if (targetMember?.role === "owner") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能移除项目创建者" });
        }
        return removeProjectMember(input.projectId, input.userId);
      }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ projectId: z.number().nullable().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
          return getDashboardStats(input.projectId);
        }
        // No specific project: scope to user's member projects only
        const memberProjectIds = await getUserMemberProjectIds(ctx.user.id);
        return getDashboardStats(undefined, memberProjectIds);
      }),
    projectsProgress: protectedProcedure.query(({ ctx }) => getProjectsWithProgress(ctx.user.id)),
  }),

  // ─── Wiki ──────────────────────────────────────────────────────────────────
  wiki: router({
    list: protectedProcedure
      .input(z.object({ archived: z.boolean().optional(), projectId: z.number().nullable().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getWikiDocs(input?.archived ?? false, input?.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const doc = await getWikiDocById(input.id);
        if (doc?.projectId) {
          const member = await isProjectMember(doc.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return doc;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().optional(),
          category: z.string().optional(),
          templateType: z.enum(["none", "prd", "meeting", "flow", "competitive", "release", "tech_design"]).optional(),
          projectId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return createWikiDoc({ ...input, authorId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          category: z.string().optional(),
          isArchived: z.boolean().optional(),
          projectId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const doc = await getWikiDocById(input.id);
        if (doc?.projectId) {
          const member = await isProjectMember(doc.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        const { id, ...data } = input;
        return updateWikiDoc(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const doc = await getWikiDocById(input.id);
        if (doc?.projectId) {
          const member = await isProjectMember(doc.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return deleteWikiDoc(input.id);
      }),

    getLinkedIssues: protectedProcedure
      .input(z.object({ docId: z.number() }))
      .query(async ({ input, ctx }) => {
        const memberProjectIds = await getUserMemberProjectIds(ctx.user.id);
        const allIssues = await getIssues();
        const visibleIssues = allIssues.filter(i => !i.projectId || memberProjectIds.includes(i.projectId));
        const links = await Promise.all(
          visibleIssues.map(async (issue) => {
            const docLinks = await getDocLinksForIssue(issue.id);
            return docLinks.some((l) => l.docId === input.docId) ? issue : null;
          })
        );
        return links.filter(Boolean);
      }),
  }),

  // ─── Issues ────────────────────────────────────────────────────────────────
  issues: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          type: z.enum(["bug", "feature", "task"]).optional(),
          assigneeId: z.number().optional(),
          projectId: z.number().nullable().optional(),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        // If projectId is a parent project, also include child project issues
        let allIssues;
        if (input?.projectId) {
          const children = await getChildProjects(input.projectId);
          if (children.length > 0) {
            // Parent project: get issues from parent + all children
            const projectIds = [input.projectId, ...children.map(c => c.id)];
            const issuesByProject = await Promise.all(
              projectIds.map(pid => getIssues({ ...input, projectId: pid }))
            );
            allIssues = issuesByProject.flat();
          } else {
            allIssues = await getIssues(input);
          }
        } else {
          allIssues = await getIssues(input);
        }
        // Filter: only show issues from projects user is a member of
        // Issues without projectId are private - only visible to their creator
        const memberProjectIds = await getUserMemberProjectIds(ctx.user.id);
        return allIssues.filter(i => {
          if (!i.projectId) return i.authorId === ctx.user.id;
          return memberProjectIds.includes(i.projectId);
        });
      }),

    myTodos: protectedProcedure.query(async ({ ctx }) => {
      const allTodos = await getIssues({ myTodoUserId: ctx.user.id, excludeDone: true });
      // Filter: only show todos from projects user is a member of
      // Issues without projectId are private - only visible to their creator
      const memberProjectIds = await getUserMemberProjectIds(ctx.user.id);
      return allTodos.filter(i => {
        if (!i.projectId) return i.authorId === ctx.user.id;
        return memberProjectIds.includes(i.projectId);
      });
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const issue = await getIssueById(input.id);
        if (!issue) return null;
        if (issue.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        } else if (issue.authorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权查看此任务" });
        }
        return issue;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          type: z.enum(["bug", "feature", "task"]).optional(),
          status: z.enum(["Backlog", "Todo", "In Progress", "In Review", "Done"]).optional(),
          priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
          label: z.string().optional(),
          assigneeId: z.number().optional(),
          projectId: z.number().nullable().optional(),
          dueDate: z.date().optional(),
          reminderMinutes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
          // 指派任务时自动将被指派人添加为项目成员
          if (input.assigneeId) {
            const assigneeMember = await isProjectMember(input.projectId, input.assigneeId);
            if (!assigneeMember) {
              await addProjectMember(input.projectId, input.assigneeId, "member");
            }
          }
        }
        const createData: any = { ...input, authorId: ctx.user.id };
        let reviewTesterIds: number[] = [];
        if (input.projectId && input.status === "In Review") {
          const testers = await getProjectTesters(input.projectId);
          if (testers.length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "项目暂无测试人员，无法进入审阅中" });
          }
          const primaryTester = testers[0];
          reviewTesterIds = testers.map((tester) => tester.userId);
          createData.originalAssigneeId = input.assigneeId ?? null;
          createData.assigneeId = primaryTester.userId;
        }
        const result = await createIssue(createData);
        if (input.projectId && reviewTesterIds.length > 0) {
          const project = await getProjectById(input.projectId);
          reviewTesterIds.forEach((testerId) => {
            sendFeishuNotificationToUser(testerId, {
              title: "任务进入审阅",
              content: `任务《${input.title}》已进入审阅中，请测试。\n\n项目：${project?.name ?? "未知项目"}\n提交人：${ctx.user.name ?? "用户"}`,
            }).catch(() => {});
          });
        }
        // 飞书推送：新任务指派通知
        if (input.projectId && createData.assigneeId && reviewTesterIds.length === 0) {
          const allUsers = await getAllUsers();
          const assignee = allUsers.find(u => u.id === createData.assigneeId);
          const project = await getProjectById(input.projectId);
          sendFeishuNotificationToUser(createData.assigneeId, {
            title: "📌 新任务指派",
            content: `**${ctx.user.name ?? "用户"}** 将任务指派给了你\n\n项目：${project?.name ?? "未知项目"}\n任务：${input.title}\n优先级：${input.priority ?? "medium"}`,
          }).catch(() => {}); // fire-and-forget
        }
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          type: z.enum(["bug", "feature", "task"]).optional(),
          status: z.enum(["Backlog", "Todo", "In Progress", "In Review", "Done"]).optional(),
          priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
          label: z.string().optional(),
          assigneeId: z.number().nullable().optional(),
          projectId: z.number().nullable().optional(),
          dueDate: z.date().nullable().optional(),
          reminderMinutes: z.array(z.number()).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.id);
        if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
        if (issue.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
          // 指派任务时自动将被指派人添加为项目成员
          if (input.assigneeId) {
            const assigneeMember = await isProjectMember(issue.projectId, input.assigneeId);
            if (!assigneeMember) {
              await addProjectMember(issue.projectId, input.assigneeId, "member");
            }
          }
        } else if (issue.authorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权修改此任务" });
        }
        const { id, reminderMinutes, ...data } = input;
        // Convert reminderMinutes array to JSON string for storage
        const updateData: any = { ...data };
        if (reminderMinutes !== undefined) {
          updateData.reminderMinutes = reminderMinutes ? JSON.stringify(reminderMinutes) : null;
        }
        const targetProjectId = updateData.projectId ?? issue.projectId;
        let reviewTesterIds: number[] = [];
        let restoredAssigneeId: number | null = null;
        if (input.status === "In Review" && targetProjectId) {
          const testers = await getProjectTesters(targetProjectId);
          if (testers.length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "项目暂无测试人员，无法进入审阅中" });
          }
          const primaryTester = testers[0];
          const intendedAssigneeId = input.assigneeId !== undefined ? input.assigneeId : issue.assigneeId;
          reviewTesterIds = testers.map((tester) => tester.userId);
          updateData.originalAssigneeId =
            issue.originalAssigneeId ?? (intendedAssigneeId !== primaryTester.userId ? intendedAssigneeId ?? null : null);
          updateData.assigneeId = primaryTester.userId;
        }
        if ((input.status === "In Progress" || input.status === "Todo") && issue.originalAssigneeId) {
          restoredAssigneeId = issue.originalAssigneeId;
          updateData.assigneeId = issue.originalAssigneeId;
          updateData.originalAssigneeId = null;
        }
        const result = await updateIssue(id, updateData);
        if (targetProjectId && reviewTesterIds.length > 0 && issue.status !== "In Review") {
          const project = await getProjectById(targetProjectId);
          reviewTesterIds.forEach((testerId) => {
            sendFeishuNotificationToUser(testerId, {
              title: "任务进入审阅",
              content: `任务《${issue.title}》已进入审阅中，请测试。\n\n项目：${project?.name ?? "未知项目"}\n提交人：${ctx.user.name ?? "用户"}`,
            }).catch(() => {});
          });
        }
        if (targetProjectId && restoredAssigneeId && restoredAssigneeId !== issue.assigneeId) {
          const project = await getProjectById(targetProjectId);
          sendFeishuNotificationToUser(restoredAssigneeId, {
            title: "任务退回处理",
            content: `任务《${issue.title}》已退回到${input.status === "Todo" ? "待处理" : "进行中"}，请继续处理。\n\n项目：${project?.name ?? "未知项目"}\n操作人：${ctx.user.name ?? "用户"}`,
          }).catch(() => {});
        }
        // 飞书推送：任务指派变更通知
        if (targetProjectId && updateData.assigneeId && updateData.assigneeId !== issue.assigneeId && reviewTesterIds.length === 0 && !restoredAssigneeId) {
          const project = await getProjectById(targetProjectId);
          sendFeishuNotificationToUser(updateData.assigneeId, {
            title: "🔄 任务指派变更",
            content: `**${ctx.user.name ?? "用户"}** 将任务重新指派给了你\n\n项目：${project?.name ?? "未知项目"}\n任务：${issue.title}\n优先级：${issue.priority}`,
          }).catch(() => {}); // fire-and-forget
        }
        // 任务完成时通知所有订阅者
        if (input.status === "Done" && issue.status !== "Done") {
          const project = await getProjectById(issue.projectId!);
          notifyIssueSubscribers(input.id, {
            title: "✅ 任务已完成",
            content: `任务「${issue.title}」已被 **${ctx.user.name ?? "用户"}** 标记为完成\n\n项目：${project?.name ?? "未知项目"}`,
          }).catch(() => {});
        }
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.id);
        if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
        if (issue.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        } else if (issue.authorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权删除此任务" });
        }
        return deleteIssue(input.id);
      }),

    // ─── Notification Subscribers ─────────────────────────────────────────
    getSubscribers: protectedProcedure
      .input(z.object({ issueId: z.number() }))
      .query(async ({ input }) => {
        return getIssueSubscribers(input.issueId);
      }),

    addSubscriber: protectedProcedure
      .input(z.object({ issueId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
        return addIssueSubscriber(input.issueId, input.userId);
      }),

    removeSubscriber: protectedProcedure
      .input(z.object({ issueId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
        return removeIssueSubscriber(input.issueId, input.userId);
      }),

    syncSubscribers: protectedProcedure
      .input(z.object({ issueId: z.number(), userIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
        // Get current subscribers
        const current = await getIssueSubscribers(input.issueId);
        const currentIds = current.map(s => s.userId);
        // Remove those not in new list
        for (const uid of currentIds) {
          if (!input.userIds.includes(uid)) {
            await removeIssueSubscriber(input.issueId, uid);
          }
        }
        // Add new ones
        for (const uid of input.userIds) {
          if (!currentIds.includes(uid)) {
            await addIssueSubscriber(input.issueId, uid);
          }
        }
        return { success: true };
      }),

    linkToDoc: protectedProcedure
      .input(z.object({ issueId: z.number(), docId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (issue?.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return linkIssueToDoc(input.issueId, input.docId);
      }),

    linkToFeature: protectedProcedure
      .input(z.object({ issueId: z.number(), featureRequestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (issue?.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return linkIssueToFeature(input.issueId, input.featureRequestId);
      }),

    getDocLinks: protectedProcedure
      .input(z.object({ issueId: z.number() }))
      .query(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (issue?.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getDocLinksForIssue(input.issueId);
      }),

    getFeatureLinks: protectedProcedure
      .input(z.object({ issueId: z.number() }))
      .query(async ({ input, ctx }) => {
        const issue = await getIssueById(input.issueId);
        if (issue?.projectId) {
          const member = await isProjectMember(issue.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getFeatureLinksForIssue(input.issueId);
      }),
  }),

  // ─── Cycles ────────────────────────────────────────────────────────────────
  cycles: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().nullable().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getCycles(input?.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.id);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return cycle;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          startDate: z.date(),
          endDate: z.date(),
          projectId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return createCycle({ ...input, createdBy: ctx.user.id });
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["planned", "active", "completed"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.id);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return updateCycleStatus(input.id, input.status);
      }),

    getIssues: protectedProcedure
      .input(z.object({ cycleId: z.number() }))
      .query(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.cycleId);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getCycleIssues(input.cycleId);
      }),

    addIssue: protectedProcedure
      .input(z.object({ cycleId: z.number(), issueId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.cycleId);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return addIssueToCycle(input.cycleId, input.issueId);
      }),

    removeIssue: protectedProcedure
      .input(z.object({ cycleId: z.number(), issueId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.cycleId);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return removeIssueFromCycle(input.cycleId, input.issueId);
      }),

    stats: protectedProcedure
      .input(z.object({ cycleId: z.number() }))
      .query(async ({ input, ctx }) => {
        const cycle = await getCycleById(input.cycleId);
        if (cycle?.projectId) {
          const member = await isProjectMember(cycle.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getCycleStats(input.cycleId);
      }),
  }),

  // ─── Feedback ──────────────────────────────────────────────────────────────
  feedback: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), projectId: z.number().nullable().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getFeedback(input?.status, input?.projectId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          summary: z.string().min(1),
          description: z.string().optional(),
          source: z.enum(["internal", "email", "slack", "other"]).optional(),
          sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
          submitterName: z.string().optional(),
          projectId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return createFeedback({ ...input, submittedBy: ctx.user.id });
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["New", "Reviewed", "Actioned", "Archived"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Look up feedback to check project membership
        const allFeedback = await getFeedback();
        const fb = allFeedback.find(f => f.id === input.id);
        if (fb?.projectId) {
          const member = await isProjectMember(fb.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return updateFeedbackStatus(input.id, input.status);
      }),

    linkToFeature: protectedProcedure
      .input(z.object({ feedbackId: z.number(), featureRequestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const allFeedback = await getFeedback();
        const fb = allFeedback.find(f => f.id === input.feedbackId);
        if (fb?.projectId) {
          const member = await isProjectMember(fb.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return linkFeedbackToFeature(input.feedbackId, input.featureRequestId);
      }),
  }),

  // ─── Feature Requests ──────────────────────────────────────────────────────
  featureRequests: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().nullable().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return getFeatureRequests(input?.projectId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          productArea: z.string().optional(),
          projectId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const member = await isProjectMember(input.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        return createFeatureRequest({ ...input, createdBy: ctx.user.id });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          productArea: z.string().optional(),
          status: z.enum(["Considering", "Planned", "In Progress", "Shipped"]).optional(),
          priorityScore: z.number().optional(),
          linkedIssueId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const features = await getFeatureRequests();
        const feature = features.find(f => f.id === input.id);
        if (feature?.projectId) {
          const member = await isProjectMember(feature.projectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }
        const { id, ...data } = input;
        return updateFeatureRequest(id, data);
      }),

    convertToIssue: protectedProcedure
      .input(z.object({ featureRequestId: z.number(), projectId: z.number().nullable().optional() }))
      .mutation(async ({ input, ctx }) => {
        const feature = await getFeatureRequests().then((list) =>
          list.find((f) => f.id === input.featureRequestId)
        );
        if (!feature) throw new TRPCError({ code: "NOT_FOUND" });

        const targetProjectId = input.projectId ?? feature.projectId ?? null;
        if (targetProjectId) {
          const member = await isProjectMember(targetProjectId, ctx.user.id);
          if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "你不是该项目的成员" });
        }

        const newIssue = await createIssue({
          title: feature.name,
          description: feature.description ?? undefined,
          type: "feature",
          status: "Backlog",
          priority: "medium",
          label: feature.productArea ?? undefined,
          authorId: ctx.user.id,
          projectId: targetProjectId,
        });

        const allIssues = await getIssues();
        const created = allIssues.find((i) => i.title === feature.name && i.authorId === ctx.user.id);
        if (created) {
          await linkIssueToFeature(created.id, feature.id);
          await updateFeatureRequest(feature.id, { linkedIssueId: created.id, status: "In Progress" });
        }

        return created;
      }),
  }),
  // ─── Feishu Webhooks ──────────────────────────────────────────────────────
  feishu: router({
    // 获取当前用户的飞书 Webhook 配置
    get: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserFeishuWebhook(ctx.user.id);
      }),
    // 设置/更新当前用户的飞书 Webhook
    set: protectedProcedure
      .input(z.object({ webhookUrl: z.string().url(), name: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        return setUserFeishuWebhook(ctx.user.id, input.webhookUrl, input.name ?? null);
      }),
    // 更新启用/禁用状态
    update: protectedProcedure
      .input(z.object({ enabled: z.boolean().optional(), webhookUrl: z.string().url().optional(), name: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        return updateUserFeishuWebhook(ctx.user.id, input);
      }),
    // 删除当前用户的飞书 Webhook
    delete: protectedProcedure
      .mutation(async ({ ctx }) => {
        return deleteUserFeishuWebhook(ctx.user.id);
      }),
    // 发送测试消息给自己
    test: protectedProcedure
      .mutation(async ({ ctx }) => {
        await sendFeishuNotificationToUser(ctx.user.id, {
          title: "测试通知",
          content: `**${ctx.user.name ?? "用户"}** 发送了一条测试消息，如果你看到这条消息，说明飞书 Webhook 配置正确！`,
        });
        return { success: true };
      }),
  }),

  // ─── Attachments (文件附件) ──────────────────────────────────────────────────
  architecture: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input }) => {
        return getArchitectureDocs(input.projectId);
      }),
    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        const allDocs = await getArchitectureDocsOverview();
        // Filter: only show docs from projects the user is a member of, or docs without a project
        const memberProjectIds = await getUserMemberProjectIds(ctx.user.id);
        return allDocs.filter((doc) => !doc.projectId || memberProjectIds.includes(doc.projectId));
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getArchitectureDocById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createArchitectureDoc({ ...input, createdBy: ctx.user.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        projectId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateArchitectureDoc(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteArchitectureDoc(input.id);
        return { success: true };
      }),
    linkIssue: protectedProcedure
      .input(z.object({
        issueId: z.number(),
        archDocId: z.number(),
        nodePath: z.string(),
      }))
      .mutation(async ({ input }) => {
        await linkIssueToArchNode(input.issueId, input.archDocId, input.nodePath);
        return { success: true };
      }),
    unlinkIssue: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await unlinkIssueFromArchNode(input.id);
        return { success: true };
      }),
    getIssueLinks: protectedProcedure
      .input(z.object({ issueId: z.number() }))
      .query(async ({ input }) => {
        return getArchLinksForIssue(input.issueId);
      }),
    getNodeIssues: protectedProcedure
      .input(z.object({ archDocId: z.number(), nodePath: z.string().optional() }))
      .query(async ({ input }) => {
        return getIssuesForArchNode(input.archDocId, input.nodePath);
      }),
    // ─── Node Flowcharts ─────────────────────────────────────────────────
    getFlowchart: protectedProcedure
      .input(z.object({ archDocId: z.number(), nodePath: z.string() }))
      .query(async ({ input }) => {
        return getNodeFlowchart(input.archDocId, input.nodePath);
      }),
    listFlowcharts: protectedProcedure
      .input(z.object({ archDocId: z.number() }))
      .query(async ({ input }) => {
        return listNodeFlowcharts(input.archDocId);
      }),
    saveFlowchart: protectedProcedure
      .input(z.object({
        archDocId: z.number(),
        nodePath: z.string(),
        mermaidContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        return saveNodeFlowchart(input.archDocId, input.nodePath, input.mermaidContent);
      }),
    deleteFlowchart: protectedProcedure
      .input(z.object({ archDocId: z.number(), nodePath: z.string() }))
      .mutation(async ({ input }) => {
        return deleteNodeFlowchart(input.archDocId, input.nodePath);
      }),
    // ─── Version Management ─────────────────────────────────────────────
    createVersion: protectedProcedure
      .input(z.object({
        archDocId: z.number(),
        title: z.string(),
        content: z.string().nullable(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createArchitectureVersion(
          input.archDocId,
          input.title,
          input.content,
          ctx.user.id,
          input.description
        );
      }),
    listVersions: protectedProcedure
      .input(z.object({ archDocId: z.number() }))
      .query(async ({ input }) => {
        return getArchitectureVersions(input.archDocId);
      }),
    getVersionContent: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .query(async ({ input }) => {
        return getArchitectureVersionContent(input.versionId);
      }),
    restoreVersion: protectedProcedure
      .input(z.object({
        archDocId: z.number(),
        versionId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return restoreArchitectureVersion(input.archDocId, input.versionId);
      }),
    getMergedForParent: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Check user is member of the parent project
        const isMember = await isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此项目" });
        // Get parent project info
        const parentProject = await getProjectById(input.projectId);
        if (!parentProject) throw new TRPCError({ code: "NOT_FOUND", message: "项目不存在" });
        // Get child projects
        const children = await getChildProjects(input.projectId);
        // Check if parent project already has its own architecture doc
        const parentDocs = await getArchitectureDocs(input.projectId);
        if (parentDocs.length > 0) {
          // Parent already has an architecture doc - rebuild it from all child projects
          const parentDoc = parentDocs[0];
          
          // Always rebuild merged content from all child projects to ensure sync
          let mergedMarkdown = `# ${parentProject.name}\n\n`;
          let hasAnyChildDocs = false;
          
          for (const child of children) {
            const childLabel = `${child.icon || ''} ${child.name}`.trim();
            const childDocs = await getArchitectureDocs(child.id);
            mergedMarkdown += `## ${childLabel}\n\n`;
            
            if (childDocs.length > 0) {
              hasAnyChildDocs = true;
              for (const doc of childDocs) {
                if (doc.content) {
                  const lines = doc.content.split('\n');
                  for (const line of lines) {
                    if (line.startsWith('# ')) {
                      mergedMarkdown += `### ${line.slice(2)}\n`;
                    } else if (line.startsWith('## ')) {
                      mergedMarkdown += `#### ${line.slice(3)}\n`;
                    } else if (line.startsWith('### ')) {
                      mergedMarkdown += `##### ${line.slice(4)}\n`;
                    } else if (line.startsWith('- ')) {
                      mergedMarkdown += `  ${line}\n`;
                    } else {
                      mergedMarkdown += `${line}\n`;
                    }
                  }
                  mergedMarkdown += '\n';
                }
              }
            } else {
              mergedMarkdown += `\n`;
            }
          }
          
          // Update the parent doc with rebuilt content
          const newContent = mergedMarkdown.trim();
          if (newContent !== (parentDoc.content || '').trim()) {
            await updateArchitectureDoc(parentDoc.id, { content: newContent });
          }
          
          return {
            docId: parentDoc.id,
            parentName: parentProject.name,
            children: await Promise.all(children.map(async (child) => {
              const docs = await getArchitectureDocs(child.id);
              return { id: child.id, name: child.name, icon: child.icon, docCount: docs.length, docIds: docs.map(d => d.id) };
            })),
          };
        }
        // No existing doc - generate merged content from children and create a new doc
        if (children.length === 0) {
          // No children either - create empty doc for parent
          const newDoc = await createArchitectureDoc({
            title: `${parentProject.name} - 总架构图`,
            content: `# ${parentProject.name}\n`,
            projectId: input.projectId,
            createdBy: ctx.user.id,
          });
          return {
            docId: newDoc.id,
            parentName: parentProject.name,
            children: [],
          };
        }
        // Build merged markdown from child docs
        const childDocs = await Promise.all(
          children.map(async (child) => {
            const docs = await getArchitectureDocs(child.id);
            return { project: child, docs };
          })
        );
        let mergedMarkdown = `# ${parentProject.name}\n\n`;
        for (const { project: child, docs } of childDocs) {
          mergedMarkdown += `## ${child.icon || ''} ${child.name}\n\n`;
          for (const doc of docs) {
            if (doc.content) {
              const lines = doc.content.split('\n');
              for (const line of lines) {
                if (line.startsWith('# ')) {
                  mergedMarkdown += `### ${line.slice(2)}\n`;
                } else if (line.startsWith('## ')) {
                  mergedMarkdown += `#### ${line.slice(3)}\n`;
                } else if (line.startsWith('### ')) {
                  mergedMarkdown += `##### ${line.slice(4)}\n`;
                } else if (line.startsWith('- ')) {
                  mergedMarkdown += `  ${line}\n`;
                } else {
                  mergedMarkdown += `${line}\n`;
                }
              }
              mergedMarkdown += '\n';
            }
          }
        }
        // Create the merged doc for the parent project
        const newDoc = await createArchitectureDoc({
          title: `${parentProject.name} - 总架构图`,
          content: mergedMarkdown.trim(),
          projectId: input.projectId,
          createdBy: ctx.user.id,
        });
        return {
          docId: newDoc.id,
          parentName: parentProject.name,
          children: childDocs.map(({ project: child, docs }) => ({
            id: child.id,
            name: child.name,
            icon: child.icon,
            docCount: docs.length,
            docIds: docs.map(d => d.id),
          })),
        };
      }),
    getNodeChildren: protectedProcedure
      .input(z.object({ archDocId: z.number(), nodePath: z.string() }))
      .query(async ({ input }) => {
        const doc = await getArchitectureDocById(input.archDocId);
        if (!doc || !doc.content) return [];
        const lines = doc.content.split('\n');

        // Helper: extract children starting from a given line index
        // For heading nodes, startIdx is the line AFTER the heading
        // For list nodes, startIdx is the line AFTER the matched list item
        const extractChildrenFromHeading = (startIdx: number, headingLevel: number): string[] => {
          const result: string[] = [];
          let inCode = false;
          for (let i = startIdx; i < lines.length; i++) {
            const l = lines[i];
            if (l.trim().startsWith('```')) { inCode = !inCode; continue; }
            if (inCode) continue;
            // Stop at same or higher level heading
            const hm = l.match(/^(#{1,6})\s+/);
            if (hm && hm[1].length <= headingLevel) break;
            // Collect top-level list items (no tab indent)
            const tlm = l.match(/^-\s+(.+)/);
            if (tlm) result.push(tlm[1].trim());
          }
          return result;
        };

        const extractChildrenFromList = (startIdx: number, parentIndent: number): string[] => {
          const result: string[] = [];
          let inCode = false;
          for (let i = startIdx; i < lines.length; i++) {
            const l = lines[i];
            if (l.trim().startsWith('```')) { inCode = !inCode; continue; }
            if (inCode) continue;
            // Stop at heading
            if (l.match(/^#{1,6}\s+/)) break;
            const lm = l.match(/^(\t*)(\s*)-\s+(.+)/);
            if (lm) {
              const indent = lm[1].length;
              if (indent <= parentIndent) break; // Same level or parent, stop
              if (indent === parentIndent + 1) {
                result.push(lm[3].trim()); // Direct child
              }
              // Deeper indents are grandchildren, skip
            }
          }
          return result;
        };

        // Search ALL occurrences and return children from the first one that has children.
        // If none have children, return empty.
        let inCodeBlock = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
          if (inCodeBlock) continue;

          // Check heading match
          const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
          if (headingMatch) {
            const text = headingMatch[2].trim();
            if (text === input.nodePath) {
              const children = extractChildrenFromHeading(i + 1, headingMatch[1].length);
              if (children.length > 0) return children;
              // No children from this heading occurrence, continue searching
            }
            continue;
          }

          // Check list item match
          const listMatch = line.match(/^(\t*)(\s*)-\s+(.+)/);
          if (listMatch) {
            const text = listMatch[3].trim();
            if (text === input.nodePath) {
              const indent = listMatch[1].length;
              const children = extractChildrenFromList(i + 1, indent);
              if (children.length > 0) return children;
              // No children from this list occurrence, continue searching
            }
          }
        }
        return [];
      }),
  }),
  attachments: router({
    upload: protectedProcedure
      .input(z.object({
        issueId: z.number().optional(),
        projectId: z.number().optional(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 权限校验：如果有 projectId，检查是否为项目成员
        if (input.projectId) {
          const isMember = await isProjectMember(input.projectId, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "无权操作此项目" });
        }
        try {
          // 上传到 S3 - 对文件名进行安全处理
          const fileBuffer = Buffer.from(input.fileData, "base64");
          // 提取文件扩展名，生成安全的 S3 key（避免中文/特殊字符导致 presign 失败）
          const ext = input.fileName.includes(".") ? input.fileName.slice(input.fileName.lastIndexOf(".")) : "";
          const safeFileName = `file_${Date.now()}${ext}`;
          const fileKey = `attachments/${ctx.user.id}/${safeFileName}`;
          const { key, url } = await storagePut(fileKey, fileBuffer, input.mimeType ?? "application/octet-stream");
          // 保存到数据库（保留原始文件名用于显示）
          const result = await createAttachment({
            issueId: input.issueId ?? null,
            projectId: input.projectId ?? null,
            fileName: input.fileName,
            fileKey: key,
            url,
            mimeType: input.mimeType ?? null,
            fileSize: input.fileSize ?? null,
            uploadedBy: ctx.user.id,
          });
          return { id: result?.id, url, fileName: input.fileName };
        } catch (err: any) {
          console.error("[Attachment Upload Error]", err?.message || err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `文件上传失败: ${err?.message || "未知错误"}` });
        }
      }),
    listByIssue: protectedProcedure
      .input(z.object({ issueId: z.number() }))
      .query(async ({ input }) => {
        return getAttachmentsByIssue(input.issueId);
      }),
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const isMember = await isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "无权查看此项目附件" });
        return getAttachmentsByProject(input.projectId);
      }),
    preview: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const attachment = await getAttachmentById(input.id);
        if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });
        // Only allow text preview for text-like files
        const textExts = ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts"];
        const ext = attachment.fileName.split(".").pop()?.toLowerCase() || "";
        const isText = attachment.mimeType?.startsWith("text/") || textExts.includes(ext);
        if (!isText) throw new TRPCError({ code: "BAD_REQUEST", message: "不支持预览此文件类型" });
        try {
          const signedUrl = await storageGetSignedUrl(attachment.fileKey);
          const resp = await fetch(signedUrl);
          if (!resp.ok) throw new Error("Failed to fetch file");
          const text = await resp.text();
          return { content: text.slice(0, 100000) }; // Limit to 100KB
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "无法读取文件内容" });
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const attachment = await getAttachmentById(input.id);
        if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });
        if (attachment.uploadedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能删除自己上传的文件" });
        await deleteAttachment(input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
