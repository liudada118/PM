import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Network,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  Save,
  CircleDot,
  Link2,
  Unlink,
  X,
  PlusCircle,
  GitBranch,
  Code2,
  Image as ImageIcon,
  History,
  RotateCcw,
  Clock,
  Eye,
} from "lucide-react";
import { useLocation } from "wouter";
import { MarkmapView, type MarkmapActions } from "./ArchitectureMarkmap";
import { VisualFlowEditor } from "@/components/VisualFlowEditor";
import { useProject } from "@/contexts/ProjectContext";

// ─── Status Config (matches IssueBoard) ─────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  Backlog: { label: "待办池", color: "text-slate-500", dot: "bg-slate-300", bg: "bg-slate-50" },
  Todo: { label: "待处理", color: "text-violet-600", dot: "bg-violet-400", bg: "bg-violet-50/50" },
  "In Progress": { label: "进行中", color: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50/50" },
  "In Review": { label: "审阅中", color: "text-amber-600", dot: "bg-amber-400", bg: "bg-amber-50/50" },
  Done: { label: "已完成", color: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50/50" },
};

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "紧急" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const TYPE_OPTIONS = [
  { value: "task", label: "任务" },
  { value: "feature", label: "需求" },
  { value: "bug", label: "Bug" },
];

const LABEL_OPTIONS = ["缺陷", "功能", "技术债", "设计", "前端", "后端", "移动端", "API"];

function getDefaultFlowchart(nodeName: string): string {
  return `flowchart TD
  start["${nodeName} 开始"] --> step1["步骤1"]
  step1 --> step2["步骤2"]
  step2 --> finish["完成"]
`;
}

// ─── Architecture List Page ──────────────────────────────────────────────────
export default function Architecture() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { currentProjectId } = useProject();
  const { data: docs, isLoading, refetch } = trpc.architecture.list.useQuery({ projectId: currentProjectId ?? undefined });
  const createMutation = trpc.architecture.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.architecture.delete.useMutation({ onSuccess: () => refetch() });

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const defaultContent = `# ${newTitle.trim()}\n\n## 模块一\n- 子模块 A\n- 子模块 B\n\n## 模块二\n- 子模块 C\n- 子模块 D\n`;
    await createMutation.mutateAsync({ title: newTitle.trim(), content: defaultContent, projectId: currentProjectId ?? undefined });
    setNewTitle("");
    setShowCreate(false);
    toast.success("架构文档已创建");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此架构文档？关联的任务链接也会被清除。")) return;
    await deleteMutation.mutateAsync({ id });
    toast.success("已删除");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">架构图</h1>
          <p className="text-sm text-muted-foreground mt-1">管理项目系统架构，可视化模块关系</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建架构文档
        </Button>
      </div>

      {(!docs || docs.length === 0) ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">还没有架构文档</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            创建一个架构文档来可视化你的系统结构
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建第一个架构文档
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              className="p-5 hover:shadow-md transition-shadow cursor-pointer group relative"
              onClick={() => navigate(`/architecture/${doc.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Network className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      更新于 {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/architecture/${doc.id}`); }}>
                      <Pencil className="h-4 w-4 mr-2" /> 编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> 删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {doc.content && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                  {doc.content.replace(/[#\-*`]/g, "").slice(0, 100)}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建架构文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="架构文档标题，如：系统架构图"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Architecture Editor Page ────────────────────────────────────────────────
export function ArchitectureEditor({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { data: doc, isLoading, refetch } = trpc.architecture.get.useQuery({ id });
  const { data: nodeIssues } = trpc.architecture.getNodeIssues.useQuery({ archDocId: id });
  const updateMutation = trpc.architecture.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditContent(null);
      setEditTitle(null);
      setHasChanges(false);
      toast.success("已保存");
    },
  });

  // Parse URL query param for node highlight (from issue link)
  const urlNode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("node") ? decodeURIComponent(params.get("node")!) : null;
  }, []);

  const markmapRef = useRef<MarkmapActions>(null);
  const [viewMode, setViewMode] = useState<"mindmap" | "markdown">("mindmap");
  const [editContent, setEditContent] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(urlNode);

  // Dialog states
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<number | null>(null);
  const [taskCreateMode, setTaskCreateMode] = useState<"parent" | "children">("parent");
  // showFlowchartEditor removed - flowchart now opens inline via flowchartView

  // Flowchart state: when a node has a flowchart, clicking it enters flowchart view
  const [flowchartView, setFlowchartView] = useState<{ nodePath: string; content: string } | null>(null);
  const [flowchartSelectedNode, setFlowchartSelectedNode] = useState<string | null>(null);


  const utils = trpc.useUtils();

  // Query versions for this doc
  const { data: versions } = trpc.architecture.listVersions.useQuery({ archDocId: id });
  const { data: previewVersion } = trpc.architecture.getVersionContent.useQuery(
    { versionId: previewVersionId! },
    { enabled: !!previewVersionId }
  );
  const createVersionMutation = trpc.architecture.createVersion.useMutation({
    onSuccess: () => {
      utils.architecture.listVersions.invalidate({ archDocId: id });
    },
  });
  const restoreVersionMutation = trpc.architecture.restoreVersion.useMutation({
    onSuccess: () => {
      refetch();
      utils.architecture.listVersions.invalidate({ archDocId: id });
      setPreviewVersionId(null);
      setShowVersionPanel(false);
      setEditContent(null);
      setEditTitle(null);
      toast.success("已恢复到指定版本");
    },
    onError: () => toast.error("恢复失败"),
  });

  // Query flowcharts for this doc
  const { data: flowchartList } = trpc.architecture.listFlowcharts.useQuery({ archDocId: id });

  const flowchartNodePaths = useMemo(() => new Set(flowchartList?.map((f: any) => f.nodePath) || []), [flowchartList]);

  const saveFlowchartMutation = trpc.architecture.saveFlowchart.useMutation({
    onSuccess: () => {
      utils.architecture.listFlowcharts.invalidate({ archDocId: id });
      toast.success("流程图已保存");
    },
    onError: () => toast.error("保存流程图失败"),
  });
  const deleteFlowchartMutation = trpc.architecture.deleteFlowchart.useMutation({
    onSuccess: () => {
      utils.architecture.listFlowcharts.invalidate({ archDocId: id });
      toast.success("流程图已删除");
      setFlowchartView(null);
    },
  });

  // ─── Node image upload ───────────────────────────────────────────────────
  const nodeImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingNodeImage, setIsUploadingNodeImage] = useState(false);

  const uploadNodeImageMutation = trpc.attachments.upload.useMutation({
    onSuccess: (data) => {
      // Load image to get dimensions, then set on node
      const img = new window.Image();
      img.onload = () => {
        markmapRef.current?.setNodeImage(data.url, data.fileName, img.naturalWidth, img.naturalHeight);
        toast.success("图片已插入节点");
      };
      img.onerror = () => {
        markmapRef.current?.setNodeImage(data.url, data.fileName, 150, 100);
        toast.success("图片已插入节点");
      };
      img.src = data.url;
      setIsUploadingNodeImage(false);
    },
    onError: () => {
      setIsUploadingNodeImage(false);
      toast.error("图片上传失败");
    },
  });

  const handleNodeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过 10MB");
      return;
    }
    setIsUploadingNodeImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadNodeImageMutation.mutate({
        projectId: doc?.projectId ?? currentProjectId ?? undefined,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    if (nodeImageInputRef.current) nodeImageInputRef.current.value = "";
  };

  // New task form
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    description: "",
    type: "task" as string,
    status: "Backlog" as string,
    priority: "medium" as string,
    label: "" as string,
    assigneeId: undefined as number | undefined,
  });

  // Initialize edit state when doc loads
  const content = editContent ?? doc?.content ?? "";
  const title = editTitle ?? doc?.title ?? "";

  // Extract inline mermaid blocks from content to identify nodes with embedded flowcharts
  const inlineMermaidNodes = useMemo(() => {
    const nodes = new Map<string, string>(); // nodePath -> mermaidContent
    const lines = content.split("\n");
    let idx = 0;
    while (idx < lines.length) {
      if (lines[idx].trim() === "```mermaid") {
        const start = idx;
        idx++;
        let mermaidContent = "";
        while (idx < lines.length && lines[idx].trim() !== "```") {
          mermaidContent += lines[idx] + "\n";
          idx++;
        }
        if (idx < lines.length) idx++; // skip closing ```
        // Find the last heading before this mermaid block
        for (let j = start - 1; j >= 0; j--) {
          const hMatch = lines[j].match(/^#{1,6}\s+(.+)$/);
          if (hMatch) {
            nodes.set(hMatch[1].trim(), mermaidContent.trim());
            break;
          }
        }
      } else {
        idx++;
      }
    }
    return nodes;
  }, [content]);

  // Merge DB-stored flowcharts with inline mermaid nodes
  const allFlowchartNodePaths = useMemo(() => {
    const paths = new Set(flowchartNodePaths);
    inlineMermaidNodes.forEach((_val, key) => {
      paths.add(key);
    });
        return paths;
  }, [flowchartNodePaths, inlineMermaidNodes]);
  const { currentProjectId, projects } = useProject();

  // ─── Parent project detection: auto-create sub-project when new ## node added ───
  const docProjectId = doc?.projectId ?? currentProjectId;
  // Any top-level project (no parentId) can create sub-projects from mindmap nodes
  const isParentProject = useMemo(() => {
    if (!docProjectId) return false;
    const proj = projects.find((p: any) => p.id === docProjectId);
    if (!proj || proj.parentId !== null) return false; // must be top-level
    return true; // All top-level projects can create sub-projects
  }, [docProjectId, projects]);

  const prevSecondLevelNodesRef = useRef<Set<string>>(new Set());

  // Helper: extract second-level (##) headings from markdown
  const extractSecondLevelNodes = useCallback((md: string): Set<string> => {
    const nodes = new Set<string>();
    const lines = md.split("\n");
    for (const line of lines) {
      const match = line.match(/^##\s+(.+)$/);
      if (match) nodes.add(match[1].trim());
    }
    return nodes;
  }, []);

  // Initialize previous nodes from doc content
  useEffect(() => {
    if (doc?.content) {
      prevSecondLevelNodesRef.current = extractSecondLevelNodes(doc.content);
    }
  }, [doc?.content, extractSecondLevelNodes]);

  const createSubProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("子项目创建成功");
      utils.projects.list.invalidate();
    },
    onError: () => toast.error("创建子项目失败"),
  });

  const handleContentChange = (newContent: string) => {
    // Detect new second-level nodes in parent projects -> auto-create sub-project
    if (isParentProject && docProjectId) {
      const newNodes = extractSecondLevelNodes(newContent);
      const prevNodes = prevSecondLevelNodesRef.current;
      // Find newly added nodes (not "新节点" placeholder since user hasn't renamed yet)
      const newNodesArr = Array.from(newNodes);
      for (let i = 0; i < newNodesArr.length; i++) {
        const node = newNodesArr[i];
        if (!prevNodes.has(node) && node !== "新节点") {
          // A new named second-level node was added - directly create sub-project
          createSubProjectMutation.mutate({
            name: node,
            parentId: docProjectId,
          });
        }
      }
      prevSecondLevelNodesRef.current = newNodes;
    }
    setEditContent(newContent);
    setHasChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates: any = {};
    if (editContent !== null) updates.content = editContent;
    if (editTitle !== null) updates.title = editTitle;
    await updateMutation.mutateAsync({ id, ...updates });
    // Auto-create version snapshot on save
    const currentTitle = editTitle ?? doc?.title ?? "未命名";
    const currentContent = editContent ?? doc?.content ?? null;
    createVersionMutation.mutate({
      archDocId: id,
      title: currentTitle,
      content: currentContent,
    });
    setHasChanges(false);
  };

  const { data: allIssues } = trpc.issues.list.useQuery(undefined, { enabled: showLinkDialog });
  const { data: users } = trpc.auth.allUsers.useQuery();

  const linkMutation = trpc.architecture.linkIssue.useMutation({
    onSuccess: () => {
      utils.architecture.getNodeIssues.invalidate({ archDocId: id });
      toast.success("关联成功");
    },
  });
  const silentLinkMutation = trpc.architecture.linkIssue.useMutation();
  const unlinkMutation = trpc.architecture.unlinkIssue.useMutation({
    onSuccess: () => {
      utils.architecture.getNodeIssues.invalidate({ archDocId: id });
      toast.success("已取消关联");
    },
  });

  // Create task mutation
  const createTaskMutation = trpc.issues.create.useMutation({
    onSuccess: async (result: any) => {
      // result is MySQL ResultSetHeader: { insertId, affectedRows, ... }
      const newIssueId = result?.insertId;
      const nodeToLink = flowchartView
        ? (flowchartSelectedNode ? `${flowchartView.nodePath}::${flowchartSelectedNode}` : null)
        : selectedNode;
      if (nodeToLink && newIssueId) {
        try {
          await linkMutation.mutateAsync({
            issueId: newIssueId,
            archDocId: id,
            nodePath: nodeToLink,
          });
          toast.success("任务创建并关联成功");
        } catch {
          // Task created but link failed - notify user
          toast.warning("任务已创建，但关联节点失败，请手动关联");
        }
      } else {
        toast.success("任务创建成功");
      }
      utils.architecture.getNodeIssues.invalidate({ archDocId: id });
      utils.issues.list.invalidate();
      setShowCreateDialog(false);
      setNewTaskForm({ title: "", description: "", type: "task", status: "Backlog", priority: "medium", label: "", assigneeId: undefined });
    },
    onError: () => toast.error("创建任务失败"),
  });
  const createChildTaskMutation = trpc.issues.create.useMutation({
    onError: () => toast.error("创建子任务失败"),
  });

  // Get child node names for the selected node (from Markdown hierarchy)
  const childNodeNames = useMemo(() => {
    if (!selectedNode || !content) return [];
    const lines = content.split("\n");
    const children: string[] = [];
    let foundParent = false;
    let parentLevel = 0;
    for (let i = 0; i < lines.length; i++) {
      const hMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
      const listMatch = lines[i].match(/^(\t*)(\s*)[-*]\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2].trim();
        if (text === selectedNode) {
          foundParent = true;
          parentLevel = level;
          continue;
        }
        if (foundParent) {
          if (level <= parentLevel) break; // sibling or parent level, stop
          children.push(text);
        }
      } else if (listMatch && foundParent) {
        children.push(listMatch[3].trim());
      }
    }
    return children;
  }, [selectedNode, content]);

  // Get issues linked to selected node
  const selectedNodeIssues = useMemo(() => {
    if (!selectedNode || !nodeIssues) return [];
    return nodeIssues.filter((ni) => ni.nodePath === selectedNode);
  }, [selectedNode, nodeIssues]);

  // Get issues linked to child nodes of the selected node
  const childNodeIssues = useMemo(() => {
    if (!selectedNode || !nodeIssues || childNodeNames.length === 0) return [];
    const childSet = new Set(childNodeNames);
    return nodeIssues.filter((ni) => childSet.has(ni.nodePath) && ni.nodePath !== selectedNode);
  }, [selectedNode, nodeIssues, childNodeNames]);

  // Filter out already linked issues
  const availableIssues = useMemo(() => {
    if (!allIssues || !selectedNode) return [];
    const linkedIds = new Set(selectedNodeIssues.map((ni) => ni.issueId));
    return allIssues.filter((i: any) => !linkedIds.has(i.id));
  }, [allIssues, selectedNodeIssues, selectedNode]);

  // Open create task dialog with node name as default title
  const handleOpenCreateTask = () => {
    setNewTaskForm({
      title: selectedNode || "",
      description: "",
      type: "task",
      status: "Backlog",
      priority: "medium",
      label: "",
      assigneeId: undefined,
    });
    setTaskCreateMode("parent");
    setShowCreateDialog(true);
  };

  const buildParentTaskDescription = (description: string, childNames: string[]) => {
    const baseDescription = description.trim();
    if (childNames.length === 0) return baseDescription || undefined;

    const childChecklist = childNames.map((name) => `- [ ] ${name}`).join("\n");
    const childSection = `子任务清单：\n${childChecklist}`;
    return baseDescription ? `${baseDescription}\n\n${childSection}` : childSection;
  };

  const buildChildTaskDescription = (description: string, parentNode: string) => {
    const baseDescription = description.trim();
    const parentSection = `父任务：${parentNode}`;
    return baseDescription ? `${baseDescription}\n\n${parentSection}` : parentSection;
  };

  const handleCreateTask = async () => {
    const canCreateChildTasks = !flowchartView && !!selectedNode && childNodeNames.length > 0;
    const isChildTaskMode = canCreateChildTasks && taskCreateMode === "children";

    if (!isChildTaskMode && !newTaskForm.title.trim()) {
      toast.error("请输入任务标题");
      return;
    }

    if (isChildTaskMode) {
      const commonDescription = buildChildTaskDescription(newTaskForm.description, selectedNode!);
      let createdCount = 0;

      for (const childName of childNodeNames) {
        const result: any = await createChildTaskMutation.mutateAsync({
          title: childName,
          description: commonDescription,
          type: newTaskForm.type as "task" | "feature" | "bug",
          status: newTaskForm.status as "Backlog" | "Todo" | "In Progress" | "In Review" | "Done",
          priority: newTaskForm.priority as "urgent" | "high" | "medium" | "low",
          label: newTaskForm.label || undefined,
          assigneeId: newTaskForm.assigneeId,
          projectId: doc?.projectId ?? currentProjectId ?? undefined,
        });
        const newIssueId = result?.insertId;
        if (newIssueId) {
          await silentLinkMutation.mutateAsync({
            issueId: newIssueId,
            archDocId: id,
            nodePath: childName,
          });
        }
        createdCount += 1;
      }

      utils.architecture.getNodeIssues.invalidate({ archDocId: id });
      utils.issues.list.invalidate();
      setShowCreateDialog(false);
      setNewTaskForm({ title: "", description: "", type: "task", status: "Backlog", priority: "medium", label: "", assigneeId: undefined });
      setTaskCreateMode("parent");
      toast.success(`已创建 ${createdCount} 个子任务`);
      return;
    }

    await createTaskMutation.mutateAsync({
      title: newTaskForm.title.trim(),
      description: buildParentTaskDescription(newTaskForm.description, canCreateChildTasks ? childNodeNames : []),
      type: newTaskForm.type as "task" | "feature" | "bug",
      status: newTaskForm.status as "Backlog" | "Todo" | "In Progress" | "In Review" | "Done",
      priority: newTaskForm.priority as "urgent" | "high" | "medium" | "low",
      label: newTaskForm.label || undefined,
      assigneeId: newTaskForm.assigneeId,
      projectId: doc?.projectId ?? currentProjectId ?? undefined,
    });
  };

  // ─── Flowchart handlers ─────────────────────────────────────────────────
  const handleOpenFlowchart = async (nodePath: string) => {
    // First check if there's an inline mermaid block for this node
    const inlineMermaid = inlineMermaidNodes.get(nodePath);
    if (inlineMermaid) {
      setFlowchartView({ nodePath, content: inlineMermaid });
      setFlowchartSelectedNode(null);
      return;
    }
    // Otherwise fetch from DB
    try {
      const result = await utils.architecture.getFlowchart.fetch({ archDocId: id, nodePath });
      if (result) {
        setFlowchartView({ nodePath, content: result.mermaidContent });
        setFlowchartSelectedNode(null);
      }
    } catch {
      toast.error("加载流程图失败");
    }
  };

  const handleOpenFlowchartEditor = () => {
    if (selectedNode) {
      // Check if this node has an inline mermaid block
      const inlineMermaid = inlineMermaidNodes.get(selectedNode);
      if (inlineMermaid) {
        setFlowchartView({ nodePath: selectedNode, content: inlineMermaid });
        setFlowchartSelectedNode(null);
        return;
      }
      // Check if this node already has a DB-stored flowchart
      const existing = flowchartList?.find((f: any) => f.nodePath === selectedNode);
      if (existing) {
        utils.architecture.getFlowchart.fetch({ archDocId: id, nodePath: selectedNode }).then((r) => {
          setFlowchartView({ nodePath: selectedNode, content: r?.mermaidContent || getDefaultFlowchart(selectedNode) });
          setFlowchartSelectedNode(null);
        });
      } else {
        // Create new flowchart with default content and open inline
        const defaultContent = getDefaultFlowchart(selectedNode);
        setFlowchartView({ nodePath: selectedNode, content: defaultContent });
        setFlowchartSelectedNode(null);
      }
    }
  };



  // The selected node in flowchart view uses the same task panel logic
  // For flowchart nodes, use unique encoding: "parentNode::flowchartNodeText" to avoid conflicts
  const activeSelectedNode = flowchartView
    ? (flowchartSelectedNode ? `${flowchartView.nodePath}::${flowchartSelectedNode}` : null)
    : selectedNode;
  const canCreateChildTasks = !flowchartView && !!selectedNode && childNodeNames.length > 0;
  const isChildTaskMode = canCreateChildTasks && taskCreateMode === "children";
  const isCreatingTask = createTaskMutation.isPending || createChildTaskMutation.isPending || silentLinkMutation.isPending;

  // Get issues for the active selected node (works for both mindmap and flowchart)
  const selectedNodeIssuesForPanel = useMemo(() => {
    if (!activeSelectedNode || !nodeIssues) return [];
    return nodeIssues.filter((ni) => ni.nodePath === activeSelectedNode);
  }, [activeSelectedNode, nodeIssues]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-[60vh] bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">架构文档不存在</p>
        <Button variant="link" onClick={() => navigate("/architecture")}>返回列表</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/architecture")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <input
            className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 w-auto min-w-[200px]"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="架构文档标题"
          />
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">未保存</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "mindmap" | "markdown")}>
            <TabsList className="h-8">
              <TabsTrigger value="mindmap" className="text-xs px-3 h-7">
                <Network className="h-3.5 w-3.5 mr-1.5" />
                思维导图
              </TabsTrigger>
              <TabsTrigger value="markdown" className="text-xs px-3 h-7">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Markdown
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVersionPanel(!showVersionPanel)}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            版本
            {versions && versions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{versions.length}</Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            保存
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Version History Panel */}
        {showVersionPanel && (
          <div className="w-72 border-r bg-background shrink-0 flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <History className="h-4 w-4" />
                版本历史
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowVersionPanel(false); setPreviewVersionId(null); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!versions || versions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">保存后自动创建版本</p>
              ) : (
                versions.map((v: any) => (
                  <div
                    key={v.id}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                      previewVersionId === v.id ? "border-primary bg-primary/5" : "border-transparent"
                    }`}
                    onClick={() => setPreviewVersionId(v.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">v{v.version}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{v.creatorName || "未知"}</p>
                    {previewVersionId === v.id && (
                      <div className="mt-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs flex-1"
                          onClick={(e) => { e.stopPropagation(); /* preview is shown in main area */ }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          预览
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-xs flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("确定要恢复到这个版本吗？当前未保存的修改将丢失。")) {
                              restoreVersionMutation.mutate({ archDocId: id, versionId: v.id });
                            }
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          恢复
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
        {viewMode === "mindmap" ? (
          <>
          <div className="w-full relative h-full">
            <MarkmapView
              ref={markmapRef}
              content={content}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onContentChange={(newContent) => {
                handleContentChange(newContent);
              }}
              nodeIssues={nodeIssues || []}
              flowchartNodePaths={allFlowchartNodePaths}
              onOpenFlowchart={(nodePath) => {
                handleOpenFlowchart(nodePath);
              }}
            />

            {/* Node info panel - with status indicators */}
            {selectedNode && (
              <div className="absolute bottom-4 right-4 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border rounded-xl shadow-lg p-3 z-10 max-h-[45vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <h4 className="font-semibold text-sm truncate">{selectedNode}</h4>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedNode(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => setShowLinkDialog(true)}
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    关联已有
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={handleOpenCreateTask}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    新建任务
                  </Button>
                  <Button
                    variant={allFlowchartNodePaths.has(selectedNode) ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => {
                      if (allFlowchartNodePaths.has(selectedNode)) {
                        handleOpenFlowchart(selectedNode);
                      } else {
                        handleOpenFlowchartEditor();
                      }
                    }}
                  >
                    <GitBranch className="h-3 w-3 mr-1" />
                    {allFlowchartNodePaths.has(selectedNode) ? "查看流程图" : "添加流程图"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => nodeImageInputRef.current?.click()}
                    disabled={isUploadingNodeImage}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    {isUploadingNodeImage ? "上传中..." : "插入图片"}
                  </Button>
                  <input
                    ref={nodeImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNodeImageUpload}
                  />
                </div>

                {/* Linked issues with status */}
                {selectedNodeIssues.length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">
                      关联任务 ({selectedNodeIssues.length})
                    </p>
                    {selectedNodeIssues.map((ni) => {
                      const statusConf = STATUS_CONFIG[ni.issueStatus || "Backlog"] || STATUS_CONFIG.Backlog;
                      return (
                        <div key={ni.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/50 group">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusConf.dot}`} />
                          <button
                            className="truncate text-left hover:text-primary transition-colors flex-1"
                            onClick={() => navigate(`/issues?id=${ni.issueId}`)}
                          >
                            {ni.issueTitle}
                          </button>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => unlinkMutation.mutate({ id: ni.id })}
                          >
                            <Unlink className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedNodeIssues.length === 0 && childNodeIssues.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2 border-t">
                    暂无关联任务
                  </p>
                )}

                {/* Child node issues */}
                {childNodeIssues.length > 0 && (
                  <div className="space-y-1 border-t pt-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">
                      子节点任务 ({childNodeIssues.length})
                    </p>
                    {childNodeIssues.map((ni) => {
                      const statusConf = STATUS_CONFIG[ni.issueStatus || "Backlog"] || STATUS_CONFIG.Backlog;
                      return (
                        <div key={ni.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/30 group">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusConf.dot}`} />
                          <span className="text-[9px] text-muted-foreground shrink-0 max-w-[60px] truncate" title={ni.nodePath}>{ni.nodePath}</span>
                          <button
                            className="truncate text-left hover:text-primary transition-colors flex-1"
                            onClick={() => navigate(`/issues?id=${ni.issueId}`)}
                          >
                            {ni.issueTitle}
                          </button>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ─── Flowchart Dialog (enlarged view for editing) ─── */}
          <Dialog open={!!flowchartView} onOpenChange={(open) => { if (!open) setFlowchartView(null); }}>
            <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 overflow-hidden flex flex-col rounded-none border-none" style={{ maxWidth: '100vw', maxHeight: '100vh' }}>
              <div className="flex-1 relative">
                <VisualFlowEditor
                  initialMermaid={flowchartView?.content || ""}
                  onSave={(mermaid) => {
                    if (!flowchartView) return;
                    // Check if this is an inline mermaid block (embedded in Markdown)
                    if (inlineMermaidNodes.has(flowchartView.nodePath)) {
                      // Update the Markdown content by replacing the mermaid block
                      const lines = content.split("\n");
                      const targetHeading = flowchartView.nodePath;
                      let headingLineIdx = -1;
                      for (let li = 0; li < lines.length; li++) {
                        const hMatch = lines[li].match(/^#{1,6}\s+(.+)$/);
                        if (hMatch && hMatch[1].trim() === targetHeading) {
                          headingLineIdx = li;
                        }
                      }
                      if (headingLineIdx >= 0) {
                        let mermaidStart = -1;
                        let mermaidEnd = -1;
                        for (let li = headingLineIdx + 1; li < lines.length; li++) {
                          if (lines[li].match(/^#{1,6}\s+/)) break;
                          if (lines[li].trim() === "```mermaid") {
                            mermaidStart = li;
                          } else if (mermaidStart >= 0 && lines[li].trim() === "```") {
                            mermaidEnd = li;
                            break;
                          }
                        }
                        if (mermaidStart >= 0 && mermaidEnd >= 0) {
                          const newLines = [
                            ...lines.slice(0, mermaidStart + 1),
                            mermaid,
                            ...lines.slice(mermaidEnd),
                          ];
                          const newContent = newLines.join("\n");
                          setEditContent(newContent);
                          setHasChanges(true);
                        }
                      }
                    } else {
                      // DB-stored flowchart
                      saveFlowchartMutation.mutate({ archDocId: id, nodePath: flowchartView.nodePath, mermaidContent: mermaid });
                    }
                    setFlowchartView({ ...flowchartView, content: mermaid });
                  }}
                  onBack={() => setFlowchartView(null)}
                  title={flowchartView?.nodePath || ""}
                  selectedNode={flowchartSelectedNode}
                  onSelectNode={setFlowchartSelectedNode}
                  nodeIssues={(nodeIssues || []).filter(ni => ni.nodePath.startsWith(`${flowchartView?.nodePath || ""}::`)).map(ni => ({ ...ni, nodePath: ni.nodePath.split('::')[1] || ni.nodePath }))}
                />

                {/* Flowchart node task panel */}
                {flowchartSelectedNode && (
                  <div className="absolute bottom-4 right-4 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border rounded-xl shadow-lg p-3 z-20 max-h-[40%] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <h4 className="font-semibold text-sm truncate">{flowchartSelectedNode}</h4>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setFlowchartSelectedNode(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setShowLinkDialog(true)}>
                        <Link2 className="h-3 w-3 mr-1" />关联已有
                      </Button>
                      <Button variant="default" size="sm" className="h-7 text-[11px] px-2.5" onClick={() => {
                        setNewTaskForm({ title: flowchartSelectedNode, description: "", type: "task", status: "Backlog", priority: "medium", label: "", assigneeId: undefined });
                        setTaskCreateMode("parent");
                        setShowCreateDialog(true);
                      }}>
                        <PlusCircle className="h-3 w-3 mr-1" />新建任务
                      </Button>
                    </div>
                    {selectedNodeIssuesForPanel.length > 0 && (
                      <div className="space-y-1 border-t pt-2">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">关联任务 ({selectedNodeIssuesForPanel.length})</p>
                        {selectedNodeIssuesForPanel.map((ni) => {
                          const sc = STATUS_CONFIG[ni.issueStatus || "Backlog"] || STATUS_CONFIG.Backlog;
                          return (
                            <div key={ni.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/50 group">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                              <button className="truncate text-left hover:text-primary transition-colors flex-1" onClick={() => navigate(`/issues?id=${ni.issueId}`)}>{ni.issueTitle}</button>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${sc.color}`}>{sc.label}</Badge>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => unlinkMutation.mutate({ id: ni.id })}>
                                <Unlink className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedNodeIssuesForPanel.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-2 border-t">暂无关联任务</p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

            {/* Link Existing Issue Dialog */}
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>关联已有任务到: {activeSelectedNode}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[50vh] overflow-y-auto space-y-1.5 py-2">
                  {availableIssues.length > 0 ? (
                    availableIssues.map((issue: any) => {
                      const statusConf = STATUS_CONFIG[issue.status] || STATUS_CONFIG.Backlog;
                      return (
                        <button
                          key={issue.id}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                          onClick={async () => {
                            await linkMutation.mutateAsync({
                              issueId: issue.id,
                              archDocId: id,
                              nodePath: activeSelectedNode!,
                            });
                            setShowLinkDialog(false);
                          }}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConf.dot}`} />
                          <span className="flex-1 truncate">{issue.title}</span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">没有可关联的任务</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Create New Task Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogContent className="w-[min(96vw,560px)] max-w-none max-h-[92vh] overflow-hidden p-0">
                <DialogHeader>
                  <DialogTitle className="px-6 pt-6 pr-12 truncate">新建任务并关联到: {activeSelectedNode}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto overflow-x-hidden px-6 py-2 max-h-[calc(92vh-9rem)]">
                  {canCreateChildTasks && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3 min-w-0">
                      <Label className="text-xs font-medium">创建范围</Label>
                      <Select value={taskCreateMode} onValueChange={(v) => setTaskCreateMode(v as "parent" | "children")}>
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-2rem)]">
                          <SelectItem value="parent">只创建父任务，描述生成子任务清单</SelectItem>
                          <SelectItem value="children">为所有子节点分别创建任务</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="max-h-28 overflow-y-auto overflow-x-hidden rounded border bg-background px-2 py-1.5">
                        {childNodeNames.map((name, index) => (
                          <div key={`${name}-${index}`} className="flex items-start gap-2 text-xs text-muted-foreground py-0.5 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="min-w-0 break-words leading-relaxed">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">任务标题</Label>
                    <Input
                      placeholder="输入任务标题"
                      className="min-w-0"
                      value={isChildTaskMode ? `${childNodeNames.length} 个子节点任务` : newTaskForm.title}
                      disabled={isChildTaskMode}
                      onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">{isChildTaskMode ? "公共描述（可选）" : "描述（可选）"}</Label>
                    <Textarea
                      placeholder="任务描述..."
                      className="h-20 min-w-0 resize-none"
                      value={newTaskForm.description}
                      onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">类型</Label>
                      <Select
                        value={newTaskForm.type}
                        onValueChange={(v) => setNewTaskForm((f) => ({ ...f, type: v }))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">优先级</Label>
                      <Select
                        value={newTaskForm.priority}
                        onValueChange={(v) => setNewTaskForm((f) => ({ ...f, priority: v }))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">状态</Label>
                      <Select
                        value={newTaskForm.status}
                        onValueChange={(v) => setNewTaskForm((f) => ({ ...f, status: v }))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                            <SelectItem key={key} value={key}>{conf.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">标签</Label>
                      <Select
                        value={newTaskForm.label || "none"}
                        onValueChange={(v) => setNewTaskForm((f) => ({ ...f, label: v === "none" ? "" : v }))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue placeholder="无标签" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无标签</SelectItem>
                          {LABEL_OPTIONS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">指派人</Label>
                      <Select
                        value={newTaskForm.assigneeId?.toString() || "unassigned"}
                        onValueChange={(v) => setNewTaskForm((f) => ({ ...f, assigneeId: v === "unassigned" ? undefined : Number(v) }))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0">
                          <SelectValue placeholder="未指派" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">未指派</SelectItem>
                          {users?.map((u: any) => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.name || u.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs font-medium">所属项目</Label>
                      <Input
                        className="h-9 min-w-0 text-xs bg-muted/50"
                        value={doc?.projectId ? (projects?.find((p: any) => p.id === doc.projectId)?.name || "当前项目") : "未关联项目"}
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t px-6 py-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                  <Button onClick={handleCreateTask} disabled={(!isChildTaskMode && !newTaskForm.title.trim()) || isCreatingTask}>
                    {isCreatingTask ? "创建中..." : (isChildTaskMode ? "创建所有子任务" : "创建并关联")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
                ) : (
          <div className="h-full p-4">
            <Textarea
              className="h-full w-full font-mono text-sm resize-none border-muted focus:border-primary"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="使用 Markdown 格式编写架构文档...&#10;&#10;# 系统架构&#10;## 模块一&#10;- 子模块 A&#10;- 子模块 B"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
