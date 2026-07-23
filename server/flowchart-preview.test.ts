import { describe, expect, it } from "vitest";

import {
  fitFlowchartPreviewSize,
  FLOWCHART_PREVIEW_LIMITS,
} from "../client/src/pages/flowchartPreview";

describe("fitFlowchartPreviewSize", () => {
  it("preserves a tall flowchart ratio while using the available height", () => {
    expect(fitFlowchartPreviewSize(300, 900)).toEqual({
      width: 120,
      height: FLOWCHART_PREVIEW_LIMITS.maxHeight,
    });
  });

  it("preserves a wide flowchart ratio while using the available width", () => {
    expect(fitFlowchartPreviewSize(900, 300)).toEqual({
      width: FLOWCHART_PREVIEW_LIMITS.maxWidth,
      height: 140,
    });
  });

  it("does not enlarge a small flowchart", () => {
    expect(fitFlowchartPreviewSize(200, 100)).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("uses the legacy thumbnail size for invalid dimensions", () => {
    expect(fitFlowchartPreviewSize(0, Number.NaN)).toEqual({
      width: FLOWCHART_PREVIEW_LIMITS.fallbackWidth,
      height: FLOWCHART_PREVIEW_LIMITS.fallbackHeight,
    });
  });
});
