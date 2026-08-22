import { domToBlob } from "modern-screenshot";

/**
 * Viewport screenshot capture.
 *
 * ## Why this file exists
 *
 * `modern-screenshot` renders a *clone* of the requested node inside a
 * `<foreignObject>` whose origin is (0, 0). The cloned root has its margins
 * stripped and `box-sizing: border-box` forced (see `applyCssStyleWithOptions`
 * in modern-screenshot), so **the captured image's (0, 0) is the root node's
 * own border-box origin** — never the viewport origin.
 *
 * Capturing `document.body` therefore photographs the TOP OF THE DOCUMENT.
 * When the window is scrolled, the reviewer files a report about what they can
 * see and the attached screenshot shows something else entirely.
 *
 * `features.restoreScrollPosition` does not help here: it only translates the
 * *children* of a scrolled element, and it is never asked about the capture
 * root's own parent. With `document.body` as the root, the window scroller
 * (`document.scrollingElement`, normally `<html>`) is never consulted. Nested
 * scroll containers, whose scroll offsets live on elements *inside* the tree,
 * are handled correctly and are untouched by this module.
 *
 * ## Coordinate contract  (READ THIS BEFORE MAPPING COORDINATES INTO THE IMAGE)
 *
 * The image returned by {@link captureViewportBlob} is anchored to the
 * **viewport**: image pixel (0, 0) corresponds to client coordinate (0, 0),
 * i.e. the same origin as `MouseEvent.clientX` / `clientY` and
 * `Element.getBoundingClientRect()`. A point at client (cx, cy) lands at
 *
 *     imageX = cx * (bitmap.width  / window.innerWidth)
 *     imageY = cy * (bitmap.height / window.innerHeight)
 *
 * The scale factor MUST be read off the DECODED BITMAP, not off
 * `devicePixelRatio`. modern-screenshot builds the canvas as
 * `Math.floor(width * scale)`, and browsers impose their own hard canvas
 * limits, so the emitted bitmap is not reliably `innerWidth * devicePixelRatio`.
 *
 * Before this module existed, image (0, 0) was `document.body`'s border-box
 * origin, so the mapping above was only correct on an unscrolled page with a
 * zero-margin `<body>`.
 */

export type ViewportCaptureOptions = {
  /**
   * Node filter. Inverted from html2canvas: return `true` to INCLUDE a node,
   * `false` to EXCLUDE it (and its subtree).
   */
  filter?: (el: Node) => boolean;
};

/**
 * Captures the current viewport as a PNG blob whose origin is the viewport
 * origin. See the coordinate contract above.
 */
export function captureViewportBlob(
  options: ViewportCaptureOptions = {},
): Promise<Blob> {
  const anchor = measureViewportAnchor();
  const bodyBackground = window.getComputedStyle(document.body).backgroundColor;

  return domToBlob(document.body, {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio || 1,
    // Fills the canvas, standing in for the background the browser propagates
    // to the viewport. Without it, translating the clone leaves the parts of
    // the frame its own box no longer covers transparent.
    backgroundColor: resolveCanvasBackground(),
    features: {
      // Reproduces the offset of nested scroll containers in the clone.
      restoreScrollPosition: true,
    },
    filter: options.filter,
    onCloneNode: (cloned) => {
      anchorCloneToViewport(cloned, anchor, bodyBackground);
    },
  });
}

/**
 * The colour the browser paints across the whole viewport. Per CSS background
 * propagation the root element wins, and `<body>`'s background is only used
 * when the root has none. Colour only — a background *image* on the canvas is
 * still not reproduced.
 */
function resolveCanvasBackground(): string | null {
  const root = window.getComputedStyle(document.documentElement).backgroundColor;
  if (!isTransparent(root)) return root;

  const body = window.getComputedStyle(document.body).backgroundColor;
  return isTransparent(body) ? null : body;
}

function isTransparent(color: string): boolean {
  return (
    !color ||
    color === "transparent" ||
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(color)
  );
}

type ViewportAnchor = {
  /** Translation applied to the cloned `<body>` so image (0,0) === client (0,0). */
  bodyX: number;
  bodyY: number;
  /**
   * Counter-translation for `position: fixed` clones. Translating the cloned
   * `<body>` makes it the containing block for its fixed descendants, which
   * would otherwise drag the page's fixed chrome (headers, toolbars) out of
   * frame along with the scroll offset.
   */
  fixedX: number;
  fixedY: number;
};

