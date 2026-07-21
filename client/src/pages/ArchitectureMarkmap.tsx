import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import { toast } from "sonner";

import mermaid from "mermaid";

// simple-mind-map imports
import MindMap from "simple-mind-map";
// @ts-ignore
import Drag from "simple-mind-map/src/plugins/Drag.js";
// @ts-ignore
import Select from "simple-mind-map/src/plugins/Select.js";
// @ts-ignore
import KeyboardNavigation from "simple-mind-map/src/plugins/KeyboardNavigation.js";

// Register plugins
MindMap.usePlugin(Drag);
MindMap.usePlugin(Select);
MindMap.usePlugin(KeyboardNavigation);

// ─── Markdown ↔ MindMap JSON conversion ─────────────────────────────────────

interface MindMapNodeData {
  data: {
    text: string;
    uid?: string;
    expand?: boolean;
    isActive?: boolean;
    [key: string]: any;
  };
  children: MindMapNodeData[];
}

/**
 * Convert Markdown (heading-based) to simple-mind-map tree data.
 * Preserves ```mermaid code blocks by attaching them to the preceding heading node.
 */
function markdownToMindMapData(md: string): MindMapNodeData {
  const allLines = md.split("\n");
  if (allLines.every((l) => l.trim() === "")) {
    return { data: { text: "空架构图" }, children: [] };
  }

  // First pass: extract mermaid code blocks and associate them with the preceding heading
  // We store: headingText -> mermaidContent
  const mermaidBlocks = new Map<number, string>(); // lineIndex of heading -> mermaid content
  const mermaidLineRanges: [number, number][] = []; // [start, end] of ```mermaid blocks to skip

  let i = 0;
  while (i < allLines.length) {
    if (allLines[i].trim() === "```mermaid") {
      const start = i;
      i++;
      let mermaidContent = "";
      while (i < allLines.length && allLines[i].trim() !== "```") {
        mermaidContent += allLines[i] + "\n";
        i++;
      }
      if (i < allLines.length) i++; // skip closing ```
      mermaidLineRanges.push([start, i - 1]);

      // Find the last heading before this mermaid block
      for (let j = start - 1; j >= 0; j--) {
        const hMatch = allLines[j].match(/^(#{1,6})\s+(.+)$/);
        if (hMatch) {
          mermaidBlocks.set(j, mermaidContent.trim());
          break;
        }
      }
    } else {
      i++;
    }
  }

  // Second pass: parse headings and list items, skipping mermaid blocks
  interface ParsedItem {
    text: string;
    level: number;
    lineIndex: number;
    mermaid?: string;
  }

  const items: ParsedItem[] = [];
  const isInMermaidRange = (lineIdx: number) =>
    mermaidLineRanges.some(([s, e]) => lineIdx >= s && lineIdx <= e);

  for (let li = 0; li < allLines.length; li++) {
    if (isInMermaidRange(li)) continue;
    const line = allLines[li];
    if (line.trim() === "") continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const item: ParsedItem = {
        text: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lineIndex: li,
      };
      if (mermaidBlocks.has(li)) {
        item.mermaid = mermaidBlocks.get(li);
      }
      items.push(item);
      continue;
    }
    const listMatch = line.match(/^(\t*)(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      const tabCount = listMatch[1].length;
      items.push({ text: listMatch[3].trim(), level: 7 + tabCount, lineIndex: li });
      continue;
    }
  }

  if (items.length === 0) {
    return { data: { text: "空架构图" }, children: [] };
  }

  // Build tree from flat items
  const rootData: any = { text: items[0].text };
  if (items[0].mermaid) rootData.mermaid = items[0].mermaid;
  const root: MindMapNodeData = { data: rootData, children: [] };
  const stack: { node: MindMapNodeData; level: number }[] = [{ node: root, level: items[0].level }];

  for (let idx = 1; idx < items.length; idx++) {
    const item = items[idx];
    const nodeData: any = { text: item.text };
    if (item.mermaid) nodeData.mermaid = item.mermaid;
    const newNode: MindMapNodeData = { data: nodeData, children: [] };

    // If this node has a mermaid flowchart, add a special child node as flowchart placeholder
    if (item.mermaid) {
      const flowchartChild: MindMapNodeData = {
        data: {
          text: "⚡ 流程图",
          uid: `flowchart_${item.text}`,
          isFlowchartNode: true,
          parentNodeText: item.text,
          mermaidContent: item.mermaid,
          // Style: make it look like a special node
          fillColor: "#f0f9ff",
          borderColor: "#60a5fa",
          borderWidth: 2,
          fontSize: 12,
          fontWeight: "500",
          borderRadius: 8,
        } as any,
        children: [],
      };
      newNode.children.push(flowchartChild);
    }

    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    stack[stack.length - 1].node.children.push(newNode);
    stack.push({ node: newNode, level: item.level });
  }

  return root;
}

/**
 * Convert simple-mind-map tree data back to Markdown.
 * Preserves mermaid code blocks stored in node.data.mermaid.
 */
function mindMapDataToMarkdown(data: MindMapNodeData): string {
  let content = "";

  function walk(node: MindMapNodeData, level: number) {
    const text = node.data.text || "";
    // Skip flowchart placeholder child nodes - they are presentation-only
    if ((node.data as any).isFlowchartNode) return;
    if (level <= 6) {
      content += "#".repeat(level) + " " + text + "\n";
      // If this heading has an embedded mermaid block, output it
      if (node.data.mermaid) {
        content += "```mermaid\n" + node.data.mermaid + "\n```\n";
      }
      content += "\n";
    } else {
      const indent = "\t".repeat(level - 7);
      content += indent + "- " + text + "\n";
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, level + 1);
      }
    }
  }

  walk(data, 1);
  return content;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface NodeIssue {
  id: number;
  issueId: number;
  nodePath: string;
  issueTitle: string | null;
  issueStatus: string | null;
  issueType: string | null;
  issuePriority: string | null;
}

export interface MarkmapActions {
  undo: () => void;
  setNodeImage: (url: string, title: string, width: number, height: number) => void;
}

interface MarkmapViewProps {
  content: string;
  selectedNode: string | null;
  onSelectNode: (path: string | null) => void;
  onContentChange: (newContent: string) => void;
  nodeIssues: NodeIssue[];
  flowchartNodePaths?: Set<string>;
  onOpenFlowchart?: (nodePath: string) => void;
  readonly?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MarkmapView = forwardRef<MarkmapActions, MarkmapViewProps>(
  ({ content, selectedNode, onSelectNode, onContentChange, nodeIssues, flowchartNodePaths, onOpenFlowchart, readonly: readonlyProp = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mindMapRef = useRef<any>(null);
    const [initialized, setInitialized] = useState(false);
    const contentRef = useRef(content);
    contentRef.current = content;
    const suppressDataChangeRef = useRef(false);
    const isUpdatingFromExternalRef = useRef(false);
    const lastSyncedContentRef = useRef(content);

    // Expose undo and setNodeImage actions
    useImperativeHandle(ref, () => ({
      undo: () => {
        if (mindMapRef.current) {
          mindMapRef.current.execCommand("BACK");
          toast.info("已撤回");
        }
      },
      setNodeImage: (url: string, title: string, width: number, height: number) => {
        if (!mindMapRef.current) return;
        const mindMap = mindMapRef.current;
        const activeNodes = mindMap.renderer?.activeNodeList;
        if (activeNodes && activeNodes.length > 0) {
          activeNodes.forEach((node: any) => {
            mindMap.execCommand("SET_NODE_IMAGE", node, {
              url,
              title,
              width: Math.min(width, 200),
              height: Math.min(height, 200),
            });
          });
        }
      },
    }), []);

    // Initialize mind map
    useEffect(() => {
      if (!containerRef.current || mindMapRef.current) return;
      const el = containerRef.current;
      let disposed = false;
      let initFrameId: number | null = null;
      let collapseTimer: ReturnType<typeof setTimeout> | null = null;
      let fitTimer: ReturnType<typeof setTimeout> | null = null;

      // Wait for container to have dimensions
      const initMindMap = () => {
        if (disposed) return;
        if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
          // Retry on next frame
          initFrameId = requestAnimationFrame(initMindMap);
          return;
        }

      const data = markdownToMindMapData(content);

      const mindMap = new MindMap({
        el,
        data,
        layout: "logicalStructure",
        theme: "default",
        themeConfig: {
          // Custom theme for a clean, modern look
          paddingX: 20,
          paddingY: 8,
          lineWidth: 1.5,
          lineColor: "#94a3b8",
          lineStyle: "straight",
          lineRadius: 6,
          rootLineKeepSameInCurve: false,
          backgroundColor: "transparent",
          // Root node style
          root: {
            fillColor: "#3b82f6",
            color: "#ffffff",
            borderColor: "#2563eb",
            borderWidth: 2,
            fontSize: 18,
            fontWeight: "bold",
            borderRadius: 8,
          },
          // Second level
          second: {
            fillColor: "#eff6ff",
            color: "#1e40af",
            borderColor: "#93c5fd",
            borderWidth: 1.5,
            fontSize: 15,
            fontWeight: "500",
            borderRadius: 6,
          },
          // Third level and below
          node: {
            fillColor: "#f8fafc",
            color: "#334155",
            borderColor: "#cbd5e1",
            borderWidth: 1,
            fontSize: 14,
            borderRadius: 4,
          },
          // Generalization node
          generalization: {
            fillColor: "#fef3c7",
            color: "#92400e",
            borderColor: "#fbbf24",
            borderWidth: 1,
            fontSize: 13,
          },
        },
        // Enable text auto-wrap
        textAutoWrapWidth: 300,
        // Default text for new nodes
        defaultInsertSecondLevelNodeText: "新节点",
        defaultInsertBelowSecondLevelNodeText: "新节点",
        // Expand button
        expandBtnStyle: {
          color: "#64748b",
          fill: "#f1f5f9",
          fontSize: 12,
          strokeColor: "#94a3b8",
        },
        // Enable node rich text editing (inline)
        readonly: readonlyProp,
        enableAutoEnterTextEditWhenInsertNode: true,
        // Zoom settings
        minZoomRatio: 20,
        maxZoomRatio: 400,
        scaleRatio: 0.2,
        // Mouse wheel behavior
        mousewheelAction: "zoom",
        mousewheelZoomActionReverse: true,
        // Fit canvas on init
        initRootNodePosition: ["center", "center"],
        // Keyboard shortcuts are built-in (Tab, Enter, Delete, etc.)
        // Append text edit box to container instead of body to fix position offset
        customInnerElsAppendTo: el,
      });

      mindMapRef.current = mindMap;
      setInitialized(true);

      // Default collapse to level 2 (show only root + second level)
      collapseTimer = setTimeout(() => {
        if (!disposed && mindMapRef.current === mindMap && mindMap.renderer) {
          mindMap.execCommand('UNEXPAND_TO_LEVEL', 2);
          if (readonlyProp) {
            fitTimer = setTimeout(() => {
              if (disposed || mindMapRef.current !== mindMap) return;
              try {
                mindMap.view?.fit();
              } catch {
                // The SVG may still be settling after a rapid stage switch.
              }
            }, 150);
          }
        }
      }, 100);

      // Fix: reposition inline edit box when canvas is panned/translated
      mindMap.on("view_data_change", () => {
        const te = (mindMap as any).textEdit;
        if (te && te.showTextEdit) {
          te.updateTextEditNode();
        }
      });

      // Note: auto-fit removed to prevent node/input-box separation bug
      }; // end initMindMap

      // Kick off initialization
      initFrameId = requestAnimationFrame(initMindMap);

      return () => {
        disposed = true;
        if (initFrameId !== null) cancelAnimationFrame(initFrameId);
        if (collapseTimer) clearTimeout(collapseTimer);
        if (fitTimer) clearTimeout(fitTimer);
        if (mindMapRef.current) {
          mindMapRef.current.destroy();
          mindMapRef.current = null;
          setInitialized(false);
        }
      };
    }, []);

    // Listen to data changes from mind map and sync back to Markdown
    useEffect(() => {
      if (!mindMapRef.current) return;
      const mindMap = mindMapRef.current;

      const handleDataChange = (data: MindMapNodeData) => {
        if (suppressDataChangeRef.current || isUpdatingFromExternalRef.current) return;
        // Only sync if text content actually changed (ignore position-only changes from drag)
        const newMarkdown = mindMapDataToMarkdown(data);
        if (newMarkdown.trim() !== contentRef.current.trim()) {
          contentRef.current = newMarkdown;
          lastSyncedContentRef.current = newMarkdown;
          // Use a microtask to batch multiple rapid changes
          Promise.resolve().then(() => {
            if (contentRef.current === newMarkdown) {
              onContentChange(newMarkdown);
            }
          });
        }
      };

      mindMap.on("data_change", handleDataChange);
      return () => {
        mindMap.off("data_change", handleDataChange);
      };
    }, [onContentChange, initialized]);

    // Listen to node activation (selection)
    useEffect(() => {
      if (!mindMapRef.current) return;
      const mindMap = mindMapRef.current;

      const handleNodeActive = (node: any, activeNodeList: any[]) => {
        if (activeNodeList && activeNodeList.length > 0) {
          const activeNode = activeNodeList[0];
          const text = activeNode.getData("text") || "";
          if (text && text !== "空架构图") {
            onSelectNode(text);
          }
        } else {
          onSelectNode(null);
        }
      };

      mindMap.on("node_active", handleNodeActive);

      // Ensure clicking blank area deselects nodes (backup for built-in draw_click)
      const handleDrawClick = () => {
        // If no nodes are active after the built-in handler runs, ensure parent state is cleared
        setTimeout(() => {
          const activeList = mindMap.renderer?.activeNodeList;
          if (!activeList || activeList.length === 0) {
            onSelectNode(null);
          }
        }, 10);
      };
      mindMap.on("draw_click", handleDrawClick);

      // Double-click on flowchart node to open flowchart view
      // We need to intercept BEFORE TextEdit shows up, so we use a high-priority listener
      const handleNodeDblClick = (node: any, e: any) => {
        if (!node || !onOpenFlowchart) return;
        const text = node.getData("text") || "";
        
        // Check if this is a flowchart placeholder child node
        const isFlowchartChild = node.getData("isFlowchartNode");
        if (isFlowchartChild) {
          const parentText = node.getData("parentNodeText") || "";
          if (parentText && mindMap.textEdit) {
            mindMap.textEdit.hideEditTextBox();
          }
          if (parentText) onOpenFlowchart(parentText);
          return;
        }
        
        // Also check if the node itself has a flowchart (original behavior)
        if (flowchartNodePaths?.has(text)) {
          if (mindMap.textEdit) {
            mindMap.textEdit.hideEditTextBox();
          }
          onOpenFlowchart(text);
        }
      };
      mindMap.on("node_dblclick", handleNodeDblClick);

      return () => {
        mindMap.off("node_active", handleNodeActive);
        mindMap.off("draw_click", handleDrawClick);
        mindMap.off("node_dblclick", handleNodeDblClick);
      };
    }, [onSelectNode, initialized, onOpenFlowchart, flowchartNodePaths]);

    // Update mind map when content changes externally (e.g., from Markdown editor)
    useEffect(() => {
      if (!mindMapRef.current || !initialized) return;
      // If the content was just synced from mind map -> parent, skip re-applying
      if (content === lastSyncedContentRef.current && contentRef.current === content) {
        return;
      }
      const mindMap = mindMapRef.current;
      const currentData = mindMap.getData();
      const currentMarkdown = mindMapDataToMarkdown(currentData);

      // Only update if content actually differs from what's in the mind map
      if (content.trim() !== currentMarkdown.trim()) {
        isUpdatingFromExternalRef.current = true;
        const newData = markdownToMindMapData(content);
        mindMap.setData(newData);
        lastSyncedContentRef.current = content;
        setTimeout(() => {
          isUpdatingFromExternalRef.current = false;
        }, 200);
      }
    }, [content, initialized]);

    // Highlight nodes with linked issues - show status color
    useEffect(() => {
      if (!mindMapRef.current || !initialized) return;
      const mindMap = mindMapRef.current;

      // Build a map: nodePath -> best status (priority: In Progress > In Review > Todo > Backlog > Done)
      const STATUS_PRIORITY: Record<string, number> = {
        "In Progress": 5,
        "In Review": 4,
        "Todo": 3,
        "Backlog": 2,
        "Done": 1,
      };
      const STATUS_COLORS: Record<string, string> = {
        "In Progress": "#3b82f6", // blue
        "In Review": "#f59e0b",   // amber
        "Todo": "#8b5cf6",        // violet
        "Backlog": "#94a3b8",     // slate
        "Done": "#10b981",        // emerald
      };

      // Calculate dominant status for each node
      const nodeStatusMap = new Map<string, { color: string; count: number; doneCount: number; totalCount: number }>();
      for (const ni of nodeIssues) {
        const existing = nodeStatusMap.get(ni.nodePath);
        const status = ni.issueStatus || "Backlog";
        const priority = STATUS_PRIORITY[status] || 0;
        const isDone = status === "Done";
        if (!existing) {
          nodeStatusMap.set(ni.nodePath, {
            color: STATUS_COLORS[status] || "#94a3b8",
            count: priority,
            doneCount: isDone ? 1 : 0,
            totalCount: 1,
          });
        } else {
          existing.totalCount++;
          if (isDone) existing.doneCount++;
          if (priority > existing.count) {
            existing.count = priority;
            existing.color = STATUS_COLORS[status] || "#94a3b8";
          }
        }
      }

      // Track dragging state to pause highlights during pan/zoom
      let isDragging = false;
      let highlightTimer: ReturnType<typeof setTimeout> | null = null;

      const doApplyHighlights = () => {
        try {
          const root = mindMap.renderer?.root;
          if (!root) return;

          const walkNodes = (node: any) => {
            if (!node) return;
            const text = node.getData("text") || "";
            const el = node.group;
            if (!el) {
              if (node.children) node.children.forEach(walkNodes);
              return;
            }
            // Remove previous custom highlights safely
            try {
              const existingBadge = el.findOne(".issue-badge");
              if (existingBadge) existingBadge.remove();
              const existingCount = el.findOne(".issue-count");
              if (existingCount) existingCount.remove();
              const existingBg = el.findOne(".issue-bg");
              if (existingBg) existingBg.remove();
              const existingFlowIcon = el.findOne(".flowchart-icon");
              if (existingFlowIcon) existingFlowIcon.remove();
            } catch {
              // SVG element may have been removed by re-render
            }

            // Use node.width/height directly (stable, no DOM query needed)
            const nodeWidth = node.width || 0;
            const nodeHeight = node.height || 0;
            if (nodeWidth === 0) {
              if (node.children) node.children.forEach(walkNodes);
              return;
            }

            const statusInfo = nodeStatusMap.get(text);
            if (statusInfo) {
              try {
                // Full background color for the node - strong enough to be visible
                const bgRect = el.rect(nodeWidth + 8, nodeHeight + 6)
                  .fill(statusInfo.color + "40") // ~25% opacity background
                  .stroke({ color: statusInfo.color, width: 2.5 })
                  .radius(6)
                  .move(-4, -3);
                bgRect.addClass("issue-bg");
                bgRect.back(); // Send to back so text stays on top

                // Badge: show task count as a small pill at top-right corner
                const badgeGroup = el.group().addClass("issue-badge");
                if (statusInfo.totalCount > 1) {
                  // Multiple tasks: show progress like "2/5"
                  const progressLabel = `${statusInfo.doneCount}/${statusInfo.totalCount}`;
                  const badgeWidth = 30;
                  badgeGroup.rect(badgeWidth, 14)
                    .fill(statusInfo.color)
                    .radius(7)
                    .move(nodeWidth - badgeWidth / 2, -10);
                  badgeGroup.text(progressLabel)
                    .font({ size: 8, weight: "bold", family: "system-ui" })
                    .fill("#ffffff")
                    .move(nodeWidth - badgeWidth / 2 + 4, -9);
                } else {
                  // Single task: show a small colored dot indicator
                  badgeGroup.circle(10)
                    .fill(statusInfo.color)
                    .stroke({ color: "#ffffff", width: 1.5 })
                    .move(nodeWidth - 2, -5);
                }
              } catch {
                // ignore
              }
            }

            // Flowchart icon for nodes that have an embedded flowchart (parent nodes)
            if (flowchartNodePaths?.has(text)) {
              try {
                const icon = el.text("⚡")
                  .font({ size: 11, family: "system-ui" })
                  .move(nodeWidth - 14, nodeHeight - 4);
                icon.addClass("flowchart-icon");
                icon.attr("cursor", "pointer");
                icon.attr("title", "双击查看流程图");
              } catch {
                // ignore
              }
            }

            // For flowchart child nodes, set image via mind map API so layout reserves space
            const isFlowchartChild = node.getData("isFlowchartNode");
            if (isFlowchartChild) {
              try {
                const mermaidContent = node.getData("mermaidContent");
                if (mermaidContent && !node._flowchartImageSet) {
                  node._flowchartImageSet = true;
                  const thumbId = `fc-thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                  mermaid.render(thumbId, mermaidContent).then(({ svg }) => {
                    try {
                      // Convert SVG to data URL for use as node image
                      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
                      const url = URL.createObjectURL(svgBlob);
                      // Use SET_NODE_IMAGE command so layout accounts for the image size
                      mindMap.execCommand("SET_NODE_IMAGE", node, {
                        url,
                        title: "流程图预览",
                        width: 200,
                        height: 120,
                        custom: true,
                      });
                    } catch {
                      // ignore render errors
                    }
                  }).catch(() => {});
                }
              } catch {
                // ignore
              }
            }

            if (node.children) node.children.forEach(walkNodes);
          };

          walkNodes(root);
        } catch {
          // Catch any unexpected errors to prevent component crash
        }
      };

      const applyHighlights = () => {
        // Skip if currently dragging/panning to avoid SVG conflicts
        if (isDragging) return;
        // Debounce to avoid rapid consecutive calls
        if (highlightTimer) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(doApplyHighlights, 50);
      };

      // Pause highlights during canvas drag/pan
      const handleDragStart = () => {
        isDragging = true;
      };
      const handleDragEnd = () => {
        isDragging = false;
        // Re-apply highlights after drag ends (with small delay for stability)
        if (highlightTimer) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(doApplyHighlights, 150);
      };

      // Mark dragging on view_data_change (fired during pan/zoom transform)
      const handleViewChange = () => {
        isDragging = true;
        // Auto-reset after a short idle (in case mouseup is missed)
        if (highlightTimer) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => {
          isDragging = false;
          doApplyHighlights();
        }, 200);
      };

      mindMap.on("drag", handleDragStart);
      mindMap.on("mouseup", handleDragEnd);
      mindMap.on("scale", handleDragStart);
      mindMap.on("view_data_change", handleViewChange);

      // Apply after render (but NOT during drag/pan)
      mindMap.on("node_tree_render_end", applyHighlights);
      // Also apply immediately
      setTimeout(doApplyHighlights, 300);

      return () => {
        mindMap.off("node_tree_render_end", applyHighlights);
        mindMap.off("drag", handleDragStart);
        mindMap.off("mouseup", handleDragEnd);
        mindMap.off("scale", handleDragStart);
        mindMap.off("view_data_change", handleViewChange);
        if (highlightTimer) clearTimeout(highlightTimer);
      };
    }, [nodeIssues, initialized, flowchartNodePaths]);

    // Handle external selectedNode change (e.g., from URL query or issue link click)
    useEffect(() => {
      if (!mindMapRef.current || !initialized || !selectedNode) return;
      const mindMap = mindMapRef.current;

      // Find and activate the node with matching text
      const findAndActivateNode = (node: any): boolean => {
        if (!node) return false;
        const text = node.getData("text") || "";
        if (text === selectedNode) {
          // Activate this node
          mindMap.execCommand("SET_NODE_ACTIVE", node, true);
          // Note: moveNodeToCenter removed to prevent node/input-box separation bug
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (findAndActivateNode(child)) return true;
          }
        }
        return false;
      };

      setTimeout(() => {
        const root = mindMap.renderer?.root;
        if (root) {
          findAndActivateNode(root);
        }
      }, 300);
    }, [selectedNode, initialized]);

    // ─── Zoom controls ───────────────────────────────────────────────────────
    const handleFit = useCallback(() => {
      mindMapRef.current?.view?.fit();
    }, []);
    const handleZoomIn = useCallback(() => {
      mindMapRef.current?.view?.enlarge();
    }, []);
    const handleZoomOut = useCallback(() => {
      mindMapRef.current?.view?.narrow();
    }, []);
    const handleCenter = useCallback(() => {
      mindMapRef.current?.view?.reset();
    }, []);
    const handleExpandAll = useCallback(() => {
      if (mindMapRef.current) {
        mindMapRef.current.execCommand('EXPAND_ALL');
        // Fit view after expanding
        setTimeout(() => mindMapRef.current?.view?.fit(), 300);
      }
    }, []);
    const handleCollapseAll = useCallback(() => {
      if (mindMapRef.current) {
        mindMapRef.current.execCommand('UNEXPAND_TO_LEVEL', 2);
        // Fit view after collapsing
        setTimeout(() => mindMapRef.current?.view?.fit(), 300);
      }
    }, []);

    return (
      <div className="h-full w-full relative bg-gradient-to-br from-blue-50/30 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Mind map container */}
        <div
          ref={containerRef}
          className="absolute inset-0"
        />

        {/* Shortcuts hint - only when node selected */}
        {selectedNode && !readonlyProp && (
          <div className="absolute top-3 left-3 text-[10px] text-muted-foreground bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm space-y-0.5 pointer-events-none">
            <p className="font-medium text-xs text-foreground mb-1 opacity-80">快捷键</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded font-mono">Tab</kbd> 子节点 · <kbd className="px-1 py-0.5 bg-muted rounded font-mono">Enter</kbd> 兄弟节点</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded font-mono">Del</kbd> 删除 · <kbd className="px-1 py-0.5 bg-muted rounded font-mono">双击</kbd> 编辑</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded font-mono">←→↑↓</kbd> 导航 · <kbd className="px-1 py-0.5 bg-muted rounded font-mono">Ctrl+Z</kbd> 撤回</p>
          </div>
        )}

        {/* Legend - status colors */}
        <div className="absolute top-3 right-3 flex items-center gap-2.5 text-[10px] text-muted-foreground bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border shadow-sm">
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
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
            <span>待办</span>
          </div>
        </div>

        {/* Zoom & expand/collapse controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xs hover:bg-blue-50 transition-colors"
            onClick={handleExpandAll}
            title="一键展开所有节点"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/></svg>
          </button>
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xs hover:bg-blue-50 transition-colors"
            onClick={handleCollapseAll}
            title="一键折叠所有节点"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5-5 5 5"/><path d="m7 9 5 5 5-5"/></svg>
          </button>
          <div className="h-px w-5 mx-auto bg-border my-0.5" />
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-sm font-medium hover:bg-blue-50 transition-colors"
            onClick={handleZoomIn}
            title="放大"
          >+</button>
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-sm font-medium hover:bg-blue-50 transition-colors"
            onClick={handleZoomOut}
            title="缩小"
          >−</button>
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xs hover:bg-blue-50 transition-colors"
            onClick={handleFit}
            title="适应画布"
          >⊞</button>
          <button
            className="w-7 h-7 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xs hover:bg-blue-50 transition-colors"
            onClick={handleCenter}
            title="回到中心"
          >⊙</button>
        </div>
      </div>
    );
  }
);

MarkmapView.displayName = "MarkmapView";
