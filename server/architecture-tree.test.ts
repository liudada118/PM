import { describe, expect, it } from "vitest";

import {
  architectureTreeToMarkdown,
  parseArchitectureMarkdown,
  treeContainsNodeText,
} from "../client/src/pages/architectureTree";

describe("architecture tree", () => {
  it("keeps second-level headings in business flow order", () => {
    const tree = parseArchitectureMarkdown(
      `# 智能迎宾\n\n## 识别\n\n## 决策\n\n## 执行\n`
    );

    expect(tree.text).toBe("智能迎宾");
    expect(tree.children.map(node => node.text)).toEqual([
      "识别",
      "决策",
      "执行",
    ]);
  });

  it("keeps nested headings and list branches inside their stage", () => {
    const tree = parseArchitectureMarkdown(
      `# 系统\n\n## 识别\n### 人脸检测\n- 活体检测\n  - 风险评分\n\n## 响应\n`
    );
    const recognition = tree.children[0];

    expect(recognition.children[0].text).toBe("人脸检测");
    expect(recognition.children[0].children[0].text).toBe("活体检测");
    expect(recognition.children[0].children[0].children[0].text).toBe(
      "风险评分"
    );
    expect(treeContainsNodeText(recognition, "风险评分")).toBe(true);
  });

  it("ignores mermaid code while building the hierarchy", () => {
    const tree = parseArchitectureMarkdown(
      `# 系统\n\n## 识别\n\n\`\`\`mermaid\nflowchart LR\nA --> B\n\`\`\`\n\n### 输出\n`
    );

    expect(tree.children[0].children.map(node => node.text)).toEqual(["输出"]);
  });

  it("serializes a selected stage as a standalone mind map", () => {
    const tree = parseArchitectureMarkdown(
      `# 系统\n\n## 识别\n### 人脸检测\n### 活体检测\n`
    );
    const markdown = architectureTreeToMarkdown(tree.children[0]);

    expect(markdown).toContain("# 识别");
    expect(markdown).toContain("## 人脸检测");
    expect(markdown).toContain("## 活体检测");
  });
});
