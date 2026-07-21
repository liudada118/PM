export interface ArchitectureTreeNode {
  id: string;
  text: string;
  level: number;
  children: ArchitectureTreeNode[];
}

interface ParsedArchitectureItem {
  id: string;
  text: string;
  level: number;
}

function getListLevel(indentation: string): number {
  const expandedWidth = indentation.replace(/\t/g, "  ").length;
  return 7 + Math.floor(expandedWidth / 2);
}

export function parseArchitectureMarkdown(
  markdown: string
): ArchitectureTreeNode {
  const items: ParsedArchitectureItem[] = [];
  let insideCodeBlock = false;

  markdown.split("\n").forEach((line, lineIndex) => {
    if (line.trimStart().startsWith("```")) {
      insideCodeBlock = !insideCodeBlock;
      return;
    }
    if (insideCodeBlock || line.trim() === "") return;

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      items.push({
        id: `line-${lineIndex}`,
        text: heading[2].trim(),
        level: heading[1].length,
      });
      return;
    }

    const listItem = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listItem) {
      items.push({
        id: `line-${lineIndex}`,
        text: listItem[2].trim(),
        level: getListLevel(listItem[1]),
      });
    }
  });

  if (items.length === 0) {
    return { id: "empty-root", text: "空架构图", level: 1, children: [] };
  }

  const first = items[0];
  const root: ArchitectureTreeNode = { ...first, children: [] };
  const stack: Array<{ node: ArchitectureTreeNode; level: number }> = [
    { node: root, level: first.level },
  ];

  for (const item of items.slice(1)) {
    const node: ArchitectureTreeNode = { ...item, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, level: item.level });
  }

  return root;
}

export function architectureTreeToMarkdown(root: ArchitectureTreeNode): string {
  const lines: string[] = [];

  function walk(node: ArchitectureTreeNode, depth: number) {
    if (depth <= 6) {
      lines.push(`${"#".repeat(depth)} ${node.text}`, "");
    } else {
      lines.push(`${"\t".repeat(depth - 7)}- ${node.text}`);
    }
    node.children.forEach(child => walk(child, depth + 1));
  }

  walk(root, 1);
  return lines.join("\n").trimEnd() + "\n";
}

export function treeContainsNodeText(
  root: ArchitectureTreeNode,
  text: string
): boolean {
  if (root.text === text) return true;
  return root.children.some(child => treeContainsNodeText(child, text));
}

export function collectArchitectureNodeTexts(
  root: ArchitectureTreeNode
): Set<string> {
  const texts = new Set<string>();

  function walk(node: ArchitectureTreeNode) {
    texts.add(node.text);
    node.children.forEach(walk);
  }

  walk(root);
  return texts;
}
