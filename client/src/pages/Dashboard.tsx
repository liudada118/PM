import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen,
  CircleDot,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderOpen,
  CalendarDays,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ projectId: null });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "早上好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <div className="page-enter flex flex-col flex-1">
      <PageHeader>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">仪表盘</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">全部项目总览</p>
          </div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </PageHeader>
      <div className="p-6 space-y-8 flex-1 w-full">
      {/* 头部 */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {greeting()}，{user?.name?.split(" ")[0] ?? "同学"} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          这是你今天工作空间的概览。
        </p>
      </div>

      {/* 数据卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="当前迭代"
          value={isLoading ? null : (stats?.activeCycle?.name ?? "暂无活跃迭代")}
          icon={RefreshCw}
          color="text-violet-600"
          bg="bg-violet-50"
          sub={stats?.activeCycle ? `已完成 ${stats.cycleStats?.completionRate ?? 0}%` : "创建一个新迭代"}
          loading={isLoading}
        />
        <StatCard
          title="待处理反馈"
          value={isLoading ? null : String(stats?.pendingFeedbackCount ?? 0)}
          icon={MessageSquare}
          color="text-amber-600"
          bg="bg-amber-50"
          sub="待审阅"
          loading={isLoading}
          urgent={Number(stats?.pendingFeedbackCount ?? 0) > 0}
        />
        <StatCard
          title="任务总数"
          value={isLoading ? null : String(stats?.totalIssues ?? 0)}
          icon={CircleDot}
          color="text-blue-600"
          bg="bg-blue-50"
          sub={`已完成 ${stats?.doneIssues ?? 0} 个`}
          loading={isLoading}
        />
        <StatCard
          title="Wiki 文档"
          value={isLoading ? null : String(stats?.recentDocs?.length ?? 0)}
          icon={BookOpen}
          color="text-emerald-600"
          bg="bg-emerald-50"
          sub="最近文档"
          loading={isLoading}
        />
      </div>

      {/* 项目进度 */}
      <ProjectsProgress />

      {/* 我的待办 */}
      <MyTodos />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 当前迭代进度 */}
        <div className="lg:col-span-2">
          <Card className="card-elegant h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">当前迭代进度</CardTitle>
                {stats?.activeCycle && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.activeCycle.name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setLocation("/cycles")}
              >
                查看全部 <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : stats?.activeCycle && stats.cycleStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">完成度</span>
                    <span className="font-semibold text-foreground">{stats.cycleStats.completionRate}%</span>
                  </div>
                  <Progress value={stats.cycleStats.completionRate} className="h-2" />
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold text-foreground">{stats.cycleStats.total}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">总计</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50">
                      <p className="text-xl font-bold text-blue-700">{stats.cycleStats.inProgress}</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">进行中</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-50">
                      <p className="text-xl font-bold text-emerald-700">{stats.cycleStats.done}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">已完成</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">暂无活跃迭代</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => setLocation("/cycles")}
                  >
                    创建迭代
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 最近文档 */}
        <Card className="card-elegant">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">最近文档</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setLocation("/wiki")}
            >
              查看全部 <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : stats?.recentDocs && stats.recentDocs.length > 0 ? (
              stats.recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setLocation(`/wiki/${doc.id}`)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className="mt-0.5 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: zhCN })}
                    </p>
                  </div>
                  {doc.templateType && doc.templateType !== "none" && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">
                      {({prd:"PRD",meeting:"会议",flow:"流程图",competitive:"竞品分析",release:"发布说明",tech_design:"技术方案"} as Record<string,string>)[doc.templateType] || doc.templateType}
                    </Badge>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-7 w-7 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">暂无文档</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => setLocation("/wiki")}
                >
                  新建文档
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          快捷操作
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "新建文档", icon: BookOpen, path: "/wiki", color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100" },
            { label: "创建任务", icon: CircleDot, path: "/issues", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
            { label: "开始迭代", icon: RefreshCw, path: "/cycles", color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
            { label: "提交反馈", icon: MessageSquare, path: "/feedback", color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setLocation(action.path)}
              className={`flex items-center gap-3 p-4 rounded-xl ${action.bg} transition-colors text-left hover-lift`}
            >
              <action.icon className={`h-4 w-4 ${action.color} shrink-0`} />
              <span className={`text-xs font-medium ${action.color}`}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  urgent: { label: "紧急", color: "text-red-600 bg-red-50", icon: AlertCircle },
  high: { label: "高", color: "text-orange-600 bg-orange-50", icon: AlertCircle },
  medium: { label: "中", color: "text-blue-600 bg-blue-50", icon: Clock },
  low: { label: "低", color: "text-slate-500 bg-slate-50", icon: Clock },
};

const STATUS_LABELS: Record<string, string> = {
  Backlog: "待办池",
  Todo: "待处理",
  "In Progress": "进行中",
  "In Review": "审阅中",
};

function MyTodos() {
  const { data: myTodos, isLoading } = trpc.issues.myTodos.useQuery();
  const [, setLocation] = useLocation();

  return (
    <Card className="card-elegant">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">我的待办</CardTitle>
          {myTodos && myTodos.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {myTodos.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setLocation("/issues")}
        >
          查看全部 <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !myTodos || myTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm text-muted-foreground">太棒了，没有待办任务！</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-auto">
            {myTodos.slice(0, 8).map((todo) => {
              const pConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
              const PIcon = pConfig.icon;
              return (
                <button
                  key={todo.id}
                  onClick={() => setLocation("/issues")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${pConfig.color}`}>
                    <PIcon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {STATUS_LABELS[todo.status] || todo.status}
                      </span>
                      {todo.projectName && (
                        <span className="text-[10px] text-muted-foreground">
                          · {todo.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] h-4 px-1.5 shrink-0 ${pConfig.color} border-0`}>
                    {pConfig.label}
                  </Badge>
                </button>
              );
            })}
            {myTodos.length > 8 && (
              <p className="text-center text-[10px] text-muted-foreground pt-2">
                还有 {myTodos.length - 8} 项待办...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsProgress() {
  const { data: projectsProgress, isLoading } = trpc.dashboard.projectsProgress.useQuery();
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<any>(null);

  function getTimeProgress(proj: any) {
    if (!proj.deadline) return null;
    const now = Date.now();
    const deadlineTime = new Date(proj.deadline).getTime();
    const createdTime = new Date(proj.createdAt).getTime();
    const totalDuration = deadlineTime - createdTime;
    const elapsed = now - createdTime;
    const daysLeft = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));
    const percentage = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 100;
    return { daysLeft, percentage };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">项目进度</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setLocation("/projects")}
        >
          管理项目 <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : projectsProgress && projectsProgress.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsProgress.map((proj) => {
            const timeInfo = getTimeProgress(proj);
            return (
              <Card
                key={proj.id}
                className="card-elegant cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
                onClick={() => setLocation(`/projects/${proj.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* 项目头部 */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: proj.color + "20" }}
                    >
                      {proj.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proj.name}</p>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-0.5">
                        {proj.status === "planning" ? "规划中" : proj.status === "in_progress" ? "进行中" : "已完成"}
                      </Badge>
                    </div>
                  </div>

                  {/* 任务完成率 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">任务进度</span>
                      <span className="text-[10px] font-semibold" style={{ color: proj.color }}>
                        {proj.doneIssues}/{proj.totalIssues} · {proj.completionRate}%
                      </span>
                    </div>
                    <Progress value={proj.completionRate} className="h-1.5" />
                  </div>

                  {/* 甘特图风格时间进度条 */}
                  {timeInfo ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />时间进度
                        </span>
                        <span className={`text-[10px] font-semibold ${
                          timeInfo.daysLeft < 0 ? "text-red-500" :
                          timeInfo.daysLeft <= 7 ? "text-amber-500" :
                          "text-muted-foreground"
                        }`}>
                          {timeInfo.daysLeft < 0 ? `已过期 ${Math.abs(timeInfo.daysLeft)} 天` :
                           timeInfo.daysLeft === 0 ? "今天截止" :
                           `剩余 ${timeInfo.daysLeft} 天`}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                            timeInfo.daysLeft < 0 ? "bg-red-400" :
                            timeInfo.daysLeft <= 7 ? "bg-amber-400" :
                            "bg-blue-400"
                          }`}
                          style={{ width: `${timeInfo.percentage}%` }}
                        />
                        {/* 今天标记线 */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                          style={{ left: `${Math.min(timeInfo.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
                        <span>{new Date(proj.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                        <span>{new Date(proj.deadline!).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 pt-1">
                      <CalendarDays className="h-2.5 w-2.5" />
                      <span>未设置截止时间</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="card-elegant">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-7 w-7 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">暂无项目</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => setLocation("/projects")}
            >
              创建项目
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 项目详情弹窗 */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ backgroundColor: selectedProject.color + "20" }}
                  >
                    {selectedProject.icon}
                  </span>
                  {selectedProject.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* 描述 */}
                {selectedProject.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">项目描述</p>
                    <p className="text-sm">{selectedProject.description}</p>
                  </div>
                )}

                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">项目状态</p>
                    <Badge variant="secondary">
                      {selectedProject.status === "planning" ? "规划中" : selectedProject.status === "in_progress" ? "进行中" : "已完成"}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">任务统计</p>
                    <p className="text-sm font-semibold">{selectedProject.doneIssues}/{selectedProject.totalIssues} <span className="text-xs font-normal text-muted-foreground">已完成</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">完成率</p>
                    <p className="text-sm font-semibold" style={{ color: selectedProject.color }}>{selectedProject.completionRate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground mb-1">创建时间</p>
                    <p className="text-xs">{new Date(selectedProject.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>
                  {selectedProject.creatorName && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground mb-1">创建者</p>
                      <p className="text-xs font-medium">{selectedProject.creatorName}</p>
                    </div>
                  )}
                </div>

                {/* 截止时间和时间进度 */}
                {selectedProject.deadline && (() => {
                  const ti = getTimeProgress(selectedProject);
                  if (!ti) return null;
                  return (
                    <div className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />
                          项目时间线
                        </span>
                        <span className={`text-xs font-semibold ${
                          ti.daysLeft < 0 ? "text-red-500" :
                          ti.daysLeft <= 7 ? "text-amber-500" :
                          "text-emerald-600"
                        }`}>
                          {ti.daysLeft < 0 ? `已过期 ${Math.abs(ti.daysLeft)} 天` :
                           ti.daysLeft === 0 ? "今天截止" :
                           `剩余 ${ti.daysLeft} 天`}
                        </span>
                      </div>
                      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                            ti.daysLeft < 0 ? "bg-red-400" :
                            ti.daysLeft <= 7 ? "bg-amber-400" :
                            "bg-blue-400"
                          }`}
                          style={{ width: `${ti.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>开始：{new Date(selectedProject.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                        <span>截止：{new Date(selectedProject.deadline).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 任务完成进度 */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">任务完成进度</p>
                  <Progress value={selectedProject.completionRate} className="h-2" />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setSelectedProject(null); setLocation("/projects"); }}
                  >
                    查看项目看板
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setSelectedProject(null); setLocation("/issues"); }}
                  >
                    查看任务
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  sub,
  loading,
  urgent,
}: {
  title: string;
  value: string | null;
  icon: React.ElementType;
  color: string;
  bg: string;
  sub: string;
  loading: boolean;
  urgent?: boolean;
}) {
  return (
    <Card className="card-elegant hover-lift">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          {urgent && (
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-foreground leading-none mb-1">{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </>
        )}
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mt-2">{title}</p>
      </CardContent>
    </Card>
  );
}
