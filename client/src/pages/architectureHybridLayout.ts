import {
  collectArchitectureNodeTexts,
  treeContainsNodeText,
  type ArchitectureTreeNode,
} from "./architectureTree";

export interface ArchitectureNodeIssue {
  id: number;
  issueId: number;
  nodePath: string;
  issueTitle: string | null;
  issueStatus: string | null;
  issueType: string | null;
  issuePriority: string | null;
}

export interface ArchitectureHybridLayoutNode {
  id: string;
  kind: "stage" | "detail";
  nodePath: string;
  label: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  stageIndex: number | null;
  depth: number;
  childCount: number;
  issueDone: number;
  issueTotal: number;
  hasFlowchart: boolean;
  expanded: boolean;
  active: boolean;
  selected: boolean;
}

export interface ArchitectureHybridLayoutEdge {
  id: string;
  source: string;
  target: string;
  kind: "flow" | "branch";
}

export interface ArchitectureHybridLayout {
  nodes: ArchitectureHybridLayoutNode[];
  edges: ArchitectureHybridLayoutEdge[];
  stages: ArchitectureTreeNode[];
  activeStage: ArchitectureTreeNode | null;
}

export const HYBRID_LAYOUT = {
  stageX: 48,
  stageY: 56,
  stageWidth: 224,
  stageHeight: 58,
  stageGapY: 24,
  detailGapX: 72,
  detailWidth: 188,
  detailHeight: 54,
  detailGapY: 18,
  detailMaxTextLines: 4,
  detailLineHeight: 20,
  detailVerticalPadding: 18,
  detailMetadataHeight: 16,
} as const;

interface DetailNodeMeasurement {
  node: ArchitectureTreeNode;
  id: string;
  depth: number;
  height: number;
  subtreeHeight: number;
  expanded: boolean;
  progress: ReturnType<typeof getIssueProgress>;
  hasFlowchart: boolean;
  children: DetailNodeMeasurement[];
}

function getTextWidthUnits(value: string) {
  return Array.from(value).reduce((total, character) => {
    if (/\s/.test(character)) return total + 0.35;
    const codePoint = character.codePointAt(0) ?? 0;
    return total + (codePoint <= 0x024f ? 0.62 : 1);
  }, 0);
}

export function getArchitectureDetailNodeHeight({
  label,
  childCount,
  issueTotal,
  hasFlowchart,
}: {
  label: string;
  childCount: number;
  issueTotal: number;
  hasFlowchart: boolean;
}) {
  const actionCount = Number(childCount > 0) + Number(hasFlowchart);
  const labelWidth = Math.max(
    72,
    HYBRID_LAYOUT.detailWidth - 24 - actionCount * 32
  );
  const lineCapacity = labelWidth / 14;
  const estimatedLines = label
    .split(/\r?\n/)
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(getTextWidthUnits(line) / lineCapacity)),
      0
    );
  const visibleLines = Math.min(
    HYBRID_LAYOUT.detailMaxTextLines,
    Math.max(1, estimatedLines)
  );
  const metadataHeight =
    childCount > 0 || issueTotal > 0 ? HYBRID_LAYOUT.detailMetadataHeight : 0;

  return Math.max(
    HYBRID_LAYOUT.detailHeight,
    HYBRID_LAYOUT.detailVerticalPadding +
      visibleLines * HYBRID_LAYOUT.detailLineHeight +
      metadataHeight
  );
}

export function selectBusinessArchitectureStages(
  tree: ArchitectureTreeNode,
  businessStageNames: string[]
): ArchitectureTreeNode[] {
  const candidates = tree.children.length > 0 ? tree.children : [tree];
  const selectedNames = new Set(businessStageNames);
  return candidates.filter(stage => selectedNames.has(stage.text));
}

export function findContainingArchitectureStage(
  stages: ArchitectureTreeNode[],
  selectedNode: string | null,
  preferredStageId: string
): ArchitectureTreeNode | null {
  if (!selectedNode) return null;

  const preferredStage = stages.find(stage => stage.id === preferredStageId);
  if (preferredStage && treeContainsNodeText(preferredStage, selectedNode)) {
    return preferredStage;
  }

  return (
    stages.find(stage => treeContainsNodeText(stage, selectedNode)) ?? null
  );
}

export function collectExpandableDetailNodeIds(
  stage: ArchitectureTreeNode | null
): Set<string> {
  const nodeIds = new Set<string>();

  function walk(node: ArchitectureTreeNode) {
    if (node.children.length > 0) {
      nodeIds.add(`detail:${node.id}`);
    }
    node.children.forEach(walk);
  }

  stage?.children.forEach(walk);
  return nodeIds;
}

function getIssueProgress(
  node: ArchitectureTreeNode,
  issues: ArchitectureNodeIssue[]
) {
  const nodeTexts = collectArchitectureNodeTexts(node);
  const matchingIssues = issues.filter(issue => nodeTexts.has(issue.nodePath));

  return {
    done: matchingIssues.filter(issue => issue.issueStatus === "Done").length,
    total: matchingIssues.length,
  };
}

