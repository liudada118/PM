import { describe, expect, it } from "vitest";

import { centerDragOverlayOnPointer } from "../client/src/pages/issueBoardDrag";

describe("task-board drag overlay positioning", () => {
  it("centers the overlay on the current pointer position", () => {
    const centered = centerDragOverlayOnPointer(
      { x: 400, y: 200, scaleX: 1, scaleY: 1 },
      { left: 100, top: 50, width: 300, height: 80 },
      { x: 175, y: 70 }
    );

    expect(centered).toEqual({
      x: 325,
      y: 180,
      scaleX: 1,
      scaleY: 1,
    });

    const currentPointer = { x: 175 + 400, y: 70 + 200 };
    const overlayCenter = {
      x: 100 + centered.x + 300 / 2,
      y: 50 + centered.y + 80 / 2,
    };
    expect(overlayCenter).toEqual(currentPointer);
  });

  it("does not shift an overlay activated from its center", () => {
    const transform = { x: 36, y: -24, scaleX: 1, scaleY: 1 };

    expect(
      centerDragOverlayOnPointer(
        transform,
        { left: 20, top: 40, width: 240, height: 72 },
        { x: 140, y: 76 }
      )
    ).toEqual(transform);
  });
});
