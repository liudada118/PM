import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  Trash2,
  Link2,
  CircleDot,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
import { useLocation, useParams } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["Product", "Engineering", "Design", "HR", "General"];

export default function WikiEditor() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();

  const { data: doc, isLoading } = trpc.wiki.get.useQuery({ id });
  const { data: linkedIssues } = trpc.wiki.getLinkedIssues.useQuery({ docId: id });
  const { data: allIssues } = trpc.issues.list.useQuery();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkIssue, setShowLinkIssue] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const utils = trpc.useUtils();

  const updateMutation = trpc.wiki.update.useMutation({
    onSuccess: () => {
      utils.wiki.list.invalidate();
      utils.wiki.get.invalidate({ id });
      setIsDirty(false);
      setIsSaving(false);
    },
    onError: () => {
      toast.error("Failed to save");
      setIsSaving(false);
    },
  });

  const deleteMutation = trpc.wiki.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      setLocation("/wiki");
    },
  });

  const linkIssueMutation = trpc.issues.linkToDoc.useMutation({
    onSuccess: () => {
      toast.success("Issue linked");
      utils.wiki.getLinkedIssues.invalidate({ docId: id });
      setShowLinkIssue(false);
    },
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content ?? "");
      setCategory(doc.category ?? "");
    }
  }, [doc]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    setIsSaving(true);
    updateMutation.mutate({ id, title, content, category: category || undefined });
  }, [id, title, content, category, isDirty]);

  // Auto-save on blur
  const handleBlur = () => {
    if (isDirty) handleSave();
  };

  const STATUS_STYLES: Record<string, string> = {
    Backlog: "status-backlog",
    Todo: "status-todo",
    "In Progress": "status-in-progress",
    "In Review": "status-in-review",
    Done: "status-done",
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Document not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/wiki")}>
          Back to Wiki
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setLocation("/wiki")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Wiki
          </Button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm font-medium truncate max-w-xs">{doc.title}</span>
          {doc.templateType && doc.templateType !== "none" && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {({prd:"PRD",meeting:"会议记录",flow:"流程图",competitive:"竞品分析",release:"发布说明",tech_design:"技术方案"} as Record<string,string>)[doc.templateType] || doc.templateType}
            </Badge>
          )}
        </div>
      </PageHeader>
      {/* Toolbar */}
      <div className="flex items-center justify-end px-6 py-2 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {isDirty ? (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3 w-3" /> Unsaved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowLinkIssue(true)}
          >
            <Link2 className="h-3 w-3" />
            Link Issue
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
          >
            <Save className="h-3 w-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Category */}
            <div className="mb-4">
              <Select
                value={category}
                onValueChange={(v) => { setCategory(v); setIsDirty(true); }}
              >
                <SelectTrigger className="h-7 w-36 text-xs border-0 bg-muted/40 hover:bg-muted focus:ring-0">
                  <SelectValue placeholder="Category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              onBlur={handleBlur}
              className="text-3xl font-bold border-0 bg-transparent px-0 h-auto py-1 focus-visible:ring-0 placeholder:text-muted-foreground/30 mb-6"
              placeholder="Untitled"
            />

            {/* Content */}
            <Textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
              onBlur={handleBlur}
              className="min-h-[60vh] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-sm leading-relaxed font-mono text-foreground placeholder:text-muted-foreground/30"
              placeholder="Start writing... (Markdown supported)"
            />
          </div>
        </div>

        {/* Sidebar: Linked Issues */}
        {linkedIssues && linkedIssues.length > 0 && (
          <div className="w-64 border-l border-border/50 p-4 overflow-y-auto bg-muted/20">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              Linked Issues
            </h3>
            <div className="space-y-2">
              {linkedIssues.map((issue: any) => (
                <div
                  key={issue.id}
                  className="p-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <CircleDot className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{issue.title}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] h-4 px-1.5 mt-1 ${STATUS_STYLES[issue.status] || ""}`}
                      >
                        {issue.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link Issue Dialog */}
      <Dialog open={showLinkIssue} onOpenChange={setShowLinkIssue}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Link Issue to Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {allIssues?.map((issue) => {
              const alreadyLinked = linkedIssues?.some((li: any) => li.id === issue.id);
              return (
                <button
                  key={issue.id}
                  disabled={alreadyLinked}
                  onClick={() => linkIssueMutation.mutate({ issueId: issue.id, docId: id })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    alreadyLinked
                      ? "border-emerald-200 bg-emerald-50 opacity-60"
                      : "border-border hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <CircleDot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{issue.title}</span>
                  <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 shrink-0 ${STATUS_STYLES[issue.status] || ""}`}>
                    {issue.status}
                  </Badge>
                  {alreadyLinked && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文档</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，删除后文档将永久丢失。确定要删除这篇文档吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate({ id })}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
