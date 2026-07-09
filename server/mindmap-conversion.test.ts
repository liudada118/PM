import { describe, it, expect } from "vitest";

// We test the conversion functions that are used in ArchitectureMarkmap.tsx
// Since they are defined inline in the component, we replicate the logic here for testing

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

function markdownToMindMapData(md: string): MindMapNodeData {
  const lines = md.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return { data: { text: "空架构图" }, children: [] };
  }

  interface ParsedItem {
    text: string;
    level: number;
  }

  const items: ParsedItem[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      items.push({ text: headingMatch[2].trim(), level: headingMatch[1].length });
      continue;
    }
    const listMatch = line.match(/^(\t*)(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      const tabCount = listMatch[1].length;
      items.push({ text: listMatch[3].trim(), level: 7 + tabCount });
      continue;
    }
  }

  if (items.length === 0) {
    return { data: { text: "空架构图" }, children: [] };
  }

  const root: MindMapNodeData = { data: { text: items[0].text }, children: [] };
  const stack: { node: MindMapNodeData; level: number }[] = [{ node: root, level: items[0].level }];

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const newNode: MindMapNodeData = { data: { text: item.text }, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    stack[stack.length - 1].node.children.push(newNode);
    stack.push({ node: newNode, level: item.level });
  }

  return root;
}

function mindMapDataToMarkdown(data: MindMapNodeData): string {
  let content = "";

  function walk(node: MindMapNodeData, level: number) {
    const text = node.data.text || "";
    if (level <= 6) {
      content += "#".repeat(level) + " " + text + "\n\n";
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

describe("Markdown ↔ MindMap Data Conversion", () => {
  it("should convert simple markdown to mind map data", () => {
    const md = `# 系统架构

## 前端

## 后端

## 数据库
`;
    const result = markdownToMindMapData(md);
    expect(result.data.text).toBe("系统架构");
    expect(result.children).toHaveLength(3);
    expect(result.children[0].data.text).toBe("前端");
    expect(result.children[1].data.text).toBe("后端");
    expect(result.children[2].data.text).toBe("数据库");
  });

  it("should convert nested markdown with list items", () => {
    const md = `# 根节点

## 模块A

- 子节点1
- 子节点2
\t- 孙节点1

## 模块B
`;
    const result = markdownToMindMapData(md);
    expect(result.data.text).toBe("根节点");
    expect(result.children).toHaveLength(2);
    expect(result.children[0].data.text).toBe("模块A");
    expect(result.children[0].children).toHaveLength(2);
    expect(result.children[0].children[0].data.text).toBe("子节点1");
    expect(result.children[0].children[1].data.text).toBe("子节点2");
    expect(result.children[0].children[1].children).toHaveLength(1);
    expect(result.children[0].children[1].children[0].data.text).toBe("孙节点1");
    expect(result.children[1].data.text).toBe("模块B");
  });

  it("should handle empty markdown", () => {
    const result = markdownToMindMapData("");
    expect(result.data.text).toBe("空架构图");
    expect(result.children).toHaveLength(0);
  });

  it("should convert mind map data back to markdown", () => {
    const data: MindMapNodeData = {
      data: { text: "系统架构" },
      children: [
        { data: { text: "前端" }, children: [] },
        { data: { text: "后端" }, children: [
          { data: { text: "API" }, children: [] },
          { data: { text: "数据库" }, children: [] },
        ]},
      ],
    };
    const md = mindMapDataToMarkdown(data);
    expect(md).toContain("# 系统架构");
    expect(md).toContain("## 前端");
    expect(md).toContain("## 后端");
    expect(md).toContain("### API");
    expect(md).toContain("### 数据库");
  });

  it("should produce list items for deep nodes (level > 6)", () => {
    const data: MindMapNodeData = {
      data: { text: "Root" },
      children: [{
        data: { text: "L2" },
        children: [{
          data: { text: "L3" },
          children: [{
            data: { text: "L4" },
            children: [{
              data: { text: "L5" },
              children: [{
                data: { text: "L6" },
                children: [{
                  data: { text: "L7-list" },
                  children: [{
                    data: { text: "L8-nested" },
                    children: [],
                  }],
                }],
              }],
            }],
          }],
        }],
      }],
    };
    const md = mindMapDataToMarkdown(data);
    expect(md).toContain("###### L6");
    expect(md).toContain("- L7-list");
    expect(md).toContain("\t- L8-nested");
  });

  it("should roundtrip: markdown → data → markdown preserves structure", () => {
    const originalMd = `# 智能系统

## 感知层

### 传感器

### 摄像头

## 决策层

### 算法

### 模型

## 执行层
`;
    const data = markdownToMindMapData(originalMd);
    const resultMd = mindMapDataToMarkdown(data);
    
    // Verify structure is preserved
    expect(resultMd).toContain("# 智能系统");
    expect(resultMd).toContain("## 感知层");
    expect(resultMd).toContain("### 传感器");
    expect(resultMd).toContain("### 摄像头");
    expect(resultMd).toContain("## 决策层");
    expect(resultMd).toContain("### 算法");
    expect(resultMd).toContain("### 模型");
    expect(resultMd).toContain("## 执行层");
  });

  it("should handle duplicate node names correctly in conversion", () => {
    const md = `# 系统

## 模块A

- 配置
- 日志

## 模块B

- 配置
- 日志
`;
    const data = markdownToMindMapData(md);
    expect(data.children[0].children[0].data.text).toBe("配置");
    expect(data.children[1].children[0].data.text).toBe("配置");
    
    // Both are preserved as separate nodes
    const resultMd = mindMapDataToMarkdown(data);
    const configCount = (resultMd.match(/配置/g) || []).length;
    expect(configCount).toBe(2);
  });

  it("node selection uses text as identifier for issue linking", () => {
    // This test documents the current behavior: node identity is by text
    // The Architecture.tsx uses selectedNode (text) as nodePath for linking
    const data = markdownToMindMapData("# Root\n\n## ChildA\n\n## ChildB\n");
    
    // Simulating what handleNodeActive does
    const simulateNodeActive = (node: MindMapNodeData) => {
      return node.data.text; // This is what gets passed as selectedNode/nodePath
    };
    
    expect(simulateNodeActive(data.children[0])).toBe("ChildA");
    expect(simulateNodeActive(data.children[1])).toBe("ChildB");
  });
});
