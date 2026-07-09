import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Plus,
  LayoutGrid,
  List,
  Smile,
  Meh,
  Frown,
  Zap,
  Star,
  MoreHorizontal,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FEEDBACK_STATUSES = ["New", "Reviewed", "Actioned", "Archived"] as const;
const FEATURE_STATUSES = ["Considering", "Planned", "In Progress", "Shipped"] as const;

const FEEDBACK_STATUS_LABEL: Record<string, string> = {
  New: "新建",
  Reviewed: "已审阅",
  Actioned: "已处理",
  Archived: "已归档",
};

const FEATURE_STATUS_LABEL: Record<string, string> = {
  Considering: "评估中",
  Planned: "已规划",
  "In Progress": "开发中",
  Shipped: "已上线",
};

const SOURCE_LABEL: Record<string, string> = {
  internal: "内部",
  email: "邮件",
  slack: "Slack",
  other: "其他",
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "正面",
  neutral: "中性",
  negative: "负面",
};

const FEEDBACK_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  New: { color: "text-blue-700", bg: "bg-blue-100" },
  Reviewed: { color: "text-amber-700", bg: "bg-amber-100" },
  Actioned: { color: "text-emerald-700", bg: "bg-emerald-100" },
  Archived: { color: "text-slate-500", bg: "bg-slate-100" },
};

