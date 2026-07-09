import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Edit3,
  FolderOpen,
  Image as ImageIcon,
  Save,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";

interface ProjectOverviewProps {
  projectId: number;
}

export default function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Fetch project details
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: projectId });
  // Fetch project members
  const { data: members } = trpc.projects.members.useQuery({ projectId });
  // Fetch project issues stats
  const { data: stats } = trpc.dashboard.stats.useQuery({ projectId });
  // Fetch project attachments
  const { data: attachments } = trpc.attachments.listByProject.useQuery({ projectId });

  // Progress notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("进度说明已更新");
      utils.projects.get.invalidate({ id: projectId });
      setIsEditingNotes(false);
    },
    onError: () => toast.error("更新失败"),
  });

  const uploadMutation = trpc.attachments.upload.useMutation({
    onSuccess: (data) => {
      // Insert image markdown at cursor position
      const imgMarkdown = `\n![${data.fileName}](${data.url})\n`;
      setNotesContent((prev) => prev + imgMarkdown);
      setIsUploading(false);
      toast.success("图片已上传");
    },
    onError: () => {
      setIsUploading(false);
      toast.error("图片上传失败");
    },
  });

  const handleStartEdit = () => {
    setNotesContent(project?.progressNotes || "");
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    updateProjectMutation.mutate({
      id: projectId,
      progressNotes: notesContent || null,
    });
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        projectId,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [projectId, uploadMutation]);

  if (projectLoading) {
    return (
      <div className="page-enter flex flex-col flex-1">
        <PageHeader>
          <Skeleton className="h-6 w-48" />
        </PageHeader>
        <div className="p-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-enter flex flex-col flex-1 items-center justify-center">
        <p className="text-muted-foreground">项目不存在或无权访问</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/projects")}>
          返回项目列表
        </Button>
      </div>
    );
  }

  const statusLabel = project.status === "planning" ? "规划中" : project.status === "in_progress" ? "进行中" : "已完成";
  const totalIssues = stats?.totalIssues ?? 0;
  const doneIssues = stats?.doneIssues ?? 0;
  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  // Time progress
  const getTimeProgress = () => {
    if (!project.deadline) return null;
    const now = Date.now();
    const deadlineTime = new Date(project.deadline).getTime();
    const createdTime = new Date(project.createdAt).getTime();
    const totalDuration = deadlineTime - createdTime;
    const elapsed = now - createdTime;
    const daysLeft = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));
    const percentage = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 100;
    return { daysLeft, percentage };
  };
  const timeInfo = getTimeProgress();

  // Render markdown images in progress notes
  const renderProgressNotes = (content: string) => {
    if (!content) return null;
    // Split by image markdown pattern
    const parts = content.split(/(!?\[([^\]]*)\]\(([^)]+)\))/g);
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      // Check if this is an image match group
      if (part && part.startsWith("![")) {
        const alt = parts[i + 1] || "";
        const src = parts[i + 2] || "";
        elements.push(
          <div key={i} className="my-3">
            <img
              src={src}
              alt={alt}
              className="max-w-full rounded-lg border shadow-sm max-h-[400px] object-contain"
            />
            {alt && <p className="text-xs text-muted-foreground mt-1">{alt}</p>}
          </div>
        );
        i += 3;
      } else if (part) {
        // Regular text - render as paragraphs
        const lines = part.split("\n").filter(l => l.trim());
        for (const line of lines) {
          elements.push(
            <p key={`${i}-${line.slice(0, 20)}`} className="text-sm leading-relaxed text-foreground/90">
              {line}
            </p>
          );
        }
        i++;
      } else {
        i++;
      }
    }
    return elements;
  };

  return (
    <div className="page-enter flex flex-col flex-1">
      <PageHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: project.color + "20" }}
          >
            {project.icon}
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">{project.name}</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">项目总览</p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {statusLabel}
          </Badge>
        </div>
      </PageHeader>

      <div className="p-6 space-y-6 flex-1 overflow-auto">
        {/* 项目基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-elegant">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">任务完成</p>
                <p className="text-lg font-bold">{doneIssues}/{totalIssues}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">完成率</p>
                <p className="text-lg font-bold" style={{ color: project.color }}>{completionRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">成员数</p>
                <p className="text-lg font-bold">{members?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                {timeInfo && timeInfo.daysLeft < 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CalendarDays className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">截止时间</p>
                <p className="text-sm font-semibold">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
                    : "未设置"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 时间进度条 */}
        {timeInfo && (
          <Card className="card-elegant">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  项目时间线
                </span>
                <span className={`text-xs font-semibold ${
                  timeInfo.daysLeft < 0 ? "text-red-500" :
                  timeInfo.daysLeft <= 7 ? "text-amber-500" :
                  "text-emerald-600"
                }`}>
                  {timeInfo.daysLeft < 0 ? `已过期 ${Math.abs(timeInfo.daysLeft)} 天` :
                   timeInfo.daysLeft === 0 ? "今天截止" :
                   `剩余 ${timeInfo.daysLeft} 天`}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    timeInfo.daysLeft < 0 ? "bg-red-400" :
                    timeInfo.daysLeft <= 7 ? "bg-amber-400" :
                    "bg-blue-400"
                  }`}
                  style={{ width: `${timeInfo.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{new Date(project.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                <span>{new Date(project.deadline!).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 任务完成进度 */}
        <Card className="card-elegant">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">任务完成进度</span>
              <span className="text-xs text-muted-foreground">{doneIssues} / {totalIssues}</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </CardContent>
        </Card>

        {/* 进度说明 */}
        <Card className="card-elegant">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                进度说明
              </CardTitle>
              {!isEditingNotes && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleStartEdit}>
                  <Edit3 className="h-3 w-3" />
                  编辑
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="记录项目进度、里程碑、重要决策等...&#10;&#10;支持插入图片（点击下方按钮上传）"
                  className="min-h-[200px] text-sm"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <ImageIcon className="h-3 w-3" />
                    {isUploading ? "上传中..." : "插入图片"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setIsEditingNotes(false)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs gap-1"
                    onClick={handleSaveNotes}
                    disabled={updateProjectMutation.isPending}
                  >
                    <Save className="h-3 w-3" />
                    {updateProjectMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>
            ) : project.progressNotes ? (
              <div className="space-y-2">
                {renderProgressNotes(project.progressNotes)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">暂无进度说明</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={handleStartEdit}>
                  添加进度说明
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 项目描述 */}
        {project.description && (
          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">项目描述</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* 成员列表 */}
        <Card className="card-elegant">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              项目成员 ({members?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(m.userName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.userName || "未知用户"}</p>
                      <p className="text-[10px] text-muted-foreground">{m.role === "owner" ? "管理员" : "成员"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">暂无成员</p>
            )}
          </CardContent>
        </Card>

        {/* 项目附件 */}
        {attachments && attachments.length > 0 && (
          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                项目文件 ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {att.mimeType?.startsWith("image/") ? (
                      <img src={att.url} alt={att.fileName} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{att.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setLocation("/issues")}
          >
            查看任务看板
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setLocation("/architecture")}
          >
            查看架构图
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setLocation("/wiki")}
          >
            查看文档
          </Button>
        </div>
      </div>
    </div>
  );
}
