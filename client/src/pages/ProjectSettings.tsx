import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderOpen, Pencil, Archive, RotateCcw, CircleDot, GripVertical, CalendarDays, Users, UserPlus, X, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

const PROJECT_ICONS = ["📁", "🚀", "💡", "🎯", "📊", "🔧", "🌟", "📱", "🎨", "⚡"];

const STATUS_COLUMNS = [
  { id: "planning" as const, label: "规划中", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  { id: "in_progress" as const, label: "进行中", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "completed" as const, label: "已完成", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
];

export default function ProjectSettings() {
  const { projects, refetch } = useProject();
  const { data: projectsProgress } = trpc.dashboard.projectsProgress.useQuery();
  const { data: allUsers } = trpc.auth.allUsers.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [status, setStatus] = useState<"planning" | "in_progress" | "completed">("planning");
  const [deadline, setDeadline] = useState<string>("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [membersProjectId, setMembersProjectId] = useState<number | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<number | null>(null);
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set());

  const handleToggleCollapse = (id: number) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("项目创建成功");
      refetch();
      resetForm();
      setShowCreate(false);
    },
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("项目已更新");
      refetch();
      resetForm();
      setEditingId(null);
      setShowCreate(false);
    },
  });

  const deleteMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("项目已归档");
      refetch();
    },
  });

  const restoreMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("项目已恢复");
      refetch();
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setColor(PROJECT_COLORS[0]);
    setIcon(PROJECT_ICONS[0]);
    setStatus("planning");
    setDeadline("");
    setParentId(null);
    setEditingId(null);
  }

  function startEdit(project: any) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description || "");
    setColor(project.color);
    setIcon(project.icon);
    setStatus(project.status || "planning");
    setDeadline(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");
    setParentId(project.parentId || null);
    setShowCreate(true);
  }

  function handleSubmit() {
    if (!name.trim()) return toast.error("请输入项目名称");
    if (editingId) {
      updateMutation.mutate({ id: editingId, name, description, color, icon, status, deadline: deadline || null, parentId });
    } else {
      createMutation.mutate({ name, description, color, icon, deadline: deadline || null, parentId });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const projectId = active.id as number;
    const newStatus = over.id as "planning" | "in_progress" | "completed";
    const project = activeProjects.find((p) => p.id === projectId);
    if (project && project.status !== newStatus) {
      updateMutation.mutate({ id: projectId, status: newStatus });
    }
  }

  const activeProjects = projects.filter((p) => !p.isArchived);
  const archivedProjects = projects.filter((p) => p.isArchived);
  const draggedProject = activeId ? activeProjects.find((p) => p.id === activeId) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            项目看板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理项目状态与进度</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> 新建项目
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "编辑项目" : "新建项目"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>项目名称</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入项目名称" />
              </div>
              <div className="space-y-2">
                <Label>项目描述</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要描述项目目标和范围" rows={3} />
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label>项目状态</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">规划中</SelectItem>
                      <SelectItem value="in_progress">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>父项目（可选，选择后设为子项目）</Label>
                <Select value={parentId ? String(parentId) : "none"} onValueChange={(v) => setParentId(v === "none" ? null : Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="无（顶层项目）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无（顶层项目）</SelectItem>
                    {projects.filter(p => !p.isArchived && !p.parentId && p.id !== editingId).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.icon} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>截止时间</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="block"
                />
                {deadline && (
                  <button
                    type="button"
                    onClick={() => setDeadline("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    清除截止时间
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Label>图标</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${icon === ic ? "ring-2 ring-primary bg-primary/10 scale-110" : "hover:bg-accent"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "保存修改" : "创建项目"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colProjects = activeProjects.filter((p) => (p.status || "planning") === col.id);
            return (
              <StatusColumn key={col.id} column={col} projects={colProjects} allProjects={activeProjects} projectsProgress={projectsProgress} onEdit={startEdit} onArchive={(id) => setArchiveConfirmId(id)} onMembers={(id) => setMembersProjectId(id)} collapsedParents={collapsedParents} onToggleCollapse={handleToggleCollapse} />
            );
          })}
        </div>
        <DragOverlay>
          {draggedProject && (
            <ProjectCard
              project={draggedProject}
              progress={projectsProgress?.find((p) => p.id === draggedProject.id)}
              onEdit={() => {}}
              onArchive={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Members Management Dialog */}
      {membersProjectId && (
        <ProjectMembersDialog
          projectId={membersProjectId}
          allUsers={allUsers || []}
          onClose={() => setMembersProjectId(null)}
        />
      )}

      {/* Archived */}
      {archivedProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground">已归档项目</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {archivedProjects.map((project) => (
              <Card key={project.id} className="opacity-60 hover:opacity-80 transition-opacity">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{project.icon}</span>
                    <span className="text-sm font-medium">{project.name}</span>
                    <Badge variant="secondary" className="text-[10px]">已归档</Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => restoreMutation.mutate({ id: project.id, isArchived: false })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveConfirmId !== null} onOpenChange={(open: boolean) => { if (!open) setArchiveConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认归档项目</AlertDialogTitle>
            <AlertDialogDescription>
              归档后项目将不再显示在活跃列表中，但可以随时恢复。确定要归档这个项目吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (archiveConfirmId) { deleteMutation.mutate({ id: archiveConfirmId, isArchived: true }); setArchiveConfirmId(null); } }}
            >
              确认归档
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusColumn({
  column,
  projects,
  allProjects,
  projectsProgress,
  onEdit,
  onArchive,
  onMembers,
  collapsedParents,
  onToggleCollapse,
}: {
  column: typeof STATUS_COLUMNS[number];
  projects: any[];
  allProjects: any[];
  projectsProgress: any[] | undefined;
  onEdit: (p: any) => void;
  onArchive: (id: number) => void;
  onMembers?: (id: number) => void;
  collapsedParents: Set<number>;
  onToggleCollapse: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-3 min-h-[400px] transition-colors ${isOver ? column.border + " " + column.bg : "border-transparent bg-muted/30"}`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${column.id === "planning" ? "bg-slate-400" : column.id === "in_progress" ? "bg-blue-500" : "bg-emerald-500"}`} />
        <h3 className={`text-sm font-semibold ${column.color}`}>{column.label}</h3>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">{projects.length}</Badge>
      </div>
      <div className="space-y-3">
        {(() => {
          const parentProjects = projects.filter(p => !p.parentId);
          const childProjects = projects.filter(p => p.parentId);
          const rendered: React.ReactNode[] = [];
          parentProjects.forEach((project) => {
            // 检查该父项目是否有子项目（包括本列和全局）
            const childrenInCol = childProjects.filter(c => c.parentId === project.id);
            const childrenGlobal = allProjects.filter(c => c.parentId === project.id);
            const hasChildren = childrenGlobal.length > 0;
            const isCollapsed = collapsedParents.has(project.id);

            if (hasChildren) {
              rendered.push(
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleCollapse(project.id)}
                      className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {childrenGlobal.length} 个子项目
                    </span>
                  </div>
                  <DraggableProjectCard
                    project={project}
                    progress={projectsProgress?.find((p) => p.id === project.id)}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onMembers={onMembers}
                  />
                  {!isCollapsed && childrenInCol.map((child) => (
                    <div key={child.id} className="ml-6 border-l-2 border-primary/20 pl-2">
                      <DraggableProjectCard
                        project={{ ...child, parentName: project.name }}
                        progress={projectsProgress?.find((p) => p.id === child.id)}
                        onEdit={onEdit}
                        onArchive={onArchive}
                        onMembers={onMembers}
                      />
                    </div>
                  ))}
                </div>
              );
            } else {
              rendered.push(
                <DraggableProjectCard
                  key={project.id}
                  project={project}
                  progress={projectsProgress?.find((p) => p.id === project.id)}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onMembers={onMembers}
                />
              );
            }
          });
          // 没有父项目在本列的孤立子项目（父项目在其他列）
          const orphanChildren = childProjects.filter(c => !parentProjects.some(p => p.id === c.parentId));
          orphanChildren.forEach((child) => {
            const parentName = projects.find(p => p.id === child.parentId)?.name || allProjects?.find((p: any) => p.id === child.parentId)?.name;
            const parentProject = allProjects.find(p => p.id === child.parentId);
            const isParentCollapsed = parentProject ? collapsedParents.has(parentProject.id) : false;
            if (!isParentCollapsed) {
              rendered.push(
                <div key={child.id} className="ml-6 border-l-2 border-primary/20 pl-2">
                  <DraggableProjectCard
                    project={{ ...child, parentName: parentName || undefined }}
                    progress={projectsProgress?.find((p) => p.id === child.id)}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onMembers={onMembers}
                  />
                </div>
              );
            }
          });
          return rendered;
        })()}
        {projects.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground/60">
            拖拽项目到此列
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableProjectCard({ project, progress, onEdit, onArchive, onMembers }: { project: any; progress: any; onEdit: (p: any) => void; onArchive: (id: number) => void; onMembers?: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-40" : ""}>
      <ProjectCard project={project} progress={progress} onEdit={onEdit} onArchive={onArchive} onMembers={onMembers} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function ProjectMembersDialog({
  projectId,
  allUsers,
  onClose,
}: {
  projectId: number;
  allUsers: { id: number; name: string | null; email: string | null }[];
  onClose: () => void;
}) {
  const { data: members, refetch: refetchMembers } = trpc.projects.members.useQuery({ projectId });
  const [searchTerm, setSearchTerm] = useState("");
  const [removeMemberConfirmId, setRemoveMemberConfirmId] = useState<number | null>(null);

  const addMemberMutation = trpc.projects.addMember.useMutation({
    onSuccess: () => {
      toast.success("成员添加成功");
      refetchMembers();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.projects.removeMember.useMutation({
    onSuccess: () => {
      toast.success("成员已移除");
      refetchMembers();
      setRemoveMemberConfirmId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const memberIds = members?.map((m) => m.userId) || [];
  const filteredUsers = allUsers.filter(
    (u) => !memberIds.includes(u.id) && (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            项目成员管理
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Current Members */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">当前成员 ({members?.length || 0})</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {(member.userName || "未知").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{member.userName || "未命名"}</p>
                      <p className="text-[10px] text-muted-foreground">{member.userEmail || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] h-4">
                      {member.role === "owner" ? "创建者" : "成员"}
                    </Badge>
                    {member.role !== "owner" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setRemoveMemberConfirmId(member.userId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Members */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <UserPlus className="h-3 w-3" />
              添加成员
            </Label>
            <Input
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
            {searchTerm && (
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">未找到匹配用户</p>
                ) : (
                  filteredUsers.slice(0, 10).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        addMemberMutation.mutate({ projectId, userId: user.id });
                        setSearchTerm("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px] bg-accent">
                            {(user.name || "?").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{user.name || "未命名"}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email || ""}</p>
                        </div>
                      </div>
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Remove Member Confirmation */}
    <AlertDialog open={removeMemberConfirmId !== null} onOpenChange={(open: boolean) => { if (!open) setRemoveMemberConfirmId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认移除成员</AlertDialogTitle>
          <AlertDialogDescription>
            移除后该成员将无法查看和操作此项目的内容。确定要移除吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (removeMemberConfirmId) removeMemberMutation.mutate({ projectId, userId: removeMemberConfirmId }); }}
          >
            确认移除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function ProjectCard({
  project,
  progress,
  onEdit,
  onArchive,
  onMembers,
  isDragging,
  dragHandleProps,
}: {
  project: any;
  progress: any;
  onEdit: (p: any) => void;
  onArchive: (id: number) => void;
  onMembers?: (id: number) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}) {
  return (
    <Card className={`group hover:shadow-md transition-all ${isDragging ? "shadow-lg rotate-2 scale-105" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {dragHandleProps && (
              <button {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: project.color + "20" }}
            >
              {project.icon}
            </span>
            <span className="font-medium text-sm truncate">{project.name}</span>
            {project.parentId && <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{project.parentName ? `↑ ${project.parentName}` : "子项目"}</Badge>}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMembers?.(project.id)}>
              <Users className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(project)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onArchive(project.id)}>
              <Archive className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{project.description}</p>
        )}
        {project.deadline && (
          <div className="flex items-center gap-1.5 pl-6">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            <span className={`text-[11px] font-medium ${
              new Date(project.deadline) < new Date() ? "text-red-500" :
              new Date(project.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 ? "text-amber-500" :
              "text-muted-foreground"
            }`}>
              {new Date(project.deadline).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
              {new Date(project.deadline) < new Date() && " · 已过期"}
            </span>
          </div>
        )}
        {progress && (
          <div className="space-y-1.5 pl-6">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <CircleDot className="h-2.5 w-2.5" />
                任务进度
              </span>
              <span className="font-medium">
                {progress.doneIssues}/{progress.totalIssues}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress.completionRate} className="h-1.5 flex-1" />
              <span className="text-[10px] font-semibold" style={{ color: project.color }}>
                {progress.completionRate}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
