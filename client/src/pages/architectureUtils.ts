/**
 * Markdown Node Manipulation Helpers for Architecture Editor
 */

/**
 * Find a node in Markdown by its text content.
 * Supports both heading lines (## NodeName) and list items (- NodeName / \t- NodeName).
 * Returns { lineIndex, indent, type } or null.
 */
function findNodeInMarkdown(lines: string[], nodeName: string): { lineIndex: number; indent: number; type: "heading" | "list" } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check heading: # NodeName, ## NodeName, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[2].trim() === nodeName) {
      return { lineIndex: i, indent: headingMatch[1].length, type: "heading" };
    }
    // Check list item: - NodeName, \t- NodeName, \t\t- NodeName, etc.
    const listMatch = line.match(/^(\t*)(\s*)- (.+)$/);
    if (listMatch && listMatch[3].trim() === nodeName) {
      const tabCount = listMatch[1].length;
      return { lineIndex: i, indent: tabCount, type: "list" };
    }
  }
  return null;
}

/**
 * Insert a new node into Markdown content.
 * mode: "child" inserts as a child of the target node.
 * mode: "sibling" inserts as a sibling after the target node's subtree.
 */
export function insertNodeInMarkdown(content: string, targetNode: string, newNodeName: string, mode: "child" | "sibling"): string {
  const lines = content.split("\n");
  const found = findNodeInMarkdown(lines, targetNode);
  if (!found) {
    // Fallback: append as top-level list item
    return content + "\n- " + newNodeName + "\n";
  }

  if (found.type === "heading") {
    if (mode === "child") {
      // Insert a list item under this heading
      // Find the end of this heading's content (next heading of same or higher level)
      const headingLevel = found.indent;
      let insertAt = found.lineIndex + 1;
      for (let i = found.lineIndex + 1; i < lines.length; i++) {
        const hm = lines[i].match(/^(#{1,6})\s/);
        if (hm && hm[1].length <= headingLevel) break;
        insertAt = i + 1;
      }
      lines.splice(insertAt, 0, "- " + newNodeName);
    } else {
      // Sibling: insert a new heading at same level after this section
      const headingLevel = found.indent;
      let insertAt = found.lineIndex + 1;
      for (let i = found.lineIndex + 1; i < lines.length; i++) {
        const hm = lines[i].match(/^(#{1,6})\s/);
        if (hm && hm[1].length <= headingLevel) {
          insertAt = i;
          break;
        }
        insertAt = i + 1;
      }
      lines.splice(insertAt, 0, "", "#".repeat(headingLevel) + " " + newNodeName, "");
    }
  } else {
    // List item
    if (mode === "child") {
      // Insert as a child (one more tab indent)
      const childIndent = "\t".repeat(found.indent + 1);
      // Find end of this node's children
      let insertAt = found.lineIndex + 1;
      for (let i = found.lineIndex + 1; i < lines.length; i++) {
        const lm = lines[i].match(/^(\t*)- /);
        if (lm) {
          if (lm[1].length <= found.indent) break;
          insertAt = i + 1;
        } else if (lines[i].trim() === "" || lines[i].match(/^#{1,6}\s/)) {
          break;
        } else {
          insertAt = i + 1;
        }
      }
      lines.splice(insertAt, 0, childIndent + "- " + newNodeName);
    } else {
      // Sibling: insert at same indent after this node's subtree
      let insertAt = found.lineIndex + 1;
      for (let i = found.lineIndex + 1; i < lines.length; i++) {
        const lm = lines[i].match(/^(\t*)- /);
        if (lm) {
          if (lm[1].length <= found.indent) break;
          insertAt = i + 1;
        } else if (lines[i].trim() === "" || lines[i].match(/^#{1,6}\s/)) {
          break;
        } else {
          insertAt = i + 1;
        }
      }
      const siblingIndent = "\t".repeat(found.indent);
      lines.splice(insertAt, 0, siblingIndent + "- " + newNodeName);
    }
  }

  return lines.join("\n");
}

/**
 * Rename a node in Markdown content.
 */
export function renameNodeInMarkdown(content: string, oldName: string, newName: string): string {
  const lines = content.split("\n");
  const found = findNodeInMarkdown(lines, oldName);
  if (!found) return content;

  if (found.type === "heading") {
    const headingMatch = lines[found.lineIndex].match(/^(#{1,6})\s+/);
    if (headingMatch) {
      lines[found.lineIndex] = headingMatch[0] + newName;
    }
  } else {
    const listMatch = lines[found.lineIndex].match(/^(\t*)(\s*)- /);
    if (listMatch) {
      lines[found.lineIndex] = listMatch[0] + newName;
    }
  }

  return lines.join("\n");
}

/**
 * Remove a node and its children from Markdown content.
 */
export function removeNodeFromMarkdown(content: string, nodeName: string): string {
  const lines = content.split("\n");
  const found = findNodeInMarkdown(lines, nodeName);
  if (!found) return content;

  let removeStart = found.lineIndex;
  let removeEnd = found.lineIndex + 1;

  if (found.type === "heading") {
    const headingLevel = found.indent;
    for (let i = found.lineIndex + 1; i < lines.length; i++) {
      const hm = lines[i].match(/^(#{1,6})\s/);
      if (hm && hm[1].length <= headingLevel) break;
      removeEnd = i + 1;
    }
    // Also remove blank line before if exists
    if (removeStart > 0 && lines[removeStart - 1].trim() === "") removeStart--;
  } else {
    // Remove list item and its children
    for (let i = found.lineIndex + 1; i < lines.length; i++) {
      const lm = lines[i].match(/^(\t*)- /);
      if (lm) {
        if (lm[1].length <= found.indent) break;
        removeEnd = i + 1;
      } else if (lines[i].trim() === "" || lines[i].match(/^#{1,6}\s/)) {
        break;
      } else {
        removeEnd = i + 1;
      }
    }
  }

  lines.splice(removeStart, removeEnd - removeStart);
  return lines.join("\n");
}
