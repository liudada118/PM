import { describe, expect, it } from "vitest";

import { createVersionDraftFromSnapshot } from "../client/src/pages/architectureVersioning";

describe("architecture version drafts", () => {
  it("copies a historical snapshot into a new editable draft", () => {
    const draft = createVersionDraftFromSnapshot({
      id: 12,
      version: 4,
      title: "支付系统架构",
      content: "# 支付系统架构\n\n## 收款",
    });

    expect(draft).toEqual({
      base: {
        id: 12,
        version: 4,
        description: "基于 v4 创建",
      },
      title: "支付系统架构",
      content: "# 支付系统架构\n\n## 收款",
    });
  });

  it("turns an empty historical snapshot into editable text", () => {
    const draft = createVersionDraftFromSnapshot({
      id: 3,
      version: 1,
      title: "空白架构",
      content: null,
    });

    expect(draft.content).toBe("");
    expect(draft.base).toEqual({
      id: 3,
      version: 1,
      description: "基于 v1 创建",
    });
  });
});
