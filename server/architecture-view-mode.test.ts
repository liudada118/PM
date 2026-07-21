import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";

import { architectureDocs } from "../drizzle/schema";

describe("architecture document view mode", () => {
  it("keeps existing and unspecified documents in mind-map mode", () => {
    const viewMode = getTableConfig(architectureDocs).columns.find(
      column => column.name === "viewMode"
    );

    expect(viewMode).toMatchObject({
      notNull: true,
      hasDefault: true,
      default: "mindmap",
      enumValues: ["mindmap", "hybrid"],
    });
  });
});