export function buildArchitectureHybridLayout({
  tree,
  activeStageId,
  selectedNode,
  nodeIssues,
  flowchartNodePaths,
  businessStageNames = [],
  expandedDetailNodeIds = new Set<string>(),
  collapsedStageNodeIds = new Set<string>(),
}: {
  tree: ArchitectureTreeNode;
  activeStageId: string;
  selectedNode: string | null;
  nodeIssues: ArchitectureNodeIssue[];
  flowchartNodePaths: Set<string>;
  businessStageNames?: string[];
  expandedDetailNodeIds?: Set<string>;
  collapsedStageNodeIds?: Set<string>;
}): ArchitectureHybridLayout {
  const stages = selectBusinessArchitectureStages(tree, businessStageNames);
  const activeStage =
    stages.find(stage => stage.id === activeStageId) ?? stages[0] ?? null;
  const nodes: ArchitectureHybridLayoutNode[] = [];
  const edges: ArchitectureHybridLayoutEdge[] = [];

  stages.forEach((stage, index) => {
    const progress = getIssueProgress(stage, nodeIssues);
    nodes.push({
      id: `stage:${stage.id}`,
      kind: "stage",
      nodePath: stage.text,
      label: stage.text,
      position: {
        x: HYBRID_LAYOUT.stageX,
        y:
          HYBRID_LAYOUT.stageY +
          index * (HYBRID_LAYOUT.stageHeight + HYBRID_LAYOUT.stageGapY),
      },
      width: HYBRID_LAYOUT.stageWidth,
      height: HYBRID_LAYOUT.stageHeight,
      stageIndex: index,
      depth: 0,
      childCount: stage.children.length,
      issueDone: progress.done,
      issueTotal: progress.total,
      hasFlowchart: flowchartNodePaths.has(stage.text),
      expanded: false,
      active: stage.id === activeStage?.id,
      selected: selectedNode === stage.text,
    });

    if (index > 0) {
      edges.push({
        id: `flow:${stages[index - 1].id}:${stage.id}`,
        source: `stage:${stages[index - 1].id}`,
        target: `stage:${stage.id}`,
        kind: "flow",
      });
    }
  });

  if (
    !activeStage ||
    activeStage.children.length === 0 ||
    collapsedStageNodeIds.has(`stage:${activeStage.id}`)
  ) {
    return { nodes, edges, stages, activeStage };
  }

  const detailNodes: ArchitectureHybridLayoutNode[] = [];

  function measureDetailNode(
    node: ArchitectureTreeNode,
    depth: number
  ): DetailNodeMeasurement {
    const id = `detail:${node.id}`;
    const expanded = expandedDetailNodeIds.has(id);
    const progress = getIssueProgress(node, nodeIssues);
    const hasFlowchart = flowchartNodePaths.has(node.text);
    const height = getArchitectureDetailNodeHeight({
      label: node.text,
      childCount: node.children.length,
      issueTotal: progress.total,
      hasFlowchart,
    });
    const children = (expanded ? node.children : []).map(child =>
      measureDetailNode(child, depth + 1)
    );
    const childrenHeight =
      children.reduce((total, child) => total + child.subtreeHeight, 0) +
      Math.max(0, children.length - 1) * HYBRID_LAYOUT.detailGapY;

    return {
      node,
      id,
      depth,
      height,
      subtreeHeight: Math.max(height, childrenHeight),
      expanded,
      progress,
      hasFlowchart,
      children,
    };
  }

  function layoutDetailNode(
    measurement: DetailNodeMeasurement,
    parentId: string,
    subtreeTop: number
  ): number {
    const {
      node,
      id,
      depth,
      height,
      subtreeHeight,
      expanded,
      progress,
      hasFlowchart,
      children,
    } = measurement;
    const centerY = subtreeTop + subtreeHeight / 2;
    detailNodes.push({
      id,
      kind: "detail",
      nodePath: node.text,
      label: node.text,
      position: {
        x:
          HYBRID_LAYOUT.stageX +
          HYBRID_LAYOUT.stageWidth +
          HYBRID_LAYOUT.detailGapX +
          (depth - 1) * (HYBRID_LAYOUT.detailWidth + HYBRID_LAYOUT.detailGapX),
        y: centerY - height / 2,
      },
      width: HYBRID_LAYOUT.detailWidth,
      height,
      stageIndex: null,
      depth,
      childCount: node.children.length,
      issueDone: progress.done,
      issueTotal: progress.total,
      hasFlowchart,
      expanded,
      active: false,
      selected: selectedNode === node.text,
    });

    edges.push({
      id: `branch:${parentId}:${id}`,
      source: parentId,
      target: id,
      kind: "branch",
    });

    const childrenHeight =
      children.reduce((total, child) => total + child.subtreeHeight, 0) +
      Math.max(0, children.length - 1) * HYBRID_LAYOUT.detailGapY;
    let childTop = subtreeTop + (subtreeHeight - childrenHeight) / 2;
    children.forEach(child => {
      layoutDetailNode(child, id, childTop);
      childTop += child.subtreeHeight + HYBRID_LAYOUT.detailGapY;
    });

    return centerY;
  }

  const topLevelMeasurements = activeStage.children.map(child =>
    measureDetailNode(child, 1)
  );
  let topLevelTop = 0;
  topLevelMeasurements.forEach(measurement => {
    layoutDetailNode(measurement, `stage:${activeStage.id}`, topLevelTop);
    topLevelTop += measurement.subtreeHeight + HYBRID_LAYOUT.detailGapY;
  });
  const detailTop = Math.min(...detailNodes.map(node => node.position.y));
  const detailBottom = Math.max(
    ...detailNodes.map(node => node.position.y + node.height)
  );
  const detailCenter = (detailTop + detailBottom) / 2;
  const activeStageIndex = stages.findIndex(
    stage => stage.id === activeStage.id
  );
  const activeStageCenter =
    HYBRID_LAYOUT.stageY +
    activeStageIndex * (HYBRID_LAYOUT.stageHeight + HYBRID_LAYOUT.stageGapY) +
    HYBRID_LAYOUT.stageHeight / 2;
  const detailOffsetY = activeStageCenter - detailCenter;

  detailNodes.forEach(node => {
    node.position.y += detailOffsetY;
  });
  nodes.push(...detailNodes);

  return { nodes, edges, stages, activeStage };
}
