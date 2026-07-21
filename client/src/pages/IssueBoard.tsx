import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CircleDot,
  Plus,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  MoreHorizontal,
  Trash2,
  Edit3,
  Bug,
  Lightbulb,
  CheckSquare,
  Calendar,
  User,
  FolderOpen,
  FileText,
  Link2,
  X,
  Paperclip,
  Upload,
  Download,
  Network,
  Bell,
  BellPlus,
  Clock,
  GitBranch,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
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
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

const STATUSES = ["Backlog", "Todo", "In Progress", "In Review", "Done"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string; bg: string }> = {
  Backlog: { label: "待办池", color: "text-slate-500", dot: "bg-slate-300", bg: "bg-slate-50" },
  Todo: { label: "待处理", color: "text-violet-600", dot: "bg-violet-400", bg: "bg-violet-50/50" },
  "In Progress": { label: "进行中", color: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50/50" },
  "In Review": { label: "审阅中", color: "text-amber-600", dot: "bg-amber-400", bg: "bg-amber-50/50" },
  Done: { label: "已完成", color: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50/50" },
};

const PRIORITY_CONFIG = {
  urgent: { label: "紧急", icon: Flame, color: "text-red-600" },
  high: { label: "高", icon: ArrowUp, color: "text-orange-500" },
  medium: { label: "中", icon: Minus, color: "text-yellow-500" },
  low: { label: "低", icon: ArrowDown, color: "text-slate-400" },
};

const TYPE_CONFIG = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500", bg: "bg-red-50 text-red-700 border-red-200" },
  feature: { label: "需求", icon: Lightbulb, color: "text-purple-500", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  task: { label: "任务", icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200" },
};

type IssueType = keyof typeof TYPE_CONFIG;

const LABELS = ["缺陷", "功能", "技术债", "设计", "前端", "后端", "移动端", "API"];

const isStatus = (value: unknown): value is Status =>
  typeof value === "string" && (STATUSES as readonly string[]).includes(value);

const resolveDropStatus = (over: DragEndEvent["over"]): Status | null => {
  if (!over) return null;

  const data = over.data.current as { status?: unknown; issue?: { status?: unknown } } | undefined;
  if (isStatus(data?.status)) return data.status;
  if (isStatus(data?.issue?.status)) return data.issue.status;
  if (isStatus(over.id)) return over.id;

  return null;
};

// ─── Droppable Column ────────────────────────────────────────────────────────
function DroppableColumn({ status, children }: { status: Status; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status-${status}`,
    data: { type: "status", status },
  });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[220px] rounded-xl p-2 transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Draggable Card ──────────────────────────────────────────────────────────
function DraggableCard({ issue, children }: { issue: any; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    data: { type: "issue", issue, status: issue.status },
  });
  const style = {
    opacity: isDragging ? 0.3 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

export default function IssueBoard() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [detailIssue, setDetailIssue] = useState<any>(null);
  const [filterType, setFilterType] = useState<IssueType | "all">("all");
  const [filterMine, setFilterMine] = useState(false);
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "task" as IssueType,
    status: "Backlog" as Status,
    priority: "medium" as keyof typeof PRIORITY_CONFIG,
    label: "",
    assigneeId: undefined as number | undefined,
    projectId: undefined as number | undefined,
    dueDate: undefined as string | undefined,
    reminderMinutes: undefined as number[] | undefined,
    notifyUserIds: [] as number[],
  });

  const { currentProjectId, projects } = useProject();
  const { data: issues, isLoading } = trpc.issues.list.useQuery({ projectId: currentProjectId });
  const { data: users } = trpc.auth.allUsers.useQuery();
  const utils = trpc.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const createMutation = trpc.issues.create.useMutation({
    onSuccess: () => {
      utils.issues.list.invalidate();
      toast.success("任务创建成功");
      setShowCreate(false);
      resetForm();
    },
    onError: () => toast.error("创建任务失败"),
  });

  const updateMutation = trpc.issues.update.useMutation({
    onSuccess: () => {
      utils.issues.list.invalidate();
      toast.success("任务已更新");
      setEditingIssue(null);
    },
    onError: () => toast.error("更新任务失败"),
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const deleteMutation = trpc.issues.delete.useMutation({
    onSuccess: () => {
      utils.issues.list.invalidate();
      toast.success("任务已删除");
      setDeleteConfirmId(null);
    },
  });

  const syncSubscribersMutation = trpc.issues.syncSubscribers.useMutation({
    onError: () => { /* ignore sync errors */ },
  });

  const updateStatusMutation = trpc.issues.update.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.issues.list.cancel();
      const prev = utils.issues.list.getData({ projectId: currentProjectId });
      utils.issues.list.setData({ projectId: currentProjectId }, (old) =>
        old?.map((i) => (i.id === id ? { ...i, status: status! } : i))
      );
      return { prev };
    },
    onError: (error, __, ctx) => {
      if (ctx?.prev) utils.issues.list.setData({ projectId: currentProjectId }, ctx.prev);
      toast.error(error.message || "移动任务失败");
    },
    onSettled: () => utils.issues.list.invalidate(),
  });

  const resetForm = () =>
    setForm({ title: "", description: "", type: "task", status: "Backlog", priority: "medium", label: "", assigneeId: undefined, projectId: undefined, dueDate: undefined, reminderMinutes: undefined, notifyUserIds: [] });

  // 按类型过滤
  const filteredIssues = useMemo(() => {
    let result = issues ?? [];
    if (filterType !== "all") result = result.filter((i) => i.type === filterType);
    if (filterMine && user) {
      result = result.filter(
        (i) =>
          i.assigneeId === user.id ||
          i.authorId === user.id ||
          (i.status === "In Review" && i.originalAssigneeId === user.id)
      );
    }
    return result;
  }, [issues, filterType, filterMine, user]);

  const grouped = useMemo(
    () =>
      STATUSES.reduce((acc, status) => {
        acc[status] = filteredIssues?.filter((i) => i.status === status) ?? [];
        return acc;
      }, {} as Record<Status, any[]>),
    [filteredIssues]
  );

  const getUserName = (id?: number | null) => {
    if (!id) return null;
    return users?.find((u) => u.id === id)?.name ?? null;
  };

  const typeCounts = {
    all: issues?.length ?? 0,
    bug: issues?.filter((i) => i.type === "bug").length ?? 0,
    feature: issues?.filter((i) => i.type === "feature").length ?? 0,
    task: issues?.filter((i) => i.type === "task").length ?? 0,
  };

  // ─── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const issueId = active.id as number;
    const newStatus = resolveDropStatus(over);
    if (!newStatus) return;
    const issue = issues?.find((i) => i.id === issueId);
    if (issue && issue.status !== newStatus) {
      updateStatusMutation.mutate({ id: issueId, status: newStatus });
    }
  };

  const activeIssue = activeId ? issues?.find((i) => i.id === activeId) : null;

  return (
    <div className="page-enter">
      <PageHeader>
        <div className="flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">任务看板</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">共 {issues?.length ?? 0} 个任务</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            新建任务
          </Button>
        </div>
      </PageHeader>
      <div className="p-6 space-y-4">
        {/* 类型筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            全部 <span className="ml-1 opacity-70">{typeCounts.all}</span>
          </button>
          {(Object.entries(TYPE_CONFIG) as [IssueType, typeof TYPE_CONFIG.bug][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterType === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
                <span className="opacity-70">{typeCounts[key]}</span>
              </button>
            );
          })}
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={() => setFilterMine(!filterMine)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterMine
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <User className="h-3 w-3" />
            我的任务
          </button>
        </div>

        {/* 看板 with DnD */}
        {isLoading ? (
          <div className="grid grid-cols-5 gap-4">
            {STATUSES.map((s) => (
              <div key={s} className="space-y-2">
                <Skeleton className="h-6 w-24" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
              {STATUSES.map((status) => {
                const cfg = STATUS_CONFIG[status];
                const columnIssues = grouped[status];
                return (
                  <DroppableColumn key={status} status={status}>
                    {/* 列头 */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto bg-muted rounded-full px-1.5 py-0.5">
                        {columnIssues.length}
                      </span>
                    </div>

                    {/* 任务卡片 */}
                    <div className="space-y-2">
                      {columnIssues.map((issue: any) => (
                        <DraggableCard key={issue.id} issue={issue}>
                          <IssueCard
                            issue={issue}
                            currentProjectId={currentProjectId}
                            getUserName={getUserName}
                            onEdit={async () => {
                              setEditingIssue(issue);
                              // Load existing subscribers for this issue
                              let existingNotifyIds: number[] = [];
                              try {
                                const subs = await utils.issues.getSubscribers.fetch({ issueId: issue.id });
                                existingNotifyIds = (subs || []).map((s: any) => s.userId);
                              } catch { /* ignore */ }
                              setForm({
                                title: issue.title,
                                description: issue.description ?? "",
                                type: (issue.type as IssueType) || "task",
                                status: issue.status as Status,
                                priority: issue.priority as any,
                                label: issue.label ?? "",
                                assigneeId: issue.assigneeId ?? undefined,
                                projectId: issue.projectId ?? undefined,
                                dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString().split("T")[0] : undefined,
                                reminderMinutes: issue.reminderMinutes ? JSON.parse(issue.reminderMinutes) : undefined,
                                notifyUserIds: existingNotifyIds,
                              });
                            }}
                            onDelete={() => setDeleteConfirmId(issue.id)}
                            onStatusChange={(s) => updateStatusMutation.mutate({ id: issue.id, status: s })}
                            onClick={() => setDetailIssue(issue)}
                          />
                        </DraggableCard>
                      ))}

                      {/* 添加任务按钮 */}
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, status }));
                          setShowCreate(true);
                        }}
                        className="w-full p-2 rounded-xl border border-dashed border-border/50 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        添加任务
                      </button>
                    </div>
                  </DroppableColumn>
                );
              })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeIssue ? (
                <div className="p-3 rounded-xl border border-primary/30 bg-background shadow-lg w-[220px] opacity-90">
                  <p className="text-xs font-medium truncate">{activeIssue.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* 创建/编辑弹窗 */}
        <IssueFormDialog
          open={showCreate || !!editingIssue}
          onClose={() => { setShowCreate(false); setEditingIssue(null); resetForm(); }}
          form={form}
          setForm={setForm}
          users={users ?? []}
          projects={projects}
          currentProjectId={currentProjectId}
          onSubmit={() => {
            if (editingIssue) {
              updateMutation.mutate({
                id: editingIssue.id,
                ...form,
                dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
                reminderMinutes: form.reminderMinutes ? JSON.stringify(form.reminderMinutes) : undefined,
              } as any, {
                onSuccess: () => {
                  // Sync subscribers using dedicated backend route
                  syncSubscribersMutation.mutate({ issueId: editingIssue.id, userIds: form.notifyUserIds || [] });
                }
              });
            } else {
              const projectId = form.projectId ?? currentProjectId;
              if (!projectId) {
                toast.error("请选择所属项目");
                return;
              }
              createMutation.mutate({
                ...form,
                projectId,
                dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
                reminderMinutes: form.reminderMinutes ? JSON.stringify(form.reminderMinutes) : undefined,
              } as any, {
                onSuccess: (newIssue: any) => {
                  if (form.notifyUserIds.length > 0 && newIssue?.id) {
                    syncSubscribersMutation.mutate({ issueId: newIssue.id, userIds: form.notifyUserIds });
                  }
                }
              });
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
          isEdit={!!editingIssue}
        />

        {/* 任务详情侧滑面板 */}
        <IssueDetailSheet
          issue={detailIssue}
          open={!!detailIssue}
          onClose={() => setDetailIssue(null)}
          getUserName={getUserName}
          allUsers={users as any}
          onEdit={async () => {
            if (detailIssue) {
              setEditingIssue(detailIssue);
              // Load existing subscribers for this issue
              let existingNotifyIds: number[] = [];
              try {
                const subs = await utils.issues.getSubscribers.fetch({ issueId: detailIssue.id });
                existingNotifyIds = (subs || []).map((s: any) => s.userId);
              } catch { /* ignore */ }
              setForm({
                title: detailIssue.title,
                description: detailIssue.description ?? "",
                type: (detailIssue.type as IssueType) || "task",
                status: detailIssue.status as Status,
                priority: detailIssue.priority as any,
                label: detailIssue.label ?? "",
                assigneeId: detailIssue.assigneeId ?? undefined,
                projectId: detailIssue.projectId ?? undefined,
                dueDate: detailIssue.dueDate ? new Date(detailIssue.dueDate).toISOString().split("T")[0] : undefined,
                reminderMinutes: detailIssue.reminderMinutes ? JSON.parse(detailIssue.reminderMinutes) : undefined,
                notifyUserIds: existingNotifyIds,
              });
              setDetailIssue(null);
            }
          }}
        />
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open: boolean) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，删除后任务将永久丢失。确定要删除这个任务吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirmId) deleteMutation.mutate({ id: deleteConfirmId }); }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
// ─── Issue Card Component ────────────────────────────────────────────────────
function IssueCard({
  issue,
  currentProjectId,
  getUserName,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
}: {
  issue: any;
  currentProjectId: number | null;
  getUserName: (id?: number | null) => string | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Status) => void;
  onClick: () => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[issue.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityCfg.icon;
  const typeCfg = TYPE_CONFIG[(issue.type as IssueType) || "task"];
  const TypeIcon = typeCfg.icon;
  const assigneeName = getUserName(issue.assigneeId);
  const statusCfg = STATUS_CONFIG[issue.status as Status] || STATUS_CONFIG.Backlog;

  return (
    <div
      className={`p-3 rounded-xl border border-border/50 ${statusCfg.bg} hover:border-primary/30 transition-all hover-lift group cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TypeIcon className={`h-3.5 w-3.5 shrink-0 ${typeCfg.color}`} />
          <p className="text-xs font-medium leading-snug truncate">{issue.title}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 text-xs">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit3 className="mr-2 h-3 w-3" /> 编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUSES.filter((s) => s !== issue.status).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={(e) => { e.stopPropagation(); onStatusChange(s); }}
              >
                <div className={`mr-2 h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                移至 {STATUS_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="mr-2 h-3 w-3" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 border ${typeCfg.bg}`}>
          {typeCfg.label}
        </Badge>
        <div className={`flex items-center gap-0.5 ${priorityCfg.color}`}>
          <PriorityIcon className="h-3 w-3" />
        </div>
        {issue.label && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-background/80">
            {issue.label}
          </Badge>
        )}
        {/* 全部项目视图下显示项目标签 */}
        {!currentProjectId && issue.projectName && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1.5 border gap-1"
            style={{ borderColor: issue.projectColor + "60", color: issue.projectColor }}
          >
            <FolderOpen className="h-2.5 w-2.5" />
            {issue.projectName}
          </Badge>
        )}
        {assigneeName && (
          <Avatar className="h-4 w-4 ml-auto">
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
              {assigneeName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

// ─── Issue Detail Sheet ──────────────────────────────────────────────────────
function IssueDetailSheet({
  issue,
  open,
  onClose,
  getUserName,
  onEdit,
  allUsers,
}: {
  issue: any;
  open: boolean;
  onClose: () => void;
  getUserName: (id?: number | null) => string | null;
  onEdit: () => void;
  allUsers?: { id: number; name: string | null }[];
}) {
  const [, navigate] = useLocation();
  // Fetch linked docs, features, and architecture nodes
  const { data: docLinks } = trpc.issues.getDocLinks.useQuery(
    { issueId: issue?.id },
    { enabled: !!issue }
  );
  const { data: featureLinks } = trpc.issues.getFeatureLinks.useQuery(
    { issueId: issue?.id },
    { enabled: !!issue }
  );
  const { data: archLinks } = trpc.architecture.getIssueLinks.useQuery(
    { issueId: issue?.id },
    { enabled: !!issue }
  );
  // Fetch children of linked architecture node (for parent nodes)
  const firstArchLink = archLinks && archLinks.length > 0 ? archLinks[0] : null;
  const { data: nodeChildren } = trpc.architecture.getNodeChildren.useQuery(
    { archDocId: firstArchLink?.archDocId!, nodePath: firstArchLink?.nodePath! },
    { enabled: !!firstArchLink }
  );

  const { data: subscribers, refetch: refetchSubscribers } = trpc.issues.getSubscribers.useQuery(
    { issueId: issue?.id },
    { enabled: !!issue }
  );
  const addSubscriberMutation = trpc.issues.addSubscriber.useMutation({ onSuccess: () => refetchSubscribers() });
  const removeSubscriberMutation = trpc.issues.removeSubscriber.useMutation({ onSuccess: () => refetchSubscribers() });

  if (!issue) return null;

  const typeCfg = TYPE_CONFIG[(issue.type as IssueType) || "task"];
  const TypeIcon = typeCfg.icon;
  const priorityCfg = PRIORITY_CONFIG[issue.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityCfg.icon;
  const statusCfg = STATUS_CONFIG[issue.status as Status] || STATUS_CONFIG.Backlog;
  const assigneeName = getUserName(issue.assigneeId);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] h-5 px-2 border ${typeCfg.bg}`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeCfg.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 px-2">
                  <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusCfg.dot}`} />
                  {statusCfg.label}
                </Badge>
              </div>
              <SheetTitle className="text-lg font-semibold leading-tight">{issue.title}</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {/* 描述 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">描述</h4>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 min-h-[60px]">
              {issue.description || "暂无描述"}
            </div>
          </div>

          {/* 子节点列表（当关联了架构图父级节点时展示） */}
          {nodeChildren && nodeChildren.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" /> 子节点 ({nodeChildren.length})
              </h4>
              <ol className="bg-muted/30 rounded-lg p-3 pl-7 space-y-1 list-decimal">
                {nodeChildren.map((child: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground">
                    {child}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <Separator />

          {/* 属性 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">属性</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5" /> 状态
                </span>
                <Badge variant="outline" className="text-[10px] h-5 px-2">
                  <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusCfg.dot}`} />
                  {statusCfg.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" /> 优先级
                </span>
                <div className={`flex items-center gap-1 text-xs font-medium ${priorityCfg.color}`}>
                  <PriorityIcon className="h-3.5 w-3.5" />
                  {priorityCfg.label}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> 指派人
                </span>
                <span className="text-xs font-medium">
                  {assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {assigneeName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {assigneeName}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">未指派</span>
                  )}
                </span>
              </div>
              {issue.label && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" /> 标签
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">{issue.label}</Badge>
                </div>
              )}
              {issue.projectName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" /> 所属项目
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-2 gap-1"
                    style={{ borderColor: issue.projectColor + "60", color: issue.projectColor }}
                  >
                    {issue.projectName}
                  </Badge>
                </div>
              )}
              {issue.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> 截止日期
                  </span>
                  <span className="text-xs font-medium">
                    {new Date(issue.dueDate).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> 创建时间
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(issue.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 完成通知设置 */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" /> 完成通知
            </h4>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 mb-2">任务完成时将通过飞书通知以下成员</p>
            {subscribers && subscribers.length > 0 ? (
              <div className="space-y-1.5 mb-2">
                {subscribers.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/60 dark:bg-background/40">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-amber-100 text-amber-700">
                          {(sub.userName || "未知").slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{sub.userName || "未命名"}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => removeSubscriberMutation.mutate({ issueId: issue.id, userId: sub.userId })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600/60 italic mb-2">暂无订阅者，点击下方按钮添加</p>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100">
                  <BellPlus className="h-3 w-3" /> 添加通知对象
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto">
                {allUsers?.filter(u => !subscribers?.some((s: any) => s.userId === u.id)).map(u => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => addSubscriberMutation.mutate({ issueId: issue.id, userId: u.id })}
                    className="text-xs"
                  >
                    {u.name || `用户 #${u.id}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          {/* 关联文档 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 关联文档
            </h4>
            {docLinks && docLinks.length > 0 ? (
              <div className="space-y-1.5">
                {docLinks.map((link: any) => (
                  <a
                    key={link.id}
                    href={`/wiki/${link.docId}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs hover:bg-muted/60 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{link.docTitle || `文档 #${link.docId}`}</span>
                    {link.docCategory && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto">{link.docCategory}</Badge>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">暂无关联文档</p>
            )}
          </div>

          {/* 关联架构节点 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" /> 关联架构
            </h4>
            {archLinks && archLinks.length > 0 ? (
              <div className="space-y-1.5">
                {archLinks.map((link: any) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      onClose();
                      navigate(`/architecture/${link.archDocId}?node=${encodeURIComponent(link.nodePath)}`);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50/50 text-xs hover:bg-indigo-100/60 transition-colors text-left"
                  >
                    <Network className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{link.nodePath}</span>
                      <span className="text-[10px] text-muted-foreground">{link.archDocTitle || `架构图 #${link.archDocId}`}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">暂无关联架构节点</p>
            )}
          </div>

          {/* 关联需求 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> 关联需求
            </h4>
            {featureLinks && featureLinks.length > 0 ? (
              <div className="space-y-1.5">
                {featureLinks.map((link: any) => (
                  <div key={link.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 text-purple-500" />
                    <span className="font-medium">{link.featureTitle || `需求 #${link.featureRequestId}`}</span>
                    {link.featureStatus && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto">{link.featureStatus}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">暂无关联需求</p>
            )}
          </div>

          <Separator />

          {/* 文件附件 */}
          <IssueAttachments issueId={issue.id} projectId={issue.projectId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Issue Attachments ───────────────────────────────────────────────────────
function IssueAttachments({ issueId, projectId }: { issueId: number; projectId?: number | null }) {
  const { data: attachmentsList, refetch } = trpc.attachments.listByIssue.useQuery({ issueId });
  const uploadMutation = trpc.attachments.upload.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.attachments.delete.useMutation({ onSuccess: () => refetch() });
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ id: number; url: string; fileName: string; mimeType: string | null } | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(",")[1] || "";
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        await uploadMutation.mutateAsync({
          issueId,
          projectId: projectId ?? undefined,
          fileName: file.name,
          fileData: base64,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
        toast.success(`文件 "${file.name}" 上传成功`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("文件上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await uploadFiles(files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPreviewable = (mimeType: string | null, fileName: string) => {
    if (!mimeType) {
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      return ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "txt", "md", "json", "csv"].includes(ext);
    }
    return mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("text/");
  };

  const getPreviewType = (mimeType: string | null, fileName: string): "image" | "pdf" | "text" | "none" => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
    if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
    if (mimeType?.startsWith("text/") || ["txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts"].includes(ext)) return "text";
    return "none";
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" /> 文件附件
      </h4>
      {/* 拖拽上传区域 */}
      <label
        className={`flex flex-col items-center justify-center gap-1 px-3 py-4 rounded-lg border-2 border-dashed text-xs cursor-pointer transition-all duration-200 mb-2 ${
          isDragOver
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600"
            : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className={`h-4 w-4 ${isDragOver ? "text-blue-500" : ""}`} />
        <span>{uploading ? "上传中..." : isDragOver ? "松开以上传文件" : "点击或拖拽文件到此处上传"}</span>
        <input type="file" multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
      </label>
      {attachmentsList && attachmentsList.length > 0 ? (
        <div className="space-y-1.5">
          {attachmentsList.map((att: any) => (
            <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs group">
              <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <button
                onClick={() => {
                  if (isPreviewable(att.mimeType, att.fileName)) {
                    setPreviewFile({ id: att.id, url: att.url, fileName: att.fileName, mimeType: att.mimeType });
                  } else {
                    window.open(att.url, "_blank");
                  }
                }}
                className="font-medium truncate flex-1 text-left hover:underline hover:text-blue-600 transition-colors"
              >
                {att.fileName}
              </button>
              {att.fileSize && (
                <span className="text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
              )}
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="下载">
                <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
              <button
                onClick={() => deleteMutation.mutate({ id: att.id })}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">暂无附件</p>
      )}

      {/* 文件预览弹窗 */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {previewFile.fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto min-h-0">
              {getPreviewType(previewFile.mimeType, previewFile.fileName) === "image" && (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewFile.url}
                    alt={previewFile.fileName}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
              {getPreviewType(previewFile.mimeType, previewFile.fileName) === "pdf" && (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[65vh] rounded-lg border"
                  title={previewFile.fileName}
                />
              )}
              {getPreviewType(previewFile.mimeType, previewFile.fileName) === "text" && (
                <TextFilePreview attachmentId={previewFile.id} />
              )}
              {getPreviewType(previewFile.mimeType, previewFile.fileName) === "none" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                  <FileText className="h-12 w-12" />
                  <p className="text-sm">该文件类型不支持在线预览</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> 下载文件
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Text File Preview ──────────────────────────────────────────────────────
function TextFilePreview({ attachmentId }: { attachmentId: number }) {
  const { data, isLoading, error } = trpc.attachments.preview.useQuery({ id: attachmentId });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">加载中...</div>;
  if (error) return <div className="p-4 text-sm text-destructive">无法加载文件内容</div>;
  return (
    <pre className="p-4 bg-muted/30 rounded-lg text-xs font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
      {data?.content}
    </pre>
  );
}

// ─── Issue Form Dialog ───────────────────────────────────────────────────────
function IssueFormDialog({
  open,
  onClose,
  form,
  setForm,
  users,
  projects,
  currentProjectId,
  onSubmit,
  isLoading,
  isEdit,
}: {
  open: boolean;
  onClose: () => void;
  form: any;
  setForm: (f: any) => void;
  users: any[];
  projects: any[];
  currentProjectId: number | null;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{isEdit ? "编辑任务" : "新建任务"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* 项目选择器（新建时必填） */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">所属项目 *</Label>
              <Select
                value={form.projectId ? String(form.projectId) : (currentProjectId ? String(currentProjectId) : "")}
                onValueChange={(v: any) => setForm({ ...form, projectId: parseInt(v) })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="请选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">标题 *</Label>
            <Input
              placeholder="任务标题..."
              value={form.title}
              onChange={(e: any) => setForm({ ...form, title: e.target.value })}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">描述</Label>
            <Textarea
              placeholder="描述任务详情..."
              value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          {/* 类型选择 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">类型</Label>
            <div className="flex gap-2">
              {(Object.entries(TYPE_CONFIG) as [IssueType, typeof TYPE_CONFIG.bug][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, type: key })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.type === key
                        ? `${cfg.bg} border-current`
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">状态</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                        {STATUS_CONFIG[s].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">优先级</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-sm">
                        <div className={`flex items-center gap-2 ${cfg.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">标签</Label>
              <Select value={form.label || "none"} onValueChange={(v: any) => setForm({ ...form, label: v === "none" ? "" : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="无标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">无标签</SelectItem>
                  {LABELS.map((l) => (
                    <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">指派人</Label>
              <Select
                value={form.assigneeId ? String(form.assigneeId) : "none"}
                onValueChange={(v: any) => setForm({ ...form, assigneeId: v === "none" ? undefined : parseInt(v) })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="未指派" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">未指派</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 截止日期和提醒设置 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> 截止日期
              </Label>
              <Input
                type="date"
                value={form.dueDate || ""}
                onChange={(e: any) => setForm({ ...form, dueDate: e.target.value || undefined })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> 到期提醒
              </Label>
              <Select
                value={form.reminderMinutes?.join(",") || "none"}
                onValueChange={(v: any) => {
                  if (v === "none") setForm({ ...form, reminderMinutes: undefined });
                  else setForm({ ...form, reminderMinutes: v.split(",").map(Number) });
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="不提醒" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">不提醒</SelectItem>
                  <SelectItem value="60" className="text-sm">提前 1 小时</SelectItem>
                  <SelectItem value="1440" className="text-sm">提前 1 天</SelectItem>
                  <SelectItem value="60,1440" className="text-sm">提前 1 小时 + 1 天</SelectItem>
                  <SelectItem value="30" className="text-sm">提前 30 分钟</SelectItem>
                  <SelectItem value="30,1440" className="text-sm">提前 30 分钟 + 1 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 完成通知对象 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Bell className="h-3 w-3" /> 完成通知
            </Label>
            <p className="text-[10px] text-muted-foreground">任务完成时将通过飞书通知选中的成员</p>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/30 min-h-[36px]">
              {(form.notifyUserIds || []).length > 0 ? (
                (form.notifyUserIds || []).map((uid: number) => {
                  const u = users.find((x: any) => x.id === uid);
                  return (
                    <Badge key={uid} variant="secondary" className="text-xs gap-1 pr-1">
                      {u?.name || `用户#${uid}`}
                      <button
                        type="button"
                        className="ml-0.5 hover:text-destructive"
                        onClick={() => setForm({ ...form, notifyUserIds: (form.notifyUserIds || []).filter((id: number) => id !== uid) })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })
              ) : (
                <span className="text-xs text-muted-foreground italic">点击下方添加通知对象</span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <BellPlus className="h-3 w-3" /> 添加通知对象
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto">
                {users.filter((u: any) => !(form.notifyUserIds || []).includes(u.id)).map((u: any) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => setForm({ ...form, notifyUserIds: [...(form.notifyUserIds || []), u.id] })}
                    className="text-xs"
                  >
                    {u.name || `用户 #${u.id}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" disabled={!form.title.trim() || (!isEdit && !form.projectId && !currentProjectId) || isLoading} onClick={onSubmit}>
            {isLoading ? "保存中..." : isEdit ? "保存修改" : "创建任务"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
