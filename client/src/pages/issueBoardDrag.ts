export interface DragPoint {
  x: number;
  y: number;
}

export interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragTransform extends DragPoint {
  scaleX: number;
  scaleY: number;
}

export const DEFAULT_DRAG_PREVIEW_GAP = 12;

export function positionDragOverlayBelowPointer(
  transform: DragTransform,
  draggingRect: DragRect,
  activatorCoordinates: DragPoint,
  gap = DEFAULT_DRAG_PREVIEW_GAP
): DragTransform {
  const pointerOffsetX = activatorCoordinates.x - draggingRect.left;
  const pointerOffsetY = activatorCoordinates.y - draggingRect.top;

  return {
    ...transform,
    x: transform.x + pointerOffsetX - draggingRect.width / 2,
    y: transform.y + pointerOffsetY + gap,
  };
}
