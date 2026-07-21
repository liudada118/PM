import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  GitBranch,
  Network,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { parseArchitectureMarkdown } from "./architectureTree";
import {
  buildArchitectureHybridLayout,
  findContainingArchitectureStage,
  type ArchitectureNodeIssue,
} from "./architectureHybridLayout";

interface ArchitectureHybridViewProps {
  content: string;
  selectedNode: string | null;
  onSelectNode: (nodePath: string | null) => void;
  nodeIssues: ArchitectureNodeIssue[];
  flowchartNodePaths?: Set<string>;
  onOpenFlowchart?: (nodePath: string) => void;
}

interface HybridNodeData extends Record<string, unknown> {
  nodePath: string;
  label: string;
  kind: "stage" | "detail";
  stageIndex: number | null;
  depth: number;
  childCount: number;
  issueDone: number;
  issueTotal: number;
  hasFlowchart: boolean;
  expanded: boolean;
  active: boolean;
  selected: boolean;
  nodeId: string;
  onOpenFlowchart?: (nodePath: string) => void;
  onToggleExpanded?: (nodeId: string) => void;
}

type HybridFlowNode = Node<HybridNodeData, "architectureHybrid">;

const STAGE_STYLES = [
  "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-50",
  "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-50",
  "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50",
  "border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-500 dark:bg-rose-950 dark:text-rose-50",
  "border-cyan-400 bg-cyan-50 text-cyan-950 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-50",
];

function FlowchartButton({ data }: { data: HybridNodeData }) {
  if (!data.hasFlowchart || !data.onOpenFlowchart) return null;

  return (
    <button
      type="button"
      className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-current opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10"
      title="打开节点流程图"
      aria-label={`打开 ${data.label} 的流程图`}
      onClick={event => {
        event.stopPropagation();
        data.onOpenFlowchart?.(data.nodePath);
      }}
    >
      <GitBranch className="h-3.5 w-3.5" />
    </button>
  );
}

