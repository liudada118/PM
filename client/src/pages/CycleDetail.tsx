import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, RefreshCw, Flame, ArrowUp, Minus, ArrowDown, X } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";

const STATUS_CONFIG: Record<string, { dot: string; color: string; bg: string; label: string }> = {
  Backlog: { dot: "bg-slate-300", color: "text-slate-500", bg: "bg-slate-50", label: "待办池" },
  Todo: { dot: "bg-violet-400", color: "text-violet-600", bg: "bg-violet-50", label: "待处理" },
  "In Progress": { dot: "bg-blue-500", color: "text-blue-600", bg: "bg-blue-50", label: "进行中" },
  "In Review": { dot: "bg-amber-400", color: "text-amber-600", bg: "bg-amber-50", label: "审阅中" },
  Done: { dot: "bg-emerald-500", color: "text-emerald-600", bg: "bg-emerald-50", label: "已完成" },
};

const CYCLE_STATUS_LABEL: Record<string, string> = {
  planned: "已规划",
  active: "进行中",
  completed: "已完成",
};

const PRIORITY_CONFIG = {
  urgent: { icon: Flame, color: "text-red-600" },
  high: { icon: ArrowUp, color: "text-orange-500" },
  medium: { icon: Minus, color: "text-yellow-500" },
  low: { icon: ArrowDown, color: "text-slate-400" },
};

export default function CycleDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const [showAddIssue, setShowAddIssue] = useState(false);

  const { data: cycle } = trpc.cycles.get.useQuery({ id });
  const { data: stats, isLoading: statsLoading } = trpc.cycles.stats.useQuery({ cycleId: id });
  const { data: allIssues } = trpc.issues.list.useQuery();
  const utils = trpc.useUtils();

  const addIssueMutation = trpc.cycles.addIssue.useMutation({
    onSuccess: () => {
      utils.cycles.stats.invalidate({ cycleId: id });
      toast.success("任务已加入迭代");
    },
  });

  const [removeConfirmIssueId, setRemoveConfirmIssueId] = useState<number | null>(null);
  const removeIssueMutation = trpc.cycles.removeIssue.useMutation({
    onSuccess: () => {
      utils.cycles.stats.invalidate({ cycleId: id });
      toast.success("任务已从迭代移除");
      setRemoveConfirmIssueId(null);
    },
  });

  const cycleIssueIds = new Set(stats?.issues?.map((i: any) => i.id) ?? []);
  const availableIssues = allIssues?.filter((i) => !cycleIssueIds.has(i.id)) ?? [];

  if (!cycle) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground text-sm">未找到该迭代</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/cycles")}>
          返回迭代列表
        </Button>
      </div>
    );
  }

  const statusGroups = ["Backlog", "Todo", "In Progress", "In Review", "Done"];

  return (
    <div className="page-enter">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setLocation("/cycles")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            迭代周期
          </Button>
          <span className="text-muted-foreground/30">/</span>
          <RefreshCw className="h-4 w-4 text-primary" />
          <h1 className="text-base font-semibold tracking-tight leading-none">{cycle.name}</h1>
        </div>
      </PageHeader>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {cycle.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(cycle.startDate), "M月d日", { locale: zhCN })} – {format(new Date(cycle.endDate), "M月d日 yyyy年", { locale: zhCN })}</span>
            <Badge
              className={`text-[10px] h-4 px-1.5 border-0 ${
                cycle.status === "active"
                  ? "bg-blue-100 text-blue-700"
                  : cycle.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {CYCLE_STATUS_LABEL[cycle.status] ?? cycle.status}
            </Badge>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddIssue(true)}>
          <Plus className="h-3.5 w-3.5" />
          添加任务
        </Button>
      </div>

      {/* 进度概览 */}
      {statsLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : stats ? (
        <div className="card-elegant p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">迭代进度</h2>
            <span className="text-2xl font-bold text-primary">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2 mb-4" />
          <div className="grid grid-cols-5 gap-3">
            {statusGroups.map((status) => {
              const count = stats.issues?.filter((i: any) => i.status === status).length ?? 0;
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className={`text-center p-2.5 rounded-lg ${cfg.bg}`}>
                  <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                  <p className={`text-[10px] ${cfg.color} mt-0.5`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 迭代任务列表 */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
          本迭代任务（共 {stats?.total ?? 0} 个）
        </h2>
        {statsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : stats?.issues && stats.issues.length > 0 ? (
          <div className="space-y-2">
            {stats.issues.map((issue: any) => {
              const cfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.Backlog;
              const priorityCfg = PRIORITY_CONFIG[issue.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
              const PriorityIcon = priorityCfg.icon;
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors group"
                >
                  <div className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                  <span className="flex-1 text-sm font-medium truncate">{issue.title}</span>
                  <div className="flex items-center gap-2">
                    <PriorityIcon className={`h-3.5 w-3.5 ${priorityCfg.color}`} />
                    <Badge variant="secondary" className={`text-[10px] h-5 px-2 ${cfg.bg} ${cfg.color} border-0`}>
                      {cfg.label}
                    </Badge>
                    {issue.label && (
                      <Badge variant="outline" className="text-[10px] h-5 px-2">
                        {issue.label}
                      </Badge>
                    )}
                    <button
                      onClick={() => setRemoveConfirmIssueId(issue.id)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl">
            <RefreshCw className="h-7 w-7 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">本迭代暂无任务</p>
            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => setShowAddIssue(true)}>
              添加任务
            </Button>
          </div>
        )}
      </div>

      {/* 添加任务弹窗 */}
      <Dialog open={showAddIssue} onOpenChange={setShowAddIssue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">添加任务到迭代</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {availableIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                所有任务已加入本迭代
              </p>
            ) : (
              availableIssues.map((issue) => {
                const cfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.Backlog;
                return (
                  <button
                    key={issue.id}
                    onClick={() => addIssueMutation.mutate({ cycleId: id, issueId: issue.id })}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                    <span className="flex-1 text-xs font-medium truncate">{issue.title}</span>
                    <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 ${cfg.bg} ${cfg.color} border-0 shrink-0`}>
                      {cfg.label}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Issue Confirmation Dialog */}
      <AlertDialog open={removeConfirmIssueId !== null} onOpenChange={(open: boolean) => { if (!open) setRemoveConfirmIssueId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除任务</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将这个任务从当前迭代中移除吗？任务本身不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removeConfirmIssueId) removeIssueMutation.mutate({ cycleId: id, issueId: removeConfirmIssueId }); }}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
