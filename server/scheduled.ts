import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getIssuesCompletedToday, getIssuesDueForReminder, getAllUsers, sendFeishuNotificationToUser, getScheduledTask, getProjectMembers } from "./db";

/**
 * 每天 18:00 推送今日完成的任务汇总
 * - 项目管理员(owner)：收到其管理项目中当天完成的所有任务推送
 * - 普通成员：只收到自己完成的任务推送
 * POST /api/scheduled/dailyDigest
 */
export async function dailyDigestHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    // Verify this is our expected cron task
    const task = await getScheduledTask("daily-digest");
    if (!task || task.taskUid !== user.taskUid) {
      return res.json({ ok: true, skipped: "orphan" });
    }

    // Get today's completed issues
    const completedIssues = await getIssuesCompletedToday();

    if (completedIssues.length === 0) {
      return res.json({ ok: true, message: "No completed issues today" });
    }

    // Group completed issues by projectId
    const byProjectId: Record<number, typeof completedIssues> = {};
    for (const issue of completedIssues) {
      if (issue.projectId) {
        if (!byProjectId[issue.projectId]) byProjectId[issue.projectId] = [];
        byProjectId[issue.projectId].push(issue);
      }
    }

    // Get all unique project IDs
    const projectIds = Object.keys(byProjectId).map(Number);

    // Build a map: userId -> { ownedProjectIds, assigneeIssues }
    const allUsers = await getAllUsers();
    const userProjectOwnership: Record<number, Set<number>> = {}; // userId -> set of projectIds they own

    // For each project, get members and identify owners
    for (const projectId of projectIds) {
      const members = await getProjectMembers(projectId);
      for (const member of members) {
        if (member.role === "owner") {
          if (!userProjectOwnership[member.userId]) {
            userProjectOwnership[member.userId] = new Set();
          }
          userProjectOwnership[member.userId].add(projectId);
        }
      }
    }

    // Now send personalized notifications to each user
    let sentCount = 0;

    for (const u of allUsers) {
      const ownedProjectIds = userProjectOwnership[u.id];
      
      // Issues this user should see as project owner
      const ownerIssues: typeof completedIssues = [];
      if (ownedProjectIds) {
        for (const pid of Array.from(ownedProjectIds)) {
          const projectIssues = byProjectId[pid] || [];
          // Exclude issues completed by the user themselves (they'll see those in their own section)
          for (const issue of projectIssues) {
            if (issue.assigneeId !== u.id) {
              ownerIssues.push(issue);
            }
          }
        }
      }

      // Issues this user completed themselves
      const myIssues = completedIssues.filter(issue => issue.assigneeId === u.id);

      // Skip if nothing to notify
      if (ownerIssues.length === 0 && myIssues.length === 0) continue;

      // Build personalized message
      let content = `**📊 今日完成任务汇总**\n\n`;

      // Section 1: My completed tasks
      if (myIssues.length > 0) {
        content += `**🙋 我完成的任务** (${myIssues.length}项)\n`;
        for (const issue of myIssues) {
          const projectLabel = issue.projectName ? ` [${issue.projectName}]` : "";
          content += `- ✅ ${issue.title}${projectLabel}\n`;
        }
        content += "\n";
      }

      // Section 2: Project tasks (as owner/admin)
      if (ownerIssues.length > 0) {
        // Group by project
        const ownerByProject: Record<string, typeof completedIssues> = {};
        for (const issue of ownerIssues) {
          const projectName = issue.projectName ?? "未分配项目";
          if (!ownerByProject[projectName]) ownerByProject[projectName] = [];
          ownerByProject[projectName].push(issue);
        }

        content += `**👔 我管理的项目完成任务** (${ownerIssues.length}项)\n`;
        for (const [projectName, issues] of Object.entries(ownerByProject)) {
          content += `\n**${projectName}**\n`;
          for (const issue of issues) {
            const assignee = issue.assigneeName ? ` @${issue.assigneeName}` : "";
            content += `- ✅ ${issue.title}${assignee}\n`;
          }
        }
        content += "\n";
      }

      try {
        await sendFeishuNotificationToUser(u.id, {
          title: "📋 每日任务完成汇总",
          content,
        });
        sentCount++;
      } catch {
        // skip users without webhook
      }
    }

    return res.json({ ok: true, completedCount: completedIssues.length, sentTo: sentCount });
  } catch (err: any) {
    console.error("[DailyDigest] Error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url, taskUid: (err as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 任务到期提醒
 * POST /api/scheduled/dueReminder
 */
export async function dueReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    // Verify this is our expected cron task
    const task = await getScheduledTask("due-reminder");
    if (!task || task.taskUid !== user.taskUid) {
      return res.json({ ok: true, skipped: "orphan" });
    }

    // Get issues that need reminders
    const issues = await getIssuesDueForReminder();
    const now = Date.now();
    let sentCount = 0;

    for (const issue of issues) {
      if (!issue.dueDate || !issue.reminderMinutes || !issue.assigneeId) continue;

      const dueTime = new Date(issue.dueDate).getTime();
      const reminders: number[] = JSON.parse(issue.reminderMinutes);

      for (const minutes of reminders) {
        const reminderTime = dueTime - minutes * 60 * 1000;
        // Check if the reminder should fire within the current 10-minute window
        // (since this cron runs every 10 minutes)
        const windowStart = now - 5 * 60 * 1000;
        const windowEnd = now + 5 * 60 * 1000;

        if (reminderTime >= windowStart && reminderTime <= windowEnd) {
          const timeLabel = minutes >= 1440 ? `${Math.floor(minutes / 1440)} 天` : minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟`;
          await sendFeishuNotificationToUser(issue.assigneeId, {
            title: "⏰ 任务即将到期",
            content: `任务「${issue.title}」将在 **${timeLabel}** 后到期\n\n截止时间：${new Date(issue.dueDate).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          });
          sentCount++;
        }
      }
    }

    return res.json({ ok: true, remindersSent: sentCount });
  } catch (err: any) {
    console.error("[DueReminder] Error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url, taskUid: (err as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