const FEATURE_STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Considering: { color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  Planned: { color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-500" },
  "In Progress": { color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
  Shipped: { color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
};

const SENTIMENT_CONFIG = {
  positive: { icon: Smile, color: "text-emerald-600" },
  neutral: { icon: Meh, color: "text-amber-500" },
  negative: { icon: Frown, color: "text-red-500" },
};

export default function FeedbackHub() {
  const [activeTab, setActiveTab] = useState("feedback");
  const [feedbackView, setFeedbackView] = useState<"table" | "board">("table");
  const [featureView, setFeatureView] = useState<"table" | "board">("table");
  const [showCreateFeedback, setShowCreateFeedback] = useState(false);
  const [showCreateFeature, setShowCreateFeature] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState<number | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState<number | null>(null);

  const [fbForm, setFbForm] = useState({
    summary: "",
    description: "",
    source: "internal" as "internal" | "email" | "slack" | "other",
    sentiment: "neutral" as "positive" | "neutral" | "negative",
    submitterName: "",
  });

  const [ftForm, setFtForm] = useState({
    name: "",
    description: "",
    productArea: "",
  });

  const { currentProjectId } = useProject();
  const { data: feedbackList, isLoading: fbLoading } = trpc.feedback.list.useQuery({ projectId: currentProjectId });
  const { data: featureList, isLoading: ftLoading } = trpc.featureRequests.list.useQuery({ projectId: currentProjectId });
  const utils = trpc.useUtils();

  const createFeedback = trpc.feedback.create.useMutation({
    onSuccess: () => {
      utils.feedback.list.invalidate();
      toast.success("反馈已提交");
      setShowCreateFeedback(false);
      setFbForm({ summary: "", description: "", source: "internal", sentiment: "neutral", submitterName: "" });
    },
  });

  const updateFeedbackStatus = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => utils.feedback.list.invalidate(),
  });

  const createFeature = trpc.featureRequests.create.useMutation({
    onSuccess: () => {
      utils.featureRequests.list.invalidate();
      toast.success("功能需求已创建");
      setShowCreateFeature(false);
      setFtForm({ name: "", description: "", productArea: "" });
    },
  });

  const updateFeature = trpc.featureRequests.update.useMutation({
    onSuccess: () => utils.featureRequests.list.invalidate(),
  });

  const convertToIssue = trpc.featureRequests.convertToIssue.useMutation({
    onSuccess: () => {
      utils.featureRequests.list.invalidate();
      utils.issues.list.invalidate();
      toast.success("功能需求已成功转为任务！");
      setShowConvertDialog(null);
    },
    onError: () => toast.error("转换失败，请重试"),
  });

  const linkFeedbackToFeature = trpc.feedback.linkToFeature.useMutation({
    onSuccess: () => {
      utils.featureRequests.list.invalidate();
      toast.success("反馈已关联到功能需求");
      setShowLinkDialog(null);
    },
  });

  return (
    <div className="page-enter">
      <PageHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">反馈中心</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">收集用户反馈，管理功能需求池</p>
          </div>
        </div>
      </PageHeader>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger value="feedback" className="text-xs h-7 px-4">
            用户反馈
            {feedbackList && feedbackList.filter((f) => f.status === "New").length > 0 && (
              <Badge className="ml-1.5 h-4 px-1.5 text-[9px] bg-blue-500 text-white border-0">
                {feedbackList.filter((f) => f.status === "New").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs h-7 px-4">
            功能需求池
          </TabsTrigger>
        </TabsList>

        {/* ─── 反馈 Tab ─────────────────────────────────────────────── */}
        <TabsContent value="feedback" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setFeedbackView("table")}
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${feedbackView === "table" ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
                title="表格视图"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFeedbackView("board")}
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${feedbackView === "board" ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
                title="看板视图"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreateFeedback(true)}>
              <Plus className="h-3.5 w-3.5" />
              添加反馈
            </Button>
          </div>

          {fbLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : feedbackView === "table" ? (
            <FeedbackTable
              data={feedbackList ?? []}
              onStatusChange={(id, status) => updateFeedbackStatus.mutate({ id, status })}
              onLink={(id) => setShowLinkDialog(id)}
            />
          ) : (
            <FeedbackBoard
              data={feedbackList ?? []}
              onStatusChange={(id, status) => updateFeedbackStatus.mutate({ id, status })}
            />
          )}
        </TabsContent>

        {/* ─── 功能需求 Tab ─────────────────────────────────────── */}
        <TabsContent value="features" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setFeatureView("table")}
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${featureView === "table" ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
                title="表格视图"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFeatureView("board")}
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${featureView === "board" ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
                title="看板视图"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreateFeature(true)}>
              <Plus className="h-3.5 w-3.5" />
              新建功能需求
            </Button>
          </div>

          {ftLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : featureView === "table" ? (
            <FeatureTable
              data={featureList ?? []}
              onStatusChange={(id, status) => updateFeature.mutate({ id, status })}
              onConvert={(id) => setShowConvertDialog(id)}
            />
          ) : (
            <FeatureBoard
              data={featureList ?? []}
              onConvert={(id) => setShowConvertDialog(id)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* 添加反馈弹窗 */}
      <Dialog open={showCreateFeedback} onOpenChange={setShowCreateFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">提交反馈</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">摘要 *</Label>
              <Input
                placeholder="简要描述反馈内容..."
                value={fbForm.summary}
                onChange={(e) => setFbForm({ ...fbForm, summary: e.target.value })}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">详细说明</Label>
              <Textarea
                placeholder="补充更多背景信息..."
                value={fbForm.description}
                onChange={(e) => setFbForm({ ...fbForm, description: e.target.value })}
                className="text-sm min-h-[70px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">来源</Label>
                <Select value={fbForm.source} onValueChange={(v: any) => setFbForm({ ...fbForm, source: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["internal", "email", "slack", "other"] as const).map((s) => (
                      <SelectItem key={s} value={s} className="text-sm">{SOURCE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">情感倾向</Label>
                <Select value={fbForm.sentiment} onValueChange={(v: any) => setFbForm({ ...fbForm, sentiment: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["positive", "neutral", "negative"] as const).map((s) => (
                      <SelectItem key={s} value={s} className="text-sm">{SENTIMENT_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">提交人（可选）</Label>
              <Input
                placeholder="客户或团队成员姓名..."
                value={fbForm.submitterName}
                onChange={(e) => setFbForm({ ...fbForm, submitterName: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateFeedback(false)}>取消</Button>
            <Button
              size="sm"
              disabled={!fbForm.summary.trim() || createFeedback.isPending}
              onClick={() => createFeedback.mutate({ ...fbForm, projectId: currentProjectId })}
            >
              {createFeedback.isPending ? "提交中..." : "提交反馈"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建功能需求弹窗 */}
      <Dialog open={showCreateFeature} onOpenChange={setShowCreateFeature}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">新建功能需求</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">需求名称 *</Label>
              <Input
                placeholder="这个功能需求是什么？"
                value={ftForm.name}
                onChange={(e) => setFtForm({ ...ftForm, name: e.target.value })}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">需求描述</Label>
              <Textarea
                placeholder="详细描述功能需求..."
                value={ftForm.description}
                onChange={(e) => setFtForm({ ...ftForm, description: e.target.value })}
                className="text-sm min-h-[70px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">产品模块</Label>
              <Input
                placeholder="例如：用户引导、仪表盘、API..."
                value={ftForm.productArea}
                onChange={(e) => setFtForm({ ...ftForm, productArea: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateFeature(false)}>取消</Button>
            <Button
              size="sm"
              disabled={!ftForm.name.trim() || createFeature.isPending}
              onClick={() => createFeature.mutate({ ...ftForm, projectId: currentProjectId })}
            >
              {createFeature.isPending ? "创建中..." : "创建需求"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一键转为 Issue 确认弹窗 */}
      <Dialog open={showConvertDialog !== null} onOpenChange={() => setShowConvertDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">转为任务</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-2">
            此操作将在任务看板中创建一个新任务并关联到该功能需求，同时将需求状态更新为"开发中"。
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConvertDialog(null)}>取消</Button>
            <Button
              size="sm"
              disabled={convertToIssue.isPending}
              onClick={() => showConvertDialog !== null && convertToIssue.mutate({ featureRequestId: showConvertDialog })}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {convertToIssue.isPending ? "转换中..." : "一键转为任务"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关联反馈到功能需求弹窗 */}
      <Dialog open={showLinkDialog !== null} onOpenChange={() => setShowLinkDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">关联到功能需求</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {featureList?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">暂无功能需求，请先创建</p>
            ) : (
              featureList?.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() =>
                    showLinkDialog !== null &&
                    linkFeedbackToFeature.mutate({ feedbackId: showLinkDialog, featureRequestId: feature.id })
                  }
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                >
                  <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{feature.name}</p>
                    {feature.productArea && (
                      <p className="text-[10px] text-muted-foreground">{feature.productArea}</p>
                    )}
                  </div>
                  <Badge
                    className={`text-[9px] h-4 px-1.5 border-0 shrink-0 ${FEATURE_STATUS_CONFIG[feature.status]?.bg} ${FEATURE_STATUS_CONFIG[feature.status]?.color}`}
                  >
                    {FEATURE_STATUS_LABEL[feature.status] ?? feature.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// ─── 反馈表格视图 ──────────────────────────────────────────────────────
function FeedbackTable({
  data,
  onStatusChange,
  onLink,
}: {
  data: any[];
  onStatusChange: (id: number, status: any) => void;
  onLink: (id: number) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/50 rounded-xl">
        <MessageSquare className="h-7 w-7 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">暂无反馈</p>
      </div>
    );
  }

  return (
    <div className="card-elegant overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-[11px] font-semibold text-muted-foreground w-8">情感</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">摘要</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">来源</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">状态</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">提交时间</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((fb) => {
            const sentCfg = SENTIMENT_CONFIG[fb.sentiment as keyof typeof SENTIMENT_CONFIG];
            const SentIcon = sentCfg.icon;
            const statusCfg = FEEDBACK_STATUS_CONFIG[fb.status];
            return (
              <TableRow key={fb.id} className="border-border/40 hover:bg-muted/30">
                <TableCell>
                  <SentIcon className={`h-4 w-4 ${sentCfg.color}`} />
                </TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{fb.summary}</p>
                  {fb.submitterName && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fb.submitterName}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">{SOURCE_LABEL[fb.source] ?? fb.source}</Badge>
                </TableCell>
                <TableCell>
                  <Select value={fb.status} onValueChange={(v) => onStatusChange(fb.id, v)}>
                    <SelectTrigger className={`h-6 text-[10px] border-0 px-2 w-24 ${statusCfg.bg} ${statusCfg.color}`}>
                      <SelectValue>{FEEDBACK_STATUS_LABEL[fb.status] ?? fb.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{FEEDBACK_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true, locale: zhCN })}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onLink(fb.id)}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    title="关联到功能需求"
                  >
                    <Link2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── 反馈看板视图 ──────────────────────────────────────────────────────
function FeedbackBoard({ data, onStatusChange }: { data: any[]; onStatusChange: (id: number, status: any) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {FEEDBACK_STATUSES.map((status) => {
        const items = data.filter((f) => f.status === status);
        const cfg = FEEDBACK_STATUS_CONFIG[status];
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`text-xs font-semibold ${cfg.color}`}>{FEEDBACK_STATUS_LABEL[status]}</span>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((fb) => {
                const sentCfg = SENTIMENT_CONFIG[fb.sentiment as keyof typeof SENTIMENT_CONFIG];
                const SentIcon = sentCfg.icon;
                return (
                  <div key={fb.id} className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all">
                    <div className="flex items-start gap-2 mb-2">
                      <SentIcon className={`h-3.5 w-3.5 ${sentCfg.color} shrink-0 mt-0.5`} />
                      <p className="text-xs font-medium leading-snug">{fb.summary}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">{SOURCE_LABEL[fb.source] ?? fb.source}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted">
                            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 text-xs">
                          {FEEDBACK_STATUSES.filter((s) => s !== status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => onStatusChange(fb.id, s)}>
                              移至 {FEEDBACK_STATUS_LABEL[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 功能需求表格视图 ───────────────────────────────────────────────────────
function FeatureTable({
  data,
  onStatusChange,
  onConvert,
}: {
  data: any[];
  onStatusChange: (id: number, status: any) => void;
  onConvert: (id: number) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/50 rounded-xl">
        <Star className="h-7 w-7 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">暂无功能需求</p>
      </div>
    );
  }

  return (
    <div className="card-elegant overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-[11px] font-semibold text-muted-foreground">需求名称</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">产品模块</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">反馈数</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground">状态</TableHead>
            <TableHead className="text-[11px] font-semibold text-muted-foreground w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((ft) => {
            const cfg = FEATURE_STATUS_CONFIG[ft.status];
            return (
              <TableRow key={ft.id} className="border-border/40 hover:bg-muted/30">
                <TableCell>
                  <p className="text-xs font-medium">{ft.name}</p>
                  {ft.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">{ft.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  {ft.productArea && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{ft.productArea}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-semibold">{ft.feedbackCount}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={ft.status} onValueChange={(v) => onStatusChange(ft.id, v)}>
                    <SelectTrigger className={`h-6 text-[10px] border-0 px-2 w-24 ${cfg.bg} ${cfg.color}`}>
                      <SelectValue>{FEATURE_STATUS_LABEL[ft.status] ?? ft.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{FEATURE_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {!ft.linkedIssueId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2"
                      onClick={() => onConvert(ft.id)}
                    >
                      <Zap className="h-3 w-3" />
                      转为任务
                    </Button>
                  ) : (
                    <Badge className="text-[10px] h-5 px-1.5 bg-emerald-100 text-emerald-700 border-0">
                      已关联
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── 功能需求看板视图 ───────────────────────────────────────────────────────
function FeatureBoard({ data, onConvert }: { data: any[]; onConvert: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {FEATURE_STATUSES.map((status) => {
        const items = data.filter((f) => f.status === status);
        const cfg = FEATURE_STATUS_CONFIG[status];
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-semibold ${cfg.color}`}>{FEATURE_STATUS_LABEL[status]}</span>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((ft) => (
                <div key={ft.id} className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all">
                  <p className="text-xs font-medium mb-2 leading-snug">{ft.name}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {ft.feedbackCount} 条反馈
                    </div>
                    {!ft.linkedIssueId && (
                      <button
                        onClick={() => onConvert(ft.id)}
                        className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                      >
                        <Zap className="h-3 w-3" />
                        转为任务
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
