import { describe, expect, it } from "vitest";

import {
  buildArchitectureHybridLayout,
  collectExpandableDetailNodeIds,
  findContainingArchitectureStage,
  HYBRID_LAYOUT,
  selectBusinessArchitectureStages,
} from "../client/src/pages/architectureHybridLayout";
import { parseArchitectureMarkdown } from "../client/src/pages/architectureTree";

const content = `# 订单交付

## 需求确认

### 收集需求

#### 业务访谈

### 确认范围

## 方案实施

### 技术设计

### 开发交付
`;

function buildLayout(
  activeStageId?: string,
  expandedDetailNodeIds?: Set<string>,
  collapsedStageNodeIds?: Set<string>
) {
  const tree = parseArchitectureMarkdown(content);
  return buildArchitectureHybridLayout({
    tree,
    activeStageId: activeStageId ?? tree.children[0].id,
    selectedNode: null,
    nodeIssues: [],
    flowchartNodePaths: new Set(),
    businessStageNames: tree.children.map(stage => stage.text),
    expandedDetailNodeIds:
      expandedDetailNodeIds ??
      new Set([`detail:${tree.children[0].children[0].id}`]),
    collapsedStageNodeIds,
  });
}

describe("buildArchitectureHybridLayout", () => {
  it("uses only explicitly selected business stages", () => {
    const tree = parseArchitectureMarkdown(content);

    expect(selectBusinessArchitectureStages(tree, [])).toEqual([]);
    expect(
      selectBusinessArchitectureStages(tree, [tree.children[1].text]).map(
        stage => stage.id
      )
    ).toEqual([tree.children[1].id]);
  });

  it("lays out the main stages from top to bottom with flow edges", () => {
    const layout = buildLayout();
    const stages = layout.nodes.filter(node => node.kind === "stage");
    const flowEdges = layout.edges.filter(edge => edge.kind === "flow");

    expect(stages).toHaveLength(2);
    expect(stages[0].position.x).toBe(stages[1].position.x);
    expect(stages[1].position.y).toBeGreaterThan(stages[0].position.y);
    expect(flowEdges).toEqual([
      expect.objectContaining({
        source: stages[0].id,
        target: stages[1].id,
      }),
    ]);
  });

  it("expands only the active stage details to the right", () => {
    const layout = buildLayout();
    const activeStage = layout.nodes.find(node => node.active);
    const details = layout.nodes.filter(node => node.kind === "detail");

    expect(activeStage?.label).toBe("需求确认");
    expect(details.map(node => node.label)).toEqual(
      expect.arrayContaining(["收集需求", "业务访谈", "确认范围"])
    );
    expect(details.map(node => node.label)).not.toContain("技术设计");
    expect(
      details.every(
        node =>
          node.position.x >=
          HYBRID_LAYOUT.stageX +
            HYBRID_LAYOUT.stageWidth +
            HYBRID_LAYOUT.detailGapX
      )
    ).toBe(true);
  });

  it("keeps deeper mind-map nodes farther to the right", () => {
    const layout = buildLayout();
    const parent = layout.nodes.find(node => node.label === "收集需求");
    const child = layout.nodes.find(node => node.label === "业务访谈");

    expect(parent?.depth).toBe(1);
    expect(child?.depth).toBe(2);
    expect(child!.position.x).toBeGreaterThan(parent!.position.x);
    expect(
      layout.edges.some(
        edge =>
          edge.kind === "branch" &&
          edge.source === parent?.id &&
          edge.target === child?.id
      )
    ).toBe(true);
  });

  it("switches the right-hand branch when another stage becomes active", () => {
    const tree = parseArchitectureMarkdown(content);
    const layout = buildLayout(tree.children[1].id);
    const details = layout.nodes
      .filter(node => node.kind === "detail")
      .map(node => node.label);

    expect(layout.activeStage?.text).toBe("方案实施");
    expect(details).toEqual(expect.arrayContaining(["技术设计", "开发交付"]));
    expect(details).not.toContain("收集需求");
  });

  it("keeps nested details collapsed until their parent is expanded", () => {
    const tree = parseArchitectureMarkdown(content);
    const collapsed = buildLayout(undefined, new Set());
    const expanded = buildLayout(
      undefined,
      new Set([`detail:${tree.children[0].children[0].id}`])
    );

    expect(collapsed.nodes.map(node => node.label)).not.toContain("业务访谈");
    expect(expanded.nodes.map(node => node.label)).toContain("业务访谈");
  });

  it("collects every expandable detail for the active-stage controls", () => {
    const tree = parseArchitectureMarkdown(
      `# 业务流程\n\n## 当前阶段\n\n### 一级详情\n\n#### 二级详情\n\n##### 末级详情\n\n### 一级叶子\n`
    );
    const stage = tree.children[0];
    const expandableNodeIds = collectExpandableDetailNodeIds(stage);
    const layout = buildArchitectureHybridLayout({
      tree,
      activeStageId: stage.id,
      selectedNode: null,
      nodeIssues: [],
      flowchartNodePaths: new Set(),
      businessStageNames: [stage.text],
      expandedDetailNodeIds: expandableNodeIds,
    });

    expect(expandableNodeIds).toEqual(
      new Set([
        `detail:${stage.children[0].id}`,
        `detail:${stage.children[0].children[0].id}`,
      ])
    );
    expect(layout.nodes.map(node => node.label)).toContain("末级详情");
  });

  it("collapses all active-stage details without losing nested expansion", () => {
    const tree = parseArchitectureMarkdown(content);
    const expandedDetailNodeIds = new Set([
      `detail:${tree.children[0].children[0].id}`,
    ]);
    const collapsed = buildLayout(
      undefined,
      expandedDetailNodeIds,
      new Set([`stage:${tree.children[0].id}`])
    );
    const restored = buildLayout(undefined, expandedDetailNodeIds);

    expect(collapsed.nodes.filter(node => node.kind === "stage")).toHaveLength(
      2
    );
    expect(collapsed.nodes.filter(node => node.kind === "detail")).toHaveLength(
      0
    );
    expect(collapsed.edges.filter(edge => edge.kind === "branch")).toHaveLength(
      0
    );
    expect(collapsed.edges.filter(edge => edge.kind === "flow")).toHaveLength(
      1
    );
    expect(restored.nodes.map(node => node.label)).toContain("业务访谈");
  });

  it("keeps the preferred stage when a detail repeats another stage name", () => {
    const tree = parseArchitectureMarkdown(
      `# 重复名称\n\n## 第一阶段\n\n### 第二阶段\n\n## 第二阶段\n\n### 独立细节\n`
    );
    const stages = tree.children;

    expect(
      findContainingArchitectureStage(stages, "第二阶段", stages[1].id)?.id
    ).toBe(stages[1].id);
  });
});
