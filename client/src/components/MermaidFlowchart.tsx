import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// Initialize mermaid with custom config
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: "basis",
    padding: 15,
    nodeSpacing: 30,
    rankSpacing: 50,
  },
  themeVariables: {
    primaryColor: "#eff6ff",
    primaryBorderColor: "#93c5fd",
    primaryTextColor: "#1e40af",
    lineColor: "#94a3b8",
    secondaryColor: "#f8fafc",
    tertiaryColor: "#fef3c7",
  },
});

export interface MermaidFlowchartProps {
  content: string;
  selectedNode: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onBack?: () => void;
  title?: string;
  nodeIssues?: Array<{
    nodePath: string;
    issueStatus: string | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "#3b82f6",
  "In Review": "#f59e0b",
  "Todo": "#8b5cf6",
  "Backlog": "#94a3b8",
  "Done": "#10b981",
};

export function MermaidFlowchart({
  content,
  selectedNode,
  onSelectNode,
  onBack,
  title,
  nodeIssues = [],
}: MermaidFlowchartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);

  // Render mermaid diagram
  useEffect(() => {
    if (!svgContainerRef.current || !content.trim()) return;

    const renderDiagram = async () => {
      try {
        setRenderError(null);
        // Generate unique id
        const id = `mermaid-${Date.now()}`;
        svgContainerRef.current!.innerHTML = "";

        const { svg } = await mermaid.render(id, content);
        svgContainerRef.current!.innerHTML = svg;

        // Add click handlers to nodes
        const svgEl = svgContainerRef.current!.querySelector("svg");
        if (svgEl) {
          svgEl.style.maxWidth = "none";
          svgEl.style.cursor = "grab";

          // Find all node elements and add click handlers
          const nodes = svgEl.querySelectorAll(".node");
          nodes.forEach((node) => {
            const nodeEl = node as HTMLElement;
            nodeEl.style.cursor = "pointer";
            nodeEl.style.transition = "filter 0.15s ease-out";

            nodeEl.addEventListener("click", (e) => {
              e.stopPropagation();
              // Extract node label text
              const labelEl = nodeEl.querySelector(".nodeLabel");
              const nodeText = labelEl?.textContent?.trim() || "";
              if (nodeText) {
                onSelectNode(nodeText);
              }
            });

            nodeEl.addEventListener("mouseenter", () => {
              nodeEl.style.filter = "brightness(0.95) drop-shadow(0 2px 4px rgba(0,0,0,0.1))";
            });
            nodeEl.addEventListener("mouseleave", () => {
              nodeEl.style.filter = "";
            });
          });

          // Click on background to deselect
          svgEl.addEventListener("click", (e) => {
            if ((e.target as Element).closest(".node")) return;
            onSelectNode(null);
          });
        }
      } catch (err: any) {
        setRenderError(err?.message || "渲染失败");
      }
    };

    renderDiagram();
  }, [content, onSelectNode]);

  // Highlight selected node and nodes with issues
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const svgEl = svgContainerRef.current.querySelector("svg");
    if (!svgEl) return;

    // Build issue status map for flowchart nodes
    const nodeStatusMap = new Map<string, string>();
    for (const ni of nodeIssues) {
      const existing = nodeStatusMap.get(ni.nodePath);
      const color = STATUS_COLORS[ni.issueStatus || "Backlog"] || "#94a3b8";
      if (!existing) {
        nodeStatusMap.set(ni.nodePath, color);
      }
    }

    const nodes = svgEl.querySelectorAll(".node");
    nodes.forEach((node) => {
      const nodeEl = node as HTMLElement;
      const labelEl = nodeEl.querySelector(".nodeLabel");
      const nodeText = labelEl?.textContent?.trim() || "";

      // Reset styles
      const rect = nodeEl.querySelector("rect, polygon, circle, .basic");
      if (rect) {
        (rect as HTMLElement).style.strokeWidth = "";
        (rect as HTMLElement).style.stroke = "";
      }

      // Highlight selected
      if (nodeText === selectedNode) {
        if (rect) {
          (rect as HTMLElement).style.strokeWidth = "3px";
          (rect as HTMLElement).style.stroke = "#3b82f6";
        }
      }

      // Add status indicator for nodes with issues
      const statusColor = nodeStatusMap.get(nodeText);
      // Remove existing badges
      const existingBadge = nodeEl.querySelector(".flowchart-badge");
      if (existingBadge) existingBadge.remove();

      if (statusColor) {
        const badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        badge.setAttribute("r", "5");
        badge.setAttribute("fill", statusColor);
        badge.setAttribute("stroke", "#fff");
        badge.setAttribute("stroke-width", "2");
        badge.classList.add("flowchart-badge");

        // Position at top-right of node
        const bbox = (nodeEl as unknown as SVGGraphicsElement).getBBox?.();
        if (bbox) {
          badge.setAttribute("cx", String(bbox.x + bbox.width - 2));
          badge.setAttribute("cy", String(bbox.y + 2));
        }
        nodeEl.appendChild(badge);
      }
    });
  }, [selectedNode, nodeIssues]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => setScale((s) => Math.min(s + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(s - 0.2, 0.3)), []);
  const handleFit = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.3, Math.min(3, s + delta)));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest(".node")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="h-full w-full relative bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Header with back button */}
      {(onBack || title) && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              返回思维导图
            </Button>
          )}
          {title && (
            <div className="text-xs font-medium text-muted-foreground bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md px-2.5 py-1.5 border shadow-sm">
              流程图: {title}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2.5 text-[10px] text-muted-foreground bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border shadow-sm">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          <span>进行中</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          <span>审阅</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
          <span>待处理</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>已完成</span>
        </div>
      </div>

      {/* SVG container with pan/zoom */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          ref={svgContainerRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>

      {/* Error display */}
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
          <div className="text-center p-6 max-w-md">
            <p className="text-sm text-destructive font-medium mb-2">Mermaid 渲染错误</p>
            <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-lg overflow-auto max-h-40">
              {renderError}
            </pre>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <button
          className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-sm font-medium hover:bg-blue-50 transition-colors"
          onClick={handleZoomIn}
          title="放大"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-sm font-medium hover:bg-blue-50 transition-colors"
          onClick={handleZoomOut}
          title="缩小"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xs hover:bg-blue-50 transition-colors"
          onClick={handleFit}
          title="适应画布"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Selected node hint */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 text-xs bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
          <span className="text-muted-foreground">选中节点: </span>
          <span className="font-medium text-primary">{selectedNode}</span>
        </div>
      )}
    </div>
  );
}
