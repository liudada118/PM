export interface FlowchartPreviewSize {
  width: number;
  height: number;
}

export const FLOWCHART_PREVIEW_LIMITS = {
  maxWidth: 420,
  maxHeight: 360,
  fallbackWidth: 200,
  fallbackHeight: 120,
} as const;

export function fitFlowchartPreviewSize(
  sourceWidth: number,
  sourceHeight: number
): FlowchartPreviewSize {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return {
      width: FLOWCHART_PREVIEW_LIMITS.fallbackWidth,
      height: FLOWCHART_PREVIEW_LIMITS.fallbackHeight,
    };
  }

  const scale = Math.min(
    1,
    FLOWCHART_PREVIEW_LIMITS.maxWidth / sourceWidth,
    FLOWCHART_PREVIEW_LIMITS.maxHeight / sourceHeight
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function parseSvgLength(value: string | null) {
  if (!value || value.trim().endsWith("%")) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSvgSourceSize(svgElement: Element): FlowchartPreviewSize | null {
  const viewBox = svgElement
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    viewBox?.length === 4 &&
    Number.isFinite(viewBox[2]) &&
    Number.isFinite(viewBox[3]) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  const width = parseSvgLength(svgElement.getAttribute("width"));
  const height = parseSvgLength(svgElement.getAttribute("height"));
  return width && height ? { width, height } : null;
}

export function prepareFlowchartPreviewSvg(svg: string): {
  svg: string;
  width: number;
  height: number;
} {
  if (
    typeof DOMParser === "undefined" ||
    typeof XMLSerializer === "undefined"
  ) {
    return {
      svg,
      width: FLOWCHART_PREVIEW_LIMITS.fallbackWidth,
      height: FLOWCHART_PREVIEW_LIMITS.fallbackHeight,
    };
  }

  try {
    const document = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (document.querySelector("parsererror")) {
      throw new Error("Invalid Mermaid SVG");
    }

    const svgElement = document.documentElement as unknown as SVGSVGElement;
    const sourceSize = getSvgSourceSize(svgElement);
    if (!sourceSize) {
      throw new Error("Mermaid SVG dimensions are missing");
    }

    const previewSize = fitFlowchartPreviewSize(
      sourceSize.width,
      sourceSize.height
    );
    svgElement.setAttribute("width", String(sourceSize.width));
    svgElement.setAttribute("height", String(sourceSize.height));
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgElement.style.maxWidth = "none";

    return {
      svg: new XMLSerializer().serializeToString(svgElement),
      ...previewSize,
    };
  } catch {
    return {
      svg,
      width: FLOWCHART_PREVIEW_LIMITS.fallbackWidth,
      height: FLOWCHART_PREVIEW_LIMITS.fallbackHeight,
    };
  }
}