function HybridArchitectureNode({ data }: NodeProps<HybridFlowNode>) {
  const isStage = data.kind === "stage";
  const stageStyle = STAGE_STYLES[(data.stageIndex ?? 0) % STAGE_STYLES.length];

  return (
    <div
      className={`relative flex h-full w-full items-center gap-2 border px-3 shadow-sm transition-[border-color,box-shadow,background-color] ${
        isStage
          ? `rounded-md border-2 ${stageStyle}`
          : "rounded-md border-border bg-background text-foreground"
      } ${data.active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${
        data.selected && !data.active
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.18)]"
          : ""
      }`}
      aria-label={`${isStage ? "流程阶段" : "细节节点"}：${data.label}`}
    >
      <Handle
        id="flow-top"
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="flow-bottom"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="branch-left"
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="branch-right"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />

      {isStage && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/25 bg-background/80 text-xs font-semibold">
          {String((data.stageIndex ?? 0) + 1).padStart(2, "0")}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 break-all text-sm font-semibold leading-5">
          {data.label}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[10px] opacity-65">
          {data.childCount > 0 && <span>{data.childCount} 个分支</span>}
          {data.issueTotal > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {data.issueDone}/{data.issueTotal}
            </span>
          )}
        </span>
      </span>

      <FlowchartButton data={data} />
      {!isStage && data.childCount > 0 && data.onToggleExpanded && (
        <button
          type="button"
          className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={data.expanded ? "折叠分支" : "展开分支"}
          aria-label={`${data.expanded ? "折叠" : "展开"} ${data.label} 的分支`}
          onClick={event => {
            event.stopPropagation();
            data.onToggleExpanded?.(data.nodeId);
          }}
        >
          {data.expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  architectureHybrid: HybridArchitectureNode,
};

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
  const [expandedDetailNodeIds, setExpandedDetailNodeIds] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    if (!stages.some(stage => stage.id === activeStageId)) {
      setActiveStageId(stages[0]?.id ?? "");
    }
  }, [activeStageId, stages]);

  useEffect(() => {
    if (!selectedNode) return;
    const containingStage = findContainingArchitectureStage(
      stages,
      selectedNode,
      activeStageId
    );
    if (containingStage && containingStage.id !== activeStageId) {
      setActiveStageId(containingStage.id);
    }
  }, [activeStageId, selectedNode, stages]);

  const layout = useMemo(
    () =>
      buildArchitectureHybridLayout({
        tree,
        activeStageId,
        selectedNode,
        nodeIssues,
        flowchartNodePaths: flowchartNodePaths ?? new Set<string>(),
        expandedDetailNodeIds,
      }),
    [
      activeStageId,
      expandedDetailNodeIds,
      flowchartNodePaths,
      nodeIssues,
      selectedNode,
      tree,
    ]
  );

  const handleToggleExpanded = useCallback((nodeId: string) => {
    setExpandedDetailNodeIds(previous => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const nodes = useMemo<HybridFlowNode[]>(
    () =>
      layout.nodes.map(node => ({
        id: node.id,
        type: "architectureHybrid",
        position: node.position,
        width: node.width,
        height: node.height,
        style: { width: node.width, height: node.height },
        draggable: false,
        selectable: true,
        selected: node.selected,
        ariaLabel: `${node.kind === "stage" ? "流程阶段" : "细节节点"}：${node.label}`,
        data: {
          nodePath: node.nodePath,
          label: node.label,
          kind: node.kind,
          stageIndex: node.stageIndex,
          depth: node.depth,
          childCount: node.childCount,
          issueDone: node.issueDone,
          issueTotal: node.issueTotal,
          hasFlowchart: node.hasFlowchart,
          expanded: node.expanded,
          active: node.active,
          selected: node.selected,
          nodeId: node.id,
          onOpenFlowchart,
          onToggleExpanded: handleToggleExpanded,
        },
      })),
    [handleToggleExpanded, layout.nodes, onOpenFlowchart]
  );

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map(edge =>
        edge.kind === "flow"
          ? {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: "flow-bottom",
              targetHandle: "flow-top",
              type: "smoothstep",
              selectable: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 16,
                height: 16,
                color: "#64748b",
              },
              style: { stroke: "#64748b", strokeWidth: 2 },
            }
          : {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: "branch-right",
              targetHandle: "branch-left",
              type: "smoothstep",
              selectable: false,
              style: { stroke: "#94a3b8", strokeWidth: 1.5 },
            }
      ),
    [layout.edges]
  );

  if (!layout.activeStage) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无业务架构
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full bg-background">
      <ReactFlow
        key={`${layout.activeStage.id}:${layout.stages.length}:${Array.from(
          expandedDetailNodeIds
        )
          .sort()
          .join(",")}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1.15 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          const data = node.data as HybridNodeData;
          if (data.kind === "stage") {
            const stage = layout.stages[data.stageIndex ?? 0];
            if (stage) setActiveStageId(stage.id);
          }
          onSelectNode(data.nodePath);
        }}
        onNodeDoubleClick={(_, node) => {
          const data = node.data as HybridNodeData;
          if (data.hasFlowchart) onOpenFlowchart?.(data.nodePath);
        }}
        onPaneClick={() => onSelectNode(null)}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#cbd5e1"
        />
        <Controls position="bottom-left" showInteractive={false} />
        <Panel position="top-left" className="m-4">
          <div className="flex items-center gap-2 border-b border-border/70 bg-background/90 px-1 pb-2 text-sm backdrop-blur-sm">
            <CircleDot className="h-4 w-4 text-primary" />
            <span className="max-w-56 truncate font-semibold">{tree.text}</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {layout.stages.length} 个阶段
            </Badge>
          </div>
        </Panel>
        {layout.activeStage.children.length === 0 && (
          <Panel position="top-right" className="m-4">
            <div className="flex items-center gap-2 bg-background/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <Network className="h-3.5 w-3.5" />
              当前阶段暂无细节分支
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