function measureViewportAnchor(): ViewportAnchor {
  const body = document.body;
  const rect = body.getBoundingClientRect();

  // `rect` is already client-relative, so it folds the window scroll AND any
  // <html>/<body> margin, border and padding into a single offset: placing the
  // clone there puts it exactly where the real <body> sits on screen.
  //
  // Quirks mode is the one exception: there <body> is itself the scrolling
  // element, so `restoreScrollPosition` translates its children by -scroll and
  // `rect` reflects that same scroll. Add it back so it is not counted twice.
  const bodyScrolls = document.scrollingElement === body;
  const bodyX = rect.left + (bodyScrolls ? body.scrollLeft : 0);
  const bodyY = rect.top + (bodyScrolls ? body.scrollTop : 0);

  // A fixed clone is laid out from the cloned <body>'s PADDING box (the
  // containing block a transform establishes), then moved by the body
  // translation. Undo both to put it back at its client position.
  const style = window.getComputedStyle(body);

  return {
    bodyX,
    bodyY,
    fixedX: -(bodyX + toPx(style.borderLeftWidth)),
    fixedY: -(bodyY + toPx(style.borderTopWidth)),
  };
}

function anchorCloneToViewport(
  cloned: Node,
  anchor: ViewportAnchor,
  bodyBackground: string,
): void {
  if (!isHtmlElement(cloned)) return;

  // `backgroundColor` above is also stamped onto the root clone as
  // `background-color: … !important`. Put <body>'s own colour back, so a page
  // that paints the canvas from <html> and <body> differently keeps both.
  cloned.style.setProperty("background-color", bodyBackground, "important");

  // modern-screenshot strips the root's margin from the inline styles it
  // copies, which lets the rendering document's UA default (`body { margin:
  // 8px }`) apply to the clone instead. The clone's origin then depends on the
  // UA stylesheet rather than on the page, so pin it: with margin 0 the clone's
  // border box is exactly (0, 0) and the translation below is the whole story.
  cloned.style.setProperty("margin", "0", "important");

  translateClone(cloned, anchor.bodyX, anchor.bodyY);

  // Cloned nodes carry their computed styles inline, so `position: fixed`
  // shows up as an inline declaration. The attribute prefilter keeps this off
  // the hot path for the overwhelming majority of nodes.
  const candidates = cloned.querySelectorAll<HTMLElement>('[style*="fixed"]');
  for (const candidate of candidates) {
    if (candidate.style.position !== "fixed") continue;
    // An element under a transformed/filtered ancestor is not viewport-fixed in
    // the live page either — it is already laid out relative to that ancestor,
    // and its clone inherits the same relationship. Leave it alone.
    if (hasContainingBlockAncestor(candidate, cloned)) continue;
    translateClone(candidate, anchor.fixedX, anchor.fixedY);
  }
}

/**
 * Adds a screen-space translation to `element`'s transform without disturbing
 * its linear part (scale/rotate/skew), mirroring how modern-screenshot itself
 * composes the `restoreScrollPosition` offset.
 */
function translateClone(element: HTMLElement, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;

  const matrix = readMatrix(element.style.transform);
  const { a, b, c, d } = matrix;
  matrix.a = 1;
  matrix.b = 0;
  matrix.c = 0;
  matrix.d = 1;
  matrix.translateSelf(dx, dy);
  matrix.a = a;
  matrix.b = b;
  matrix.c = c;
  matrix.d = d;

  element.style.transform = matrix.toString();
}

function readMatrix(transform: string): DOMMatrix {
  if (!transform || transform === "none") return new DOMMatrix();
  try {
    return new DOMMatrix(transform);
  } catch {
    return new DOMMatrix();
  }
}

const CONTAINING_BLOCK_PROPERTIES = [
  "transform",
  "filter",
  "backdropFilter",
  "perspective",
] as const;

function hasContainingBlockAncestor(
  element: HTMLElement,
  root: HTMLElement,
): boolean {
  for (
    let parent = element.parentElement;
    parent && parent !== root;
    parent = parent.parentElement
  ) {
    for (const property of CONTAINING_BLOCK_PROPERTIES) {
      const value = parent.style[property];
      if (value && value !== "none") return true;
    }
    if (parent.style.willChange.includes("transform")) return true;
  }

  return false;
}

function isHtmlElement(node: Node): node is HTMLElement {
  return node.nodeType === 1 && "style" in node;
}

function toPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
