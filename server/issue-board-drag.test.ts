import { describe, expect, it } from "vitest";

import {
  DEFAULT_DRAG_PREVIEW_GAP,
  positionDragOverlayBelowPointer,
} from "../client/src/pages/issueBoardDrag";

describe("task-board drag overlay positioning", () => {
  it("places the overlay directly below the current pointer", () => {
    const positioned = positionDragOverlayBelowPointer(
      { x: 400, y: 200, scaleX: 1, scaleY: 1 },
      { left: 100, top: 50, width: 300, height: 80 },
      { x: 175, y: 70 }
    );

    expect(positioned).toEqual({
      x: 325,
      y: 232,
      scaleX: 1,
      scaleY: 1,
    });

    const currentPointer = { x: 175 + 400, y: 70 + 200 };
    const overlayPosition = {
      centerX: 100 + positioned.x + 300 / 2,
      top: 50 + positioned.y,
    };
    expect(overlayPosition).toEqual({
      centerX: currentPointer.x,
      top: currentPointer.y + DEFAULT_DRAG_PREVIEW_GAP,
    });
  });

  it("supports a custom pointer gap", () => {
    expect(
      positionDragOverlayBelowPointer(
        { x: 36, y: -24, scaleX: 1, scaleY: 1 },
        { left: 20, top: 40, width: 240, height: 72 },
        { x: 140, y: 76 },
        8
      )
    ).toEqual({
      x: 36,
      y: 20,
      scaleX: 1,
      scaleY: 1,
    });
  });
});
