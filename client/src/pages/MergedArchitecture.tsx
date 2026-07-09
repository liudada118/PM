import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Network,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Merged Architecture View ───────────────────────────────────────────────
// When a parent project's merged architecture is requested, the backend
// auto-creates a real architecture doc (merging child content on first access).
// This component fetches the docId and redirects to the full ArchitectureEditor.

export default function MergedArchitecture({ projectId }: { projectId: number }) {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.architecture.getMergedForParent.useQuery({ projectId });

  useEffect(() => {
    if (data?.docId) {
      // Redirect to the full architecture editor with the real doc
      navigate(`/architecture/${data.docId}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading || data?.docId) {
    return (
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Network className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
            <p className="text-sm text-muted-foreground">正在加载架构图…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/architecture")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold">总架构图</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <Network className="h-10 w-10 text-destructive/50 mx-auto mb-3" />
            <h3 className="font-medium mb-1">加载失败</h3>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
