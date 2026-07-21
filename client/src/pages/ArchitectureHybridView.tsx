import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDot, GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MarkmapView } from "./ArchitectureMarkmap";
import {
  architectureTreeToMarkdown,
  collectArchitectureNodeTexts,
  parseArchitectureMarkdown,
  treeContainsNodeText,
  type ArchitectureTreeNode,
} from "./architectureTree";

interface NodeIssue {
  id: number;
  issueId: number;
  nodePath: string;
  issueTitle: string | null;
  issueStatus: string | null;
  issueType: string | null;
  issuePriority: string | null;
}

interface ArchitectureHybridViewProps {
  content: string;
  selectedNode: string | null;
  onSelectNode: (nodePath: string | null) => void;
  nodeIssues: NodeIssue[];
  flowchartNodePaths?: Set<string>;
  onOpenFlowchart?: (nodePath: string) => void;
}

const STAGE_STYLES = [
  "border-blue-400 bg-blue-50 text-blue-950",
  "border-emerald-400 bg-emerald-50 text-emerald-950",
  "border-amber-400 bg-amber-50 text-amber-950",
  "border-rose-400 bg-rose-50 text-rose-950",
  "border-cyan-400 bg-cyan-50 text-cyan-950",
];

function getStageIssueProgress(
  stage: ArchitectureTreeNode,
  issues: NodeIssue[]
) {
  const nodeTexts = collectArchitectureNodeTexts(stage);
  const stageIssues = issues.filter(issue => nodeTexts.has(issue.nodePath));
  return {
    done: stageIssues.filter(issue => issue.issueStatus === "Done").length,
    total: stageIssues.length,
  };
}

export function ArchitectureHybridView({
  content,
  selectedNode,
  onSelectNode,
  nodeIssues,
  flowchartNodePaths,
  onOpenFlowchart,
}: ArchitectureHybridViewProps) {
  const tree = useMemo(() => parseArchitectureMarkdown(content), [content]);
  const stages = useMemo(
    () => (tree.children.length > 0 ? tree.children : [tree]),
    [tree]
  );
  const [activeStageId, setActiveStageId] = useState(stages[0]?.id ?? "");

  useEffect(() => {
    if (!stages.some(stage => stage.id === activeStageId)) {
      setActiveStageId(stages[0]?.id ?? "");
    }
  }, [activeStageId, stages]);

  useEffect(() => {
    if (!selectedNode) return;
    const containingStage = stages.find(stage =>
      treeContainsNodeText(stage, selectedNode)
    );
    if (containingStage && containingStage.id !== activeStageId) {
      setActiveStageId(containingStage.id);
    }
  }, [activeStageId, selectedNode, stages]);

  const activeStage =
    stages.find(stage => stage.id === activeStageId) ?? stages[0];
  const detailContent = useMemo(
    () => (activeStage ? architectureTreeToMarkdown(activeStage) : ""),
    [activeStage]
  );

  if (!activeStage) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无业务架构
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b bg-zinc-50 px-4 py-3 dark:bg-zinc-950">
        <div className="mb-3 flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" />
          <h2 className="truncate text-sm font-semibold">{tree.text}</h2>
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
            {stages.length} 个阶段
          </Badge>
        </div>

        <div className="overflow-x-auto pb-1">
          <div
            className="flex w-max min-w-full items-center"
            role="tablist"
            aria-label="业务总流程"
          >
            {stages.map((stage, index) => {
              const isActive = stage.id === activeStage.id;
              const progress = getStageIssueProgress(stage, nodeIssues);
              const hasFlowchart = flowchartNodePaths?.has(stage.text) ?? false;

              return (
                <div key={stage.id} className="flex shrink-0 items-center">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`group relative flex h-16 w-56 items-center gap-3 rounded-md border-2 px-3 text-left transition-colors ${
                      STAGE_STYLES[index % STAGE_STYLES.length]
                    } ${isActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-foreground/30"}`}
                    onClick={() => {
                      setActiveStageId(stage.id);
                      onSelectNode(stage.text);
                    }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold leading-tight">
                        {stage.text}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] opacity-70">
                        <span>{stage.children.length} 个分支</span>
                        {progress.total > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {progress.done}/{progress.total}
                          </span>
                        )}
                      </span>
                    </span>
                    {hasFlowchart && (
                      <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    )}
                  </button>

                  {index < stages.length - 1 && (
                    <div
                      className="flex w-12 shrink-0 items-center justify-center text-muted-foreground"
                      aria-hidden="true"
                    >
                      <div className="h-px w-5 bg-border" />
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <MarkmapView
          key={activeStage.id}
          content={detailContent}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onContentChange={() => undefined}
          nodeIssues={nodeIssues}
          flowchartNodePaths={flowchartNodePaths}
          onOpenFlowchart={onOpenFlowchart}
          readonly
        />
      </div>
    </div>
  );
}
