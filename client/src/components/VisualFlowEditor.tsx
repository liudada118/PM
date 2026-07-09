import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  MarkerType,
  Panel,
  Handle,
  Position,
  type NodeProps,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Square,
  Diamond,
  Circle,
  RectangleHorizontal,
  Type,
} from "lucide-react";

// ─── Custom Node Types ─────────────────────────────────────────────────────

interface CustomNodeData {
  label: string;
  nodeType: "start" | "end" | "process" | "decision" | "subprocess";
  [key: string]: unknown;
}

// Start/End node (rounded)
function StartEndNode({ data, selected }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div
      className={`px-6 py-3 rounded-full border-2 text-center text-sm font-medium min-w-[100px] transition-all ${
        data.nodeType === "start"
          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
          : "bg-red-50 border-red-400 text-red-700"
      } ${selected ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
    </div>
  );
}

// Process node (rectangle)
function ProcessNode({ data, selected }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div
      className={`px-6 py-3 rounded-lg border-2 text-center text-sm font-medium min-w-[120px] bg-blue-50 border-blue-300 text-blue-800 transition-all ${
        selected ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
    </div>
  );
}

// Decision node (diamond shape)
function DecisionNode({ data, selected }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div
      className={`relative w-[140px] h-[80px] flex items-center justify-center transition-all ${
        selected ? "drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !top-[-6px]" />
      <div
        className="absolute inset-0 bg-amber-50 border-2 border-amber-400"
        style={{ transform: "rotate(45deg)", borderRadius: "4px", width: "70%", height: "70%", margin: "auto", top: 0, bottom: 0, left: 0, right: 0, position: "absolute" }}
      />
      <span className="relative z-10 text-xs font-medium text-amber-800 text-center px-2">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !bottom-[-6px]" />
      <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
    </div>
  );
}

// Subprocess node (double border)
function SubprocessNode({ data, selected }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div
      className={`px-6 py-3 rounded-lg border-2 text-center text-sm font-medium min-w-[120px] bg-purple-50 border-purple-300 text-purple-800 transition-all shadow-[inset_0_0_0_3px_rgba(168,85,247,0.15)] ${
        selected ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  startEnd: StartEndNode,
  process: ProcessNode,
  decision: DecisionNode,
  subprocess: SubprocessNode,
};

// ─── Node Palette ──────────────────────────────────────────────────────────

const NODE_PALETTE = [
  { type: "start", label: "开始", icon: Circle, color: "text-emerald-600" },
  { type: "end", label: "结束", icon: Circle, color: "text-red-600" },
  { type: "process", label: "流程", icon: RectangleHorizontal, color: "text-blue-600" },
  { type: "decision", label: "判断", icon: Diamond, color: "text-amber-600" },
  { type: "subprocess", label: "子流程", icon: Square, color: "text-purple-600" },
] as const;

// ─── Data Conversion ───────────────────────────────────────────────────────

export interface FlowData {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

// Convert Mermaid flowchart to React Flow data
export function mermaidToFlowData(mermaid: string): FlowData {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];
  const lines = mermaid.split("\n").map((l) => l.trim()).filter(Boolean);

  // Parse nodes and edges from mermaid syntax
  const nodeMap = new Map<string, { label: string; type: string }>();
  let yPos = 0;

  for (const line of lines) {
    if (line.startsWith("flowchart") || line.startsWith("graph")) continue;

    // Match node definitions with labels: A["label"] or A("label") or A{"label"} or A(["label"])
    const nodeDefRegex = /([A-Za-z0-9_]+)\s*(\["|$$"|{"|$$\[")(.+?)("\]|"$$|"}|"\]$$)/g;
    let match;
    while ((match = nodeDefRegex.exec(line)) !== null) {
      const id = match[1];
      const bracket = match[2];
      const label = match[3];
      let type = "process";
      if (bracket === '(["' || bracket === '("') type = "startEnd";
      if (bracket === '{"') type = "decision";
      nodeMap.set(id, { label, type });
    }

    // Match edges: A --> B or A -->|label| B
    const edgeRegex = /([A-Za-z0-9_]+)\s*-->(\|[^|]*\|)?\s*([A-Za-z0-9_]+)/g;
    let edgeMatch;
    while ((edgeMatch = edgeRegex.exec(line)) !== null) {
      const source = edgeMatch[1];
      const edgeLabel = edgeMatch[2]?.replace(/\|/g, "") || "";
      const target = edgeMatch[3];
      edges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        label: edgeLabel || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      });
      // Ensure nodes exist
      if (!nodeMap.has(source)) nodeMap.set(source, { label: source, type: "process" });
      if (!nodeMap.has(target)) nodeMap.set(target, { label: target, type: "process" });
    }
  }

  // Create nodes (without position yet)
  const nodeIds = Array.from(nodeMap.keys());
  nodeIds.forEach((id) => {
    const info = nodeMap.get(id)!;
    let nodeType: CustomNodeData["nodeType"] = "process";
    if (info.type === "startEnd") {
      nodeType = info.label.includes("开始") || info.label.toLowerCase().includes("start") ? "start" : "end";
    } else if (info.type === "decision") {
      nodeType = "decision";
    } else if (info.type === "subprocess") {
      nodeType = "subprocess";
    }

    const rfNodeType = nodeType === "start" || nodeType === "end" ? "startEnd" : nodeType === "decision" ? "decision" : nodeType === "subprocess" ? "subprocess" : "process";
    nodes.push({
      id,
      type: rfNodeType,
      position: { x: 0, y: 0 },
      data: { label: info.label, nodeType },
    });
  });

  // If no nodes parsed, create default start node
  if (nodes.length === 0) {
    nodes.push({
      id: "start",
      type: "startEnd",
      position: { x: 200, y: 50 },
      data: { label: "开始", nodeType: "start" },
    });
    return { nodes, edges };
  }

  // Apply dagre auto-layout for clean positioning
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Set nodes with estimated dimensions
  for (const node of nodes) {
    const width = node.data.nodeType === "decision" ? 140 : 150;
    const height = node.data.nodeType === "decision" ? 80 : 50;
    g.setNode(node.id, { width, height });
  }

  // Set edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run dagre layout
  dagre.layout(g);

  // Apply calculated positions to nodes
  for (const node of nodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      const width = node.data.nodeType === "decision" ? 140 : 150;
      const height = node.data.nodeType === "decision" ? 80 : 50;
      node.position = {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      };
    }
  }

  return { nodes, edges };
}

// Convert React Flow data to Mermaid flowchart
export function flowDataToMermaid(nodes: Node<CustomNodeData>[], edges: Edge[]): string {
  let mermaid = "flowchart TD\n";

  for (const node of nodes) {
    const id = node.id;
    const label = node.data.label;
    const nodeType = node.data.nodeType;
    if (nodeType === "start" || nodeType === "end") {
      mermaid += `  ${id}(["${label}"])\n`;
    } else if (nodeType === "decision") {
      mermaid += `  ${id}{"${label}"}\n`;
    } else if (nodeType === "subprocess") {
      mermaid += `  ${id}[["${label}"]]\n`;
    } else {
      mermaid += `  ${id}["${label}"]\n`;
    }
  }

  for (const edge of edges) {
    if (edge.label) {
      mermaid += `  ${edge.source} -->|${edge.label}| ${edge.target}\n`;
    } else {
      mermaid += `  ${edge.source} --> ${edge.target}\n`;
    }
  }

  return mermaid;
}

// ─── Main Component ────────────────────────────────────────────────────────

export interface VisualFlowEditorProps {
  initialMermaid?: string;
  onSave: (mermaidContent: string) => void;
  onBack?: () => void;
  title?: string;
  readOnly?: boolean;
  selectedNode?: string | null;
  onSelectNode?: (nodeLabel: string | null) => void;
  nodeIssues?: Array<{ nodePath: string; issueStatus: string | null }>;
}

export function VisualFlowEditor({
  initialMermaid,
  onSave,
  onBack,
  title,
  readOnly = false,
  selectedNode,
  onSelectNode,
  nodeIssues = [],
}: VisualFlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Parse initial data
  const initialData = useMemo(() => {
    if (initialMermaid) return mermaidToFlowData(initialMermaid);
    return {
      nodes: [
        { id: "start", type: "startEnd" as const, position: { x: 250, y: 50 }, data: { label: "开始", nodeType: "start" as const } },
      ],
      edges: [],
    };
  }, [initialMermaid]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [nodes, edges]);

  // Connect handler
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Add new node
  const addNode = useCallback(
    (type: string) => {
      const id = `node_${Date.now()}`;
      let nodeType: CustomNodeData["nodeType"] = "process";
      let rfType = "process";
      let label = "新节点";

      switch (type) {
        case "start":
          nodeType = "start";
          rfType = "startEnd";
          label = "开始";
          break;
        case "end":
          nodeType = "end";
          rfType = "startEnd";
          label = "结束";
          break;
        case "process":
          nodeType = "process";
          rfType = "process";
          label = "流程步骤";
          break;
        case "decision":
          nodeType = "decision";
          rfType = "decision";
          label = "条件判断";
          break;
        case "subprocess":
          nodeType = "subprocess";
          rfType = "subprocess";
          label = "子流程";
          break;
      }

      const newNode: Node<CustomNodeData> = {
        id,
        type: rfType,
        position: { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 },
        data: { label, nodeType },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Delete selected nodes/edges
  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      return eds.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
    });
  }, [setNodes, setEdges, nodes]);

  // Double-click to edit node label
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node<CustomNodeData>) => {
    if (readOnly) return;
    setEditingNode(node.id);
    setEditLabel(node.data.label);
  }, [readOnly]);

  // Save label edit
  const saveLabel = useCallback(() => {
    if (editingNode && editLabel.trim()) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === editingNode ? { ...n, data: { ...n.data, label: editLabel.trim() } } : n
        )
      );
    }
    setEditingNode(null);
    setEditLabel("");
  }, [editingNode, editLabel, setNodes]);

  // Node click for selection callback
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<CustomNodeData>) => {
    onSelectNode?.(node.data.label);
  }, [onSelectNode]);

  // Pane click to deselect
  const onPaneClick = useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);

  // Save handler
  const handleSave = useCallback(() => {
    const mermaid = flowDataToMermaid(nodes as Node<CustomNodeData>[], edges);
    onSave(mermaid);
    setHasChanges(false);
  }, [nodes, edges, onSave]);

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              返回
            </Button>
          )}
          {title && (
            <span className="text-sm font-medium text-muted-foreground">
              流程图: {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              {/* Node palette */}
              <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                {NODE_PALETTE.map((item) => (
                  <Button
                    key={item.type}
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${item.color}`}
                    onClick={() => addNode(item.type)}
                    title={`添加${item.label}节点`}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={deleteSelected}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs"
                onClick={handleSave}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={readOnly ? null : "Delete"}
          className="bg-slate-50/50 dark:bg-slate-900"
        >
          <Controls className="!bg-white/90 !border !shadow-sm !rounded-lg" />
          <MiniMap
            className="!bg-white/90 !border !shadow-sm !rounded-lg"
            nodeColor={(n) => {
              const data = n.data as CustomNodeData;
              if (data.nodeType === "start") return "#10b981";
              if (data.nodeType === "end") return "#ef4444";
              if (data.nodeType === "decision") return "#f59e0b";
              if (data.nodeType === "subprocess") return "#8b5cf6";
              return "#3b82f6";
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#e2e8f0" />

          {/* Instructions panel */}
          {!readOnly && (
            <Panel position="bottom-left" className="!m-3">
              <div className="text-[10px] text-muted-foreground bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm space-y-0.5">
                <p>💡 <strong>拖拽</strong>节点移动位置</p>
                <p>💡 从节点<strong>圆点</strong>拖出连线</p>
                <p>💡 <strong>双击</strong>节点编辑文字</p>
                <p>💡 选中后按 <strong>Delete</strong> 删除</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Node label editor overlay */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingNode(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Type className="h-4 w-4" />
              编辑节点文字
            </h4>
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditingNode(null); }}
              autoFocus
              className="mb-3"
              placeholder="输入节点名称"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingNode(null)}>取消</Button>
              <Button size="sm" onClick={saveLabel}>确定</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
