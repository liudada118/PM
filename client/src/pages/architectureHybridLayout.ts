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
} as const;

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

  let leafIndex = 0;
  const detailNodes: ArchitectureHybridLayoutNode[] = [];

  function layoutDetailNode(
    node: ArchitectureTreeNode,
    depth: number,
    parentId: string
  ): number {
    const id = `detail:${node.id}`;
    const expanded = expandedDetailNodeIds.has(id);
    const visibleChildren = expanded ? node.children : [];
    const childCenters = visibleChildren.map(child =>
      layoutDetailNode(child, depth + 1, id)
    );
    const centerY =
      childCenters.length > 0
        ? (childCenters[0] + childCenters[childCenters.length - 1]) / 2
        : leafIndex++ * (HYBRID_LAYOUT.detailHeight + HYBRID_LAYOUT.detailGapY);
    const progress = getIssueProgress(node, nodeIssues);

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
        y: centerY - HYBRID_LAYOUT.detailHeight / 2,
      },
      width: HYBRID_LAYOUT.detailWidth,
      height: HYBRID_LAYOUT.detailHeight,
      stageIndex: null,
      depth,
      childCount: node.children.length,
      issueDone: progress.done,
      issueTotal: progress.total,
      hasFlowchart: flowchartNodePaths.has(node.text),
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

    return centerY;
  }

  const topLevelCenters = activeStage.children.map(child =>
    layoutDetailNode(child, 1, `stage:${activeStage.id}`)
  );
  const detailCenter =
    (topLevelCenters[0] + topLevelCenters[topLevelCenters.length - 1]) / 2;
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
