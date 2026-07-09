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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Plus, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";

const STATUS_CONFIG = {
  planned: { label: "已规划", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  active: { label: "进行中", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
  completed: { label: "已完成", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
};

export default function CycleList() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"));

  const { currentProjectId } = useProject();
  const { data: cycles, isLoading } = trpc.cycles.list.useQuery({ projectId: currentProjectId });
  const utils = trpc.useUtils();

  const createMutation = trpc.cycles.create.useMutation({
    onSuccess: () => {
      utils.cycles.list.invalidate();
      toast.success("迭代创建成功");
      setShowCreate(false);
      setName("");
      setDescription("");
    },
    onError: () => toast.error("创建迭代失败"),
  });

  const updateStatusMutation = trpc.cycles.updateStatus.useMutation({
    onSuccess: () => {
      utils.cycles.list.invalidate();
      toast.success("迭代状态已更新");
    },
  });

  return (
    <div className="page-enter">
      <PageHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">迭代周期</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">以 2 周为单位的 Sprint，组织和追踪团队工作</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            新建迭代
          </Button>
        </div>
      </PageHeader>
      <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* 迭代列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : cycles && cycles.length > 0 ? (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const cfg = STATUS_CONFIG[cycle.status as keyof typeof STATUS_CONFIG];
            return (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                cfg={cfg}
                onView={() => setLocation(`/cycles/${cycle.id}`)}
                onStatusChange={(status) => updateStatusMutation.mutate({ id: cycle.id, status })}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">暂无迭代</p>
          <p className="text-xs text-muted-foreground/60 mt-1">创建第一个 2 周 Sprint，开始追踪团队工作进度</p>
          <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => setShowCreate(true)}>
            创建第一个迭代
          </Button>
        </div>
      )}

      {/* 新建迭代弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">新建迭代</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">名称 *</Label>
              <Input
                placeholder="例如：Sprint 1、2025-Q1 迭代..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">描述</Label>
              <Textarea
                placeholder="本次迭代的核心目标是什么？"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">开始日期</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">结束日期</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  description: description || undefined,
                  startDate: new Date(startDate),
                  endDate: new Date(endDate),
                  projectId: currentProjectId,
                })
              }
            >
              {createMutation.isPending ? "创建中..." : "创建迭代"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function CycleCard({
  cycle,
  cfg,
  onView,
  onStatusChange,
}: {
  cycle: any;
  cfg: any;
  onView: () => void;
  onStatusChange: (s: "planned" | "active" | "completed") => void;
}) {
  const { data: stats } = trpc.cycles.stats.useQuery({ cycleId: cycle.id });

  return (
    <div className="card-elegant p-4 hover-lift">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{cycle.name}</h3>
            <Badge className={`text-[10px] h-4 px-1.5 ${cfg.bg} ${cfg.color} border-0`}>
              <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot} mr-1`} />
              {cfg.label}
            </Badge>
          </div>
          {cycle.description && (
            <p className="text-xs text-muted-foreground truncate mb-2">{cycle.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(cycle.startDate), "M月d日", { locale: zhCN })} – {format(new Date(cycle.endDate), "M月d日 yyyy年", { locale: zhCN })}
            </span>
            {stats && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {stats.done}/{stats.total} 已完成
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cycle.status === "planned" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusChange("active")}
            >
              开始
            </Button>
          )}
          {cycle.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => onStatusChange("completed")}
            >
              完成
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={onView}
          >
            查看 <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 进度条 */}
      {stats && stats.total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>已完成 {stats.completionRate}%</span>
            <span>剩余 {stats.total - stats.done} 个</span>
          </div>
          <Progress value={stats.completionRate} className="h-1.5" />
        </div>
      )}
    </div>
  );
}
