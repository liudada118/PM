import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Network,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Link2,
  FileText,
  Clock,
  FolderOpen,
  Download,
  BookOpen,
  GitMerge,
  Workflow,
} from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/contexts/ProjectContext";

type ArchitectureVisualMode = "mindmap" | "hybrid";

export default function ArchitectureOverview() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { currentProjectId, projects: projectList } = useProject();
  const { data: docs, isLoading, error, refetch } = trpc.architecture.listAll.useQuery();
  const createMutation = trpc.architecture.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.architecture.delete.useMutation({ onSuccess: () => refetch() });

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newViewMode, setNewViewMode] = useState<ArchitectureVisualMode>("mindmap");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");

  // Filter docs by search and project
  const filteredDocs = useMemo(() => {
    if (!docs) return [];
    return docs.filter((doc) => {
      const matchSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.projectName && doc.projectName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchProject =
        filterProject === "all" || String(doc.projectId) === filterProject;
      return matchSearch && matchProject;
    });
  }, [docs, searchQuery, filterProject]);

  // Get unique projects from docs for filter
  const docProjects = useMemo(() => {
    if (!docs) return [];
    const map = new Map<number, { id: number; name: string; color: string; icon: string }>();
    docs.forEach((doc) => {
      if (doc.projectId && doc.projectName) {
        map.set(doc.projectId, {
          id: doc.projectId,
          name: doc.projectName,
          color: doc.projectColor ?? "#6366f1",
          icon: doc.projectIcon ?? "📁",
        });
      }
    });
    return Array.from(map.values());
  }, [docs]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const defaultContent = `# ${newTitle.trim()}\n\n## 模块一\n- 子模块 A\n- 子模块 B\n\n## 模块二\n- 子模块 C\n- 子模块 D\n`;
    const projectId = newProjectId ? Number(newProjectId) : (currentProjectId ?? undefined);
    await createMutation.mutateAsync({
      title: newTitle.trim(),
      content: defaultContent,
      projectId,
      viewMode: newViewMode,
    });
    setNewTitle("");
    setNewProjectId("");
    setNewViewMode("mindmap");
    setShowCreate(false);
    toast.success("架构文档已创建");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此架构文档？关联的任务链接也会被清除。")) return;
    await deleteMutation.mutateAsync({ id });
    toast.success("已删除");
  };

  const handleCreateExample = async () => {
    const exampleContent = `# SaaS 平台架构

## 前端层
- Web 应用
  - React SPA
  - 响应式布局
- 移动端
  - iOS App
  - Android App
- 管理后台
  - 用户管理
  - 数据看板
  - 系统配置

## API 网关
- 身份认证
  - JWT Token
  - OAuth 2.0
  - API Key
- 流量控制
  - 限流降级
  - 负载均衡
- 路由分发
  - 版本管理
  - 灰度发布

## 微服务层
- 用户服务
  - 注册登录
  - 权限管理
  - 组织架构
- 订单服务
  - 订单创建
  - 支付集成
  - 发票管理
- 通知服务
  - 邮件通知
  - 站内消息
  - Webhook

## 数据层
- 主数据库
  - MySQL 主从
  - 读写分离
- 缓存
  - Redis Cluster
  - 本地缓存
- 消息队列
  - RabbitMQ
  - 异步任务
- 对象存储
  - S3 兼容
  - CDN 分发

## 基础设施
- 容器编排
  - Kubernetes
  - Docker
- 监控告警
  - Prometheus
  - Grafana
  - PagerDuty
- CI/CD
  - GitHub Actions
  - 自动化测试
  - 蓝绿部署
`;
    const projectId = currentProjectId ?? undefined;
    await createMutation.mutateAsync({
      title: "SaaS 平台架构（示例）",
      content: exampleContent,
      projectId,
      viewMode: "mindmap",
    });
    toast.success("示例架构图已创建，点击卡片查看");
  };

  // Count nodes from markdown content
  const getNodeCount = (content: string | null): number => {
    if (!content) return 0;
    const lines = content.split("\n").filter((l) => l.trim());
    // Count heading lines and list items as nodes
    return lines.filter((l) => /^#{1,6}\s/.test(l) || /^\s*[-*+]\s/.test(l)).length;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded w-32" />
          </div>
          <div className="h-10 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-12 w-12 text-destructive/50 mb-4" />
          <h3 className="text-lg font-medium">加载失败</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            无法获取架构文档列表，请检查网络连接后重试
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            重试
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">架构图总览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看所有项目的架构文档，快速导航到任意架构图
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                示例与工具
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a href="/manus-storage/architecture-format-doc_0d0fe54f.md" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="text-xs font-medium">格式说明文档</div>
                    <div className="text-[10px] text-muted-foreground">查看 Markdown 架构图格式规范</div>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateExample()}>
                <Network className="h-4 w-4" />
                <div>
                  <div className="text-xs font-medium">创建示例架构图</div>
                  <div className="text-[10px] text-muted-foreground">SaaS 平台架构示例</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/manus-storage/architecture-mindmap-skill_2946c0ec.zip" download className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <div>
                    <div className="text-xs font-medium">下载 Skills 文件</div>
                    <div className="text-[10px] text-muted-foreground">用于 AI 助手生成架构图</div>
                  </div>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建架构文档
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Network className="h-4 w-4" />
          共 {docs?.length ?? 0} 个架构文档
        </span>
        <span className="flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4" />
          涉及 {docProjects.length} 个项目
        </span>
        <span className="flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          {docs?.reduce((sum, d) => sum + d.linkedTaskCount, 0) ?? 0} 个关联任务
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索架构文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="筛选项目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {docProjects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.icon} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parent Project Merged Architecture Entry */}
      {(() => {
        // Detect parent projects that have children
        const parentProjects = projectList.filter((p) => {
          if (p.isArchived || p.parentId) return false;
          return projectList.some((c) => c.parentId === p.id && !c.isArchived);
        });
        if (parentProjects.length === 0) return null;
        return (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <GitMerge className="h-3.5 w-3.5" />
              总架构图（合并视图）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {parentProjects.map((parent) => {
                const childCount = projectList.filter((c) => c.parentId === parent.id && !c.isArchived).length;
                return (
                  <Card
                    key={`merged-${parent.id}`}
                    className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group relative border-indigo-200/60 hover:border-indigo-300 bg-gradient-to-br from-indigo-50/50 to-purple-50/30"
                    onClick={() => navigate(`/architecture/merged/${parent.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                        <GitMerge className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{parent.icon} {parent.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          合并 {childCount} 个子项目的架构图
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-indigo-100/60">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        只读
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">自动聚合所有子项目架构</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Doc Grid */}
      {filteredDocs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-12 w-12 text-muted-foreground/50 mb-4" />
          {docs && docs.length > 0 ? (
            <>
              <h3 className="text-lg font-medium">没有匹配的架构文档</h3>
              <p className="text-sm text-muted-foreground mt-1">
                尝试修改搜索条件或清除筛选
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">还没有架构文档</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                创建一个架构文档来可视化你的系统结构
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个架构文档
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const nodeCount = getNodeCount(doc.content);
            return (
              <Card
                key={doc.id}
                className="p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group relative border-border/60 hover:border-indigo-200"
                onClick={() => navigate(`/architecture/${doc.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                      <Network className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{doc.title}</h3>
                        <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal">
                          {doc.viewMode === "hybrid" ? "业务架构" : "软件架构"}
                        </Badge>
                      </div>
                      {doc.projectName ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: doc.projectColor ?? "#6366f1" }}
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            {doc.projectIcon} {doc.projectName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">未关联项目</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/architecture/${doc.id}`);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> 编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> 删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content preview */}
                {doc.content && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                    {doc.content.replace(/[#\-*`]/g, "").trim().slice(0, 120)}
                  </p>
                )}

                {/* Footer stats */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {nodeCount} 节点
                  </span>
                  {doc.linkedTaskCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      {doc.linkedTaskCount} 关联任务
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(doc.updatedAt).toLocaleDateString("zh-CN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建架构文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">文档标题</label>
              <Input
                placeholder="如：系统架构图、微服务拓扑图"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">所属项目</label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择项目（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {projectList?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">默认视图</label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={newViewMode}
                onValueChange={(value) => {
                  if (value) setNewViewMode(value as ArchitectureVisualMode);
                }}
                className="w-full"
              >
                <ToggleGroupItem value="mindmap" aria-label="软件架构">
                  <Network className="h-4 w-4" />
                  软件架构
                </ToggleGroupItem>
                <ToggleGroupItem value="hybrid" aria-label="业务架构">
                  <Workflow className="h-4 w-4" />
                  业务架构
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
