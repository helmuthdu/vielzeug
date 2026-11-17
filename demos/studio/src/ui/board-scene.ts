import {
  type AlignEdge,
  alignRects,
  type Camera,
  createCamera,
  distributeRects,
  type Point,
  type Rect,
  rectFromPoints,
  type SnapGuide,
  type SpacingGuide,
  snapRect,
  snapSpacing,
  unionRect,
} from '@vielzeug/atlas';
import { createDragGesture, createPinchGesture, createWheelGesture } from '@vielzeug/gesture';
import {
  type StrokePoint,
  simplifyStroke,
  smoothStroke,
  strokeOutline,
  strokeOutlineToSvgPath,
  strokeWidths,
} from '@vielzeug/ink';
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import { createPositioner } from '@vielzeug/orbit';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/tooltip';
import {
  addShapeCommand,
  type BoardModel,
  type BoardShape,
  createBoardModel,
  moveShapesCommand,
  removeShapesCommand,
  resizeShapesCommand,
  type ShapePosition,
  shapeBounds,
} from '../core/board.ts';
import { createToolActor, type ToolEvent } from '../core/tools.ts';
import type { SceneHandle } from './shell.ts';
import './board.css';

const ZOOM_STEP = 1.0015;
// Grid spacing matches the viewport's dot background (--size-8 = 32px at zoom 1).
const GRID_SPACING = 32;
const SNAP_THRESHOLD = 8;
// A resized shape never shrinks below this world size.
const MIN_SHAPE_SIZE = 4;

/** Resize handle directions; the suffix names the edges each handle drags. */
const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type HandleDir = (typeof HANDLE_DIRS)[number];

const HANDLE_X: Record<HandleDir, 'left' | 'center' | 'right'> = {
  e: 'right',
  n: 'center',
  ne: 'right',
  nw: 'left',
  s: 'center',
  se: 'right',
  sw: 'left',
  w: 'left',
};
const HANDLE_Y: Record<HandleDir, 'bottom' | 'center' | 'top'> = {
  e: 'center',
  n: 'top',
  ne: 'top',
  nw: 'top',
  s: 'bottom',
  se: 'bottom',
  sw: 'bottom',
  w: 'center',
};

/**
 * Resizes `bounds` by dragging the edge(s) named by `dir` to the world point
 * `to`. The opposite edge(s) stay fixed; the result never collapses below
 * MIN_SHAPE_SIZE.
 */
function resizeBounds(bounds: Rect, dir: HandleDir, to: Point): Rect {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  let { x, y } = bounds;
  let width = bounds.width;
  let height = bounds.height;
  if (dir.includes('w')) x = Math.min(to.x, right - MIN_SHAPE_SIZE);
  if (dir.includes('e')) width = Math.max(to.x - bounds.x, MIN_SHAPE_SIZE);
  if (dir.includes('n')) y = Math.min(to.y, bottom - MIN_SHAPE_SIZE);
  if (dir.includes('s')) height = Math.max(to.y - bounds.y, MIN_SHAPE_SIZE);
  return { height, width, x, y };
}

/** Scales a shape's geometry from its top-left corner into `rect` (uniform scale). */
function scaleShape(shape: BoardShape, rect: Rect): BoardShape {
  if (shape.kind === 'rect') return { ...shape, ...rect };
  const sx = shape.width === 0 ? 1 : rect.width / shape.width;
  const sy = shape.height === 0 ? 1 : rect.height / shape.height;
  const outline = shape.outline.map((pt) => ({ x: pt.x * sx, y: pt.y * sy }));
  return {
    ...shape,
    height: rect.height,
    outline,
    path: strokeOutlineToSvgPath(outline),
    points: shape.points.map((pt) => ({ pressure: pt.pressure, x: pt.x * sx, y: pt.y * sy })),
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}

let nextShapeId = 1;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Two-point bounds are never empty; unwrap the iterable-input null case once. */
function rectBetween(a: Point, b: Point): Rect {
  return rectFromPoints([a, b]) ?? { height: 0, width: 0, x: a.x, y: a.y };
}

function screenPoint(viewport: HTMLElement, clientX: number, clientY: number): Point {
  const box = viewport.getBoundingClientRect();
  return { x: clientX - box.left, y: clientY - box.top };
}

/**
 * Pointer pressure for ink sampling. Mice and many trackpads report exactly 0
 * (meaning "no pressure capability"), which ink would read as the lightest pen
 * touch and halve the stroke width; treat it as absent pressure instead.
 */
function strokePressure(event: PointerEvent): number | undefined {
  return event.pressure > 0 ? event.pressure : undefined;
}

/**
 * Mounts the board scene: an infinite pan/zoom canvas with rect creation,
 * selection, movement, marquee selection, and ledger-backed undo/redo.
 */
export function mountBoardScene(container: HTMLElement): SceneHandle {
  const model: BoardModel = createBoardModel();
  const camera: Camera = createCamera({ initial: { x: -160, y: -120, zoom: 1 } });
  const ledger = createLedger();
  const tools = createToolActor();

  container.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'studio-viewport';
  viewport.dataset.testid = 'board-viewport';
  viewport.style.touchAction = 'none';

  const world = document.createElement('div');
  world.className = 'studio-world';
  world.dataset.testid = 'board-world';

  const overlay = document.createElement('div');
  overlay.className = 'studio-overlay';

  const marqueeEl = document.createElement('div');
  marqueeEl.className = 'studio-marquee';
  marqueeEl.hidden = true;
  marqueeEl.dataset.testid = 'board-marquee';

  // The draft rect is drawn in world space, so it lives inside the transformed world.
  const draftEl = document.createElement('div');
  draftEl.className = 'studio-draft';
  draftEl.hidden = true;
  world.append(draftEl);

  // Strokes render into one world-space SVG; overflow stays visible so freehand
  // geometry is never clipped to its own bounds.
  const strokesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  strokesSvg.classList.add('studio-strokes');
  strokesSvg.setAttribute('overflow', 'visible');
  strokesSvg.dataset.testid = 'board-strokes';
  world.append(strokesSvg);

  const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  previewPath.classList.add('studio-stroke-preview');
  previewPath.style.display = 'none';
  strokesSvg.append(previewPath);

  const toolbar = document.createElement('div');
  toolbar.className = 'studio-selection-toolbar';
  toolbar.dataset.testid = 'selection-toolbar';
  toolbar.hidden = true;
  // Dark contextual pill, mockup-style: icon actions with accessible labels.
  toolbar.innerHTML = `
    <ore-button-group attached label="Selection actions" size="sm" rounded="full">
      <ore-button data-action="align-x" icon-only label="Center horizontally"><ore-icon name="align-center-horizontal"></ore-icon></ore-button>
      <ore-button data-action="align-y" icon-only label="Center vertically"><ore-icon name="align-center-vertical"></ore-icon></ore-button>
      <ore-button data-action="distribute-x" icon-only label="Distribute horizontally"><ore-icon name="align-horizontal-distribute-center"></ore-icon></ore-button>
      <ore-button data-action="distribute-y" icon-only label="Distribute vertically"><ore-icon name="align-vertical-distribute-center"></ore-icon></ore-button>
      <ore-button data-action="delete" icon-only label="Delete selection" emphasis="destructive"><ore-icon name="trash-2"></ore-icon></ore-button>
    </ore-button-group>`;

  const guidesEl = document.createElement('div');
  guidesEl.className = 'studio-guides';
  guidesEl.dataset.testid = 'board-guides';
  guidesEl.hidden = true;

  const spacingEl = document.createElement('div');
  spacingEl.className = 'studio-guides studio-spacing';
  spacingEl.dataset.testid = 'board-spacing';
  spacingEl.hidden = true;

  // Konva-style selection chrome, drawn in screen space so the dashed frame and
  // handles stay a constant size at every zoom level.
  const frameEl = document.createElement('div');
  frameEl.className = 'studio-selection-frame';
  frameEl.hidden = true;
  frameEl.dataset.testid = 'board-selection-frame';

  const handlesEl = document.createElement('div');
  handlesEl.className = 'studio-handles';
  handlesEl.hidden = true;
  handlesEl.dataset.testid = 'board-handles';
  for (const dir of HANDLE_DIRS) {
    const handle = document.createElement('div');
    handle.className = 'studio-handle';
    handle.dataset.handle = dir;
    handlesEl.append(handle);
  }

  overlay.append(guidesEl, spacingEl, marqueeEl, frameEl, handlesEl, toolbar);
  viewport.append(world, overlay);
  container.append(viewport);

  toolbar.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    const action = target?.getAttribute('data-action');
    if (action === 'delete') deleteSelection();
    if (action === 'align-x') alignSelection('horizontal-center');
    if (action === 'align-y') alignSelection('vertical-center');
    if (action === 'distribute-x') distributeSelection('x');
    if (action === 'distribute-y') distributeSelection('y');
  });

  // ── DOM shape elements ────────────────────────────────────────────────────
  const shapeEls = new Map<string, HTMLElement | SVGElement>();

  function syncShapes(): void {
    const live = new Set(model.shapes.map((shape) => shape.id));
    for (const [id, el] of shapeEls) {
      if (!live.has(id)) {
        el.remove();
        shapeEls.delete(id);
      }
    }
    for (const shape of model.shapes) {
      let el = shapeEls.get(shape.id);
      if (!el) {
        if (shape.kind === 'stroke') {
          el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          el.classList.add('studio-shape', 'studio-stroke');
          el.setAttribute('d', shape.path);
        } else {
          el = document.createElement('div');
          el.classList.add('studio-shape');
        }
        el.setAttribute('data-shape-id', shape.id);
        (shape.kind === 'stroke' ? strokesSvg : world).append(el);
        shapeEls.set(shape.id, el);
      }
      el.style.transform = `translate(${String(shape.x)}px, ${String(shape.y)}px)`;
      if (shape.kind === 'rect') {
        el.style.width = `${String(shape.width)}px`;
        el.style.height = `${String(shape.height)}px`;
      }
      el.classList.toggle('is-selected', model.selection.includes(shape.id));
    }
    syncToolbar();
  }

  const guideEls: HTMLElement[] = [];

  /**
   * Draws world-space snap guides as screen-space lines: grid snaps render as
   * dashed lines, object snaps as solid lines with an × cap at each aligned edge.
   */
  function renderGuides(guides: readonly SnapGuide[]): void {
    while (guideEls.length < guides.length * 3) {
      for (let i = 0; i < 3; i++) {
        const el = document.createElement('div');
        el.className = i === 0 ? 'studio-guide' : 'studio-guide-cap';
        el.textContent = i === 0 ? '' : '\u00d7';
        guidesEl.append(el);
        guideEls.push(el);
      }
    }
    guides.forEach((guide, i) => {
      const line = guideEls[i * 3];
      const capA = guideEls[i * 3 + 1];
      const capB = guideEls[i * 3 + 2];
      if (!line || !capA || !capB) return;
      const along = (value: number) =>
        camera.toScreen(guide.axis === 'x' ? { x: guide.position, y: value } : { x: value, y: guide.position });
      const from = along(guide.from);
      const to = along(guide.to);
      line.classList.toggle('is-grid', guide.kind === 'grid');
      line.classList.toggle('is-vertical', guide.axis === 'x');
      line.style.transform = `translate(${String(Math.min(from.x, to.x))}px, ${String(Math.min(from.y, to.y))}px)`;
      line.style.width = `${String(Math.max(1, Math.abs(to.x - from.x)))}px`;
      line.style.height = `${String(Math.max(1, Math.abs(to.y - from.y)))}px`;
      line.hidden = false;
      for (const [el, end] of [
        [capA, guide.from],
        [capB, guide.to],
      ] as const) {
        const at = along(end);
        el.style.transform = `translate(${String(at.x)}px, ${String(at.y)}px)`;
        el.hidden = guide.kind !== 'object';
      }
    });
    for (let i = guides.length * 3; i < guideEls.length; i++) guideEls[i]?.remove();
    guideEls.length = guides.length * 3;
    guidesEl.hidden = guides.length === 0;
  }

  const spacingEls: HTMLElement[] = [];

  /** Draws equal-spacing guides: a dashed line with an × marker in each gap. */
  function renderSpacing(guides: readonly SpacingGuide[]): void {
    while (spacingEls.length < guides.length * 3) {
      for (let i = 0; i < 3; i++) {
        const el = document.createElement('div');
        el.className = i === 0 ? 'studio-spacing-line' : 'studio-spacing-mark';
        el.textContent = i === 0 ? '' : '×';
        spacingEl.append(el);
        spacingEls.push(el);
      }
    }
    guides.forEach((guide, i) => {
      const line = spacingEls[i * 3];
      const markA = spacingEls[i * 3 + 1];
      const markB = spacingEls[i * 3 + 2];
      if (!line || !markA || !markB) return;
      const along = (value: number) =>
        camera.toScreen(guide.gapAxis === 'x' ? { x: value, y: guide.position } : { x: guide.position, y: value });
      const from = along(guide.from);
      const to = along(guide.to);
      line.style.transform = `translate(${String(Math.min(from.x, to.x))}px, ${String(Math.min(from.y, to.y))}px)`;
      line.style.width = `${String(Math.max(1, Math.abs(to.x - from.x)))}px`;
      line.style.height = `${String(Math.max(1, Math.abs(to.y - from.y)))}px`;
      line.classList.toggle('is-vertical', guide.gapAxis === 'y');
      for (const [el, mark] of [
        [markA, guide.marks[0]],
        [markB, guide.marks[1]],
      ] as const) {
        const at = along(mark);
        el.style.transform = `translate(${String(at.x)}px, ${String(at.y)}px)`;
      }
    });
    for (let i = guides.length * 3; i < spacingEls.length; i++) spacingEls[i]?.remove();
    spacingEls.length = guides.length * 3;
    spacingEl.hidden = guides.length === 0;
  }

  function selectionBounds(): Rect | null {
    let bounds: Rect | null = null;
    for (const id of model.selection) {
      const shape = model.get(id);
      if (!shape) continue;
      bounds = bounds ? unionRect(bounds, shape) : { height: shape.height, width: shape.width, x: shape.x, y: shape.y };
    }
    return bounds;
  }

  // ── Camera → DOM ──────────────────────────────────────────────────────────
  const positioner = createPositioner({ getBoundingClientRect: () => virtualRect() }, toolbar, {
    placement: 'top',
    strategy: 'absolute',
  });

  function virtualRect(): DOMRect | Rect {
    const bounds = selectionBounds();
    const fallback = { height: 0, width: 0, x: 0, y: 0 };
    if (!bounds) return fallback;
    const topLeft = camera.toScreen({ x: bounds.x, y: bounds.y });
    const bottomRight = camera.toScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    const box = viewport.getBoundingClientRect();
    return {
      height: bottomRight.y - topLeft.y,
      width: bottomRight.x - topLeft.x,
      x: box.left + Math.min(topLeft.x, bottomRight.x),
      y: box.top + Math.min(topLeft.y, bottomRight.y),
    };
  }

  function syncToolbar(): void {
    const bounds = selectionBounds();
    toolbar.hidden = bounds === null;
    if (bounds) positioner.update();
    syncSelectionChrome(bounds);
  }

  /** Places the screen-space dashed frame and the eight resize handles. */
  function syncSelectionChrome(bounds: Rect | null): void {
    // Handles only make sense for the select tool; other tools hide the chrome.
    const show = bounds !== null && currentTool() === 'select';
    frameEl.hidden = !show;
    handlesEl.hidden = !show;
    if (!bounds || !show) return;
    const topLeft = camera.toScreen({ x: bounds.x, y: bounds.y });
    const bottomRight = camera.toScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    const x = Math.min(topLeft.x, bottomRight.x);
    const y = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);
    frameEl.style.transform = `translate(${String(x)}px, ${String(y)}px)`;
    frameEl.style.width = `${String(width)}px`;
    frameEl.style.height = `${String(height)}px`;
    for (const handleEl of handlesEl.children) {
      if (!(handleEl instanceof HTMLElement)) continue;
      const dir = handleEl.dataset.handle as HandleDir | undefined;
      if (!dir) continue;
      const hx = HANDLE_X[dir] === 'left' ? x : HANDLE_X[dir] === 'right' ? x + width : x + width / 2;
      const hy = HANDLE_Y[dir] === 'top' ? y : HANDLE_Y[dir] === 'bottom' ? y + height : y + height / 2;
      handleEl.style.transform = `translate(${String(hx)}px, ${String(hy)}px)`;
    }
  }

  function applyCamera(): void {
    const [a, b, c, d, e, f] = camera.matrix;
    world.style.transform = `matrix(${String(a)}, ${String(b)}, ${String(c)}, ${String(d)}, ${String(e)}, ${String(f)})`;
    syncToolbar();
  }

  const unsubscribeCamera = camera.subscribe(applyCamera);
  const unsubscribeModel = model.subscribe(syncShapes);
  applyCamera();
  syncShapes();

  // ── Pointer interaction ───────────────────────────────────────────────────
  type Interaction =
    | { kind: 'draw'; origin: Point }
    | { kind: 'pen'; points: StrokePoint[] }
    | { kind: 'marquee'; origin: Point }
    | { kind: 'move'; bounds: Rect; from: Map<string, ShapePosition>; originWorld: Point }
    | {
        bounds: Rect;
        dir: HandleDir;
        from: Map<string, BoardShape>;
        kind: 'resize';
        moved: boolean;
      }
    | { kind: 'pan'; lastX: number; lastY: number }
    | null;

  let interaction: Interaction = null;
  // A drag gesture only activates after the activation distance is crossed, so a
  // plain click never reaches onStart. Track activation to suppress the click
  // that follows a real drag and handle click-selection in a click listener.
  let dragActivated = false;
  let suppressClick = false;
  const resetClickFlags = (): void => {
    dragActivated = false;
    suppressClick = false;
  };
  viewport.addEventListener('pointerdown', resetClickFlags);

  function currentTool(): string {
    const { state } = tools.snapshot;
    return state;
  }

  function toolEvent(event: ToolEvent['type']): void {
    tools.send({ type: event } as ToolEvent);
  }

  function deleteSelection(): void {
    const shapes = model.selection.map((id) => model.get(id)).filter((shape): shape is BoardShape => shape != null);
    if (shapes.length === 0) return;
    for (const shape of shapes) model.remove(shape.id);
    ledger.record(removeShapesCommand(model, shapes));
  }

  function commitStroke(points: readonly StrokePoint[]): void {
    if (points.length < 2) return;
    const smoothed = simplifyStroke(smoothStroke(points, { algorithm: 'streamline' }), 0.6);
    if (smoothed.length < 2) return;
    const widths = strokeWidths(smoothed, { baseWidth: 4 });
    const outline = strokeOutline(smoothed, widths);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of outline) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    const shape: BoardShape = {
      height: maxY - minY,
      id: `stroke-${String(nextShapeId++)}`,
      kind: 'stroke',
      outline: outline.map((pt) => ({ x: pt.x - minX, y: pt.y - minY })),
      path: strokeOutlineToSvgPath(outline.map((pt) => ({ x: pt.x - minX, y: pt.y - minY }))),
      points: smoothed.map((pt) => ({ pressure: pt.pressure, x: pt.x - minX, y: pt.y - minY })),
      width: maxX - minX,
      x: minX,
      y: minY,
    };
    model.add(shape);
    ledger.record(addShapeCommand(model, shape));
    model.select([shape.id]);
  }

  function selectedShapes(): BoardShape[] {
    return model.selection.map((id) => model.get(id)).filter((shape): shape is BoardShape => shape != null);
  }

  function alignSelection(edge: AlignEdge): void {
    const shapes = selectedShapes();
    if (shapes.length < 2) return;
    applyRectAction(shapes, alignRects(shapes, edge));
  }

  function distributeSelection(axis: 'x' | 'y'): void {
    const shapes = selectedShapes();
    if (shapes.length < 3) return;
    applyRectAction(shapes, distributeRects(shapes, axis));
  }

  /** Applies a pure rect transform to shapes and records one undoable move. */
  function applyRectAction(from: readonly BoardShape[], to: readonly Rect[]): void {
    const positions = new Map<string, ShapePosition>();
    for (const shape of from) positions.set(shape.id, { x: shape.x, y: shape.y });
    from.forEach((shape, i) => {
      const rect = to[i];
      if (rect) model.moveTo(shape.id, { x: rect.x, y: rect.y });
    });
    ledger.record(
      moveShapesCommand(
        model,
        from.map((shape) => shape.id),
        positions,
      ),
    );
  }

  const drag = createDragGesture(viewport, {
    activationDistance: 3,
    onEnd: (detail) => {
      suppressClick = dragActivated;
      dragActivated = false;
      if (!interaction) return;
      const cancelled = detail.reason === 'cancel';
      if (interaction.kind === 'pen') {
        previewPath.style.display = 'none';
        previewPath.setAttribute('d', '');
        if (!cancelled) commitStroke(interaction.points);
      } else if (interaction.kind === 'draw') {
        draftEl.hidden = true;
        if (!cancelled) {
          const worldPoint = camera.toWorld(screenPoint(viewport, detail.current.x, detail.current.y));
          const rect = rectBetween(interaction.origin, worldPoint);
          if (rect.width >= 4 && rect.height >= 4) {
            const shape: BoardShape = { id: `shape-${String(nextShapeId++)}`, kind: 'rect', ...rect };
            model.add(shape);
            ledger.record(addShapeCommand(model, shape));
            model.select([shape.id]);
          }
        }
      } else if (interaction.kind === 'marquee') {
        marqueeEl.hidden = true;
      } else if (interaction.kind === 'move') {
        renderGuides([]);
        renderSpacing([]);
        const ids = [...interaction.from.keys()];
        if (cancelled) {
          for (const [id, from] of interaction.from) model.moveTo(id, from);
        } else {
          ledger.record(moveShapesCommand(model, ids, interaction.from));
        }
      }
      interaction = null;
    },
    onMove: (detail) => {
      if (!interaction) return;
      if (interaction.kind === 'pan') {
        // Content follows the pointer: feed the pointer's own screen delta.
        camera.panBy(detail.current.x - interaction.lastX, detail.current.y - interaction.lastY);
        interaction.lastX = detail.current.x;
        interaction.lastY = detail.current.y;
        return;
      }
      const point = screenPoint(viewport, detail.current.x, detail.current.y);
      if (interaction.kind === 'pen') {
        const worldPoint = camera.toWorld(point);
        const last = interaction.points[interaction.points.length - 1];
        // Skip near-duplicate samples; smoothing handles the rest.
        if (!last || Math.hypot(worldPoint.x - last.x, worldPoint.y - last.y) >= 1.5) {
          interaction.points.push({ pressure: strokePressure(detail.event), x: worldPoint.x, y: worldPoint.y });
          previewPath.setAttribute(
            'd',
            `M ${interaction.points.map((pt) => `${String(pt.x)} ${String(pt.y)}`).join(' L ')}`,
          );
        }
        return;
      }
      if (interaction.kind === 'draw') {
        const worldPoint = camera.toWorld(point);
        const rect = rectBetween(interaction.origin, worldPoint);
        draftEl.style.transform = `translate(${String(rect.x)}px, ${String(rect.y)}px)`;
        draftEl.style.width = `${String(rect.width)}px`;
        draftEl.style.height = `${String(rect.height)}px`;
        return;
      }
      if (interaction.kind === 'marquee') {
        const rect = rectBetween(interaction.origin, point);
        marqueeEl.style.transform = `translate(${String(rect.x)}px, ${String(rect.y)}px)`;
        marqueeEl.style.width = `${String(rect.width)}px`;
        marqueeEl.style.height = `${String(rect.height)}px`;
        // The marquee is drawn in screen space; selection queries run in world space.
        const corners = [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.width, y: rect.y },
          { x: rect.x + rect.width, y: rect.y + rect.height },
          { x: rect.x, y: rect.y + rect.height },
        ].map((screen) => camera.toWorld(screen));
        model.select(model.marquee(rectBetween(corners[0], corners[2])));
        return;
      }
      if (interaction.kind === 'move') {
        const move = interaction;
        const worldPoint = camera.toWorld(point);
        const dx = worldPoint.x - interaction.originWorld.x;
        const dy = worldPoint.y - interaction.originWorld.y;
        // Snap the selection bounds against everything outside the selection.
        const movedBounds: Rect = {
          height: move.bounds.height,
          width: move.bounds.width,
          x: move.bounds.x + dx,
          y: move.bounds.y + dy,
        };
        const candidates = model.shapes.filter((shape) => !move.from.has(shape.id));
        const snap = snapRect(movedBounds, {
          candidates,
          grid: { x: GRID_SPACING, y: GRID_SPACING },
          threshold: SNAP_THRESHOLD,
        });
        // Equal-spacing snap fills the axes where no alignment snap engaged.
        const spacing = snapSpacing(movedBounds, { candidates, threshold: SNAP_THRESHOLD });
        const total = {
          x: snap.delta.x !== 0 ? snap.delta.x : spacing.delta.x,
          y: snap.delta.y !== 0 ? snap.delta.y : spacing.delta.y,
        };
        for (const [id, from] of move.from) {
          model.moveTo(id, { x: from.x + dx + total.x, y: from.y + dy + total.y });
        }
        renderGuides(snap.guides);
        renderSpacing(spacing.guides.filter((guide) => (guide.gapAxis === 'x' ? snap.delta.x : snap.delta.y) === 0));
      }
    },
    onStart: (detail) => {
      dragActivated = true;
      const point = screenPoint(viewport, detail.start.x, detail.start.y);
      const tool = currentTool();
      if (tool === 'pan') {
        interaction = { kind: 'pan', lastX: detail.start.x, lastY: detail.start.y };
        return;
      }
      const worldPoint = camera.toWorld(point);
      if (tool === 'draw') {
        interaction = { kind: 'draw', origin: worldPoint };
        draftEl.hidden = false;
        return;
      }
      if (tool === 'pen') {
        interaction = {
          kind: 'pen',
          points: [{ pressure: strokePressure(detail.event), x: worldPoint.x, y: worldPoint.y }],
        };
        previewPath.style.display = '';
        previewPath.setAttribute('d', `M ${String(worldPoint.x)} ${String(worldPoint.y)}`);
        return;
      }
      const hit = model.hitTest(worldPoint);
      if (hit && model.selection.includes(hit.id)) {
        const from = new Map<string, ShapePosition>();
        for (const id of model.selection) {
          const shape = model.get(id);
          if (shape) from.set(id, { x: shape.x, y: shape.y });
        }
        const bounds = selectionBounds() ?? { height: 0, width: 0, x: 0, y: 0 };
        interaction = { bounds, from, kind: 'move', originWorld: worldPoint };
      } else {
        if (hit) model.select([hit.id]);
        else model.select([]);
        interaction = { kind: 'marquee', origin: point };
        if (!hit) marqueeEl.hidden = false;
      }
    },
    shouldStart: (event) => {
      if (!(event.button === 0 || event.pointerType !== 'mouse')) return false;
      // Pointerdown on floating UI (toolbars, resize handles) must not start a canvas interaction.
      const target = event.target;
      return !(
        target instanceof Element && target.closest('.studio-toolbar, .studio-selection-toolbar, .studio-handles')
      );
    },
  });

  // ── Resize handles ────────────────────────────────────────────────────────
  // Handles own their pointer stream: capture on the handle so the viewport's
  // drag gesture (excluded via shouldStart) never competes for the same drag.
  function beginResize(event: PointerEvent, handleEl: HTMLElement, dir: HandleDir): void {
    const bounds = selectionBounds();
    if (!bounds) return;
    const from = new Map<string, BoardShape>();
    for (const id of model.selection) {
      const shape = model.get(id);
      if (shape) from.set(id, shape);
    }
    if (from.size === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    handleEl.setPointerCapture(event.pointerId);
    interaction = { bounds, dir, from, kind: 'resize', moved: false };
  }

  function moveResize(event: PointerEvent): void {
    if (!interaction || interaction.kind !== 'resize') return;
    const worldPoint = camera.toWorld(screenPoint(viewport, event.clientX, event.clientY));
    const rect = resizeBounds(interaction.bounds, interaction.dir, worldPoint);
    // Scale every selected shape by the same factor, anchored at the bounds
    // origin, so a multi-selection resizes as a group.
    const sx = interaction.bounds.width === 0 ? 1 : rect.width / interaction.bounds.width;
    const sy = interaction.bounds.height === 0 ? 1 : rect.height / interaction.bounds.height;
    for (const shape of interaction.from.values()) {
      const target: Rect = {
        height: shape.height * sy,
        width: shape.width * sx,
        x: interaction.bounds.x + (shape.x - interaction.bounds.x) * sx,
        y: interaction.bounds.y + (shape.y - interaction.bounds.y) * sy,
      };
      if (model.replace(scaleShape(shape, target))) interaction.moved = true;
    }
  }

  function endResize(): void {
    if (!interaction || interaction.kind !== 'resize') return;
    if (interaction.moved) ledger.record(resizeShapesCommand(model, interaction.from));
    interaction = null;
  }

  function cancelResize(): void {
    if (!interaction || interaction.kind !== 'resize') return;
    for (const shape of interaction.from.values()) model.replace(shape);
    interaction = null;
  }

  for (const child of handlesEl.children) {
    if (!(child instanceof HTMLElement)) continue;
    const dir = child.dataset.handle as HandleDir | undefined;
    if (!dir) continue;
    child.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      beginResize(event, child, dir);
    });
    child.addEventListener('pointermove', moveResize);
    child.addEventListener('pointerup', endResize);
    child.addEventListener('pointercancel', cancelResize);
  }

  let pinchScale = 1;
  const pinch = createPinchGesture(viewport, {
    onMove: (detail) => {
      const box = viewport.getBoundingClientRect();
      const centroid = { x: detail.centroid.x - box.left, y: detail.centroid.y - box.top };
      // `scale` is cumulative since gesture start; zoom needs a per-frame ratio.
      const ratio = pinchScale === 0 ? 1 : detail.scale / pinchScale;
      pinchScale = detail.scale;
      if (ratio !== 1) camera.zoomAt(centroid, ratio);
      if (detail.deltaRotation !== 0) camera.rotateAt(centroid, detail.deltaRotation);
      // Content follows the fingers, same convention as drag-pan.
      if (detail.deltaCentroid.x !== 0 || detail.deltaCentroid.y !== 0) {
        camera.panBy(detail.deltaCentroid.x, detail.deltaCentroid.y);
      }
    },
    onStart: (detail) => {
      // Single-finger drag and pinch must not fight over the surface.
      drag.cancel();
      pinchScale = detail.scale;
    },
  });

  const wheel = createWheelGesture(viewport, {
    // Per the Studio brief: wheel deltas drive cursor-anchored zoom (plain wheel
    // and trackpad pinch alike); panning is drag/space-drag/two-finger.
    onWheel: (detail) => {
      const box = viewport.getBoundingClientRect();
      const point = { x: detail.event.clientX - box.left, y: detail.event.clientY - box.top };
      camera.zoomAt(point, ZOOM_STEP ** -detail.deltaY);
    },
    preventDefault: true,
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function setToolButton(tool: string): void {
    for (const button of toolbarParent.querySelectorAll('[data-tool]')) {
      button.classList.toggle('is-active', button.getAttribute('data-tool') === tool);
    }
  }

  // Floating bottom tool dock (mockup-style): icon tools with tooltips.
  // Tooltips wrap each button, which breaks `attached` fusion (::slotted only
  // matches the ore-button itself), so the dock styles one capsule around both
  // groups instead.
  const toolbarParent = document.createElement('div');
  toolbarParent.className = 'studio-toolbar board-dock';
  toolbarParent.dataset.testid = 'board-toolbar';
  toolbarParent.innerHTML = `
    <ore-button-group label="Board tools" size="sm" class="dock-group">
      <ore-tooltip content="Select (V)" placement="top"><ore-button data-tool="select" variant="ghost" icon-only label="Select"><ore-icon name="mouse-pointer-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Draw rectangle (B)" placement="top"><ore-button data-tool="draw" variant="ghost" icon-only label="Draw rectangle"><ore-icon name="square"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Pen (P)" placement="top"><ore-button data-tool="pen" variant="ghost" icon-only label="Pen"><ore-icon name="pen-line"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Pan (H)" placement="top"><ore-button data-tool="pan" variant="ghost" icon-only label="Pan"><ore-icon name="hand"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <span class="dock-sep" aria-hidden="true"></span>
    <ore-button-group label="History" size="sm" class="dock-group">
      <ore-tooltip content="Undo (⌘Z)" placement="top"><ore-button data-history="undo" variant="ghost" icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Redo (⇧⌘Z)" placement="top"><ore-button data-history="redo" variant="ghost" icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>`;
  container.append(toolbarParent);

  toolbarParent.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-tool],[data-history]') : null;
    if (!target) return;
    const tool = target.getAttribute('data-tool');
    if (tool) toolEvent(`${tool.toUpperCase()}_TOOL` as ToolEvent['type']);
    const history = target.getAttribute('data-history');
    if (history === 'undo') void ledger.undo();
    if (history === 'redo') void ledger.redo();
  });

  const keymap = createKeymap(
    [
      { handler: () => void ledger.undo(), id: 'undo', shortcut: 'mod+z' },
      { handler: () => void ledger.redo(), id: 'redo', shortcut: 'mod+shift+z' },
      { handler: deleteSelection, id: 'delete', shortcut: 'delete' },
      { handler: () => toolEvent('SELECT_TOOL'), id: 'tool-select', shortcut: 'v' },
      { handler: () => toolEvent('DRAW_TOOL'), id: 'tool-draw', shortcut: 'b' },
      { handler: () => toolEvent('PEN_TOOL'), id: 'tool-pen', shortcut: 'p' },
      { handler: () => toolEvent('PAN_TOOL'), id: 'tool-pan', shortcut: 'h' },
      {
        handler: () => toolEvent('TEMP_PAN_START'),
        id: 'space-pan',
        shortcut: 'space',
        trigger: 'keydown',
        when: (event) => !event.repeat,
      },
      { handler: () => toolEvent('TEMP_PAN_END'), id: 'space-pan-end', shortcut: 'space', trigger: 'keyup' },
    ],
    { when: (event) => !isEditableTarget(event.target) },
  );
  // Click-selection complements the drag gesture: selection changes happen on
  // click (after a full press/release) so a drag never causes a stray reselect.
  viewport.addEventListener('click', (event) => {
    if (suppressClick) return;
    if (currentTool() !== 'select') return;
    const target = event.target;
    if (target instanceof Element && target.closest('.studio-toolbar, .studio-selection-toolbar')) return;
    const worldPoint = camera.toWorld(screenPoint(viewport, event.clientX, event.clientY));
    const hit = model.hitTest(worldPoint);
    if (hit) {
      if (!model.selection.includes(hit.id)) model.select([hit.id]);
    } else {
      model.select([]);
    }
  });

  // Keyboard events land on the document (the viewport is not focusable), so the
  // keymap mounts there and guards against stealing keys from editable targets.
  const unmountKeymap = keymap.mount(viewport.ownerDocument);

  const unsubscribeTools = tools.subscribe((snapshot) => {
    const tool = snapshot.state;
    viewport.dataset.tool = tool;
    setToolButton(tool);
    viewport.style.cursor = tool === 'pan' ? 'grab' : tool === 'draw' || tool === 'pen' ? 'crosshair' : 'default';
    // The selection frame and handles only show for the select tool.
    syncSelectionChrome(selectionBounds());
  });
  setToolButton('select');
  viewport.dataset.tool = 'select';

  function modelBounds(): Rect | null {
    let bounds: Rect | null = null;
    for (const shape of model.shapes) {
      const shapeRect = shapeBounds(shape);
      bounds = bounds ? unionRect(bounds, shapeRect) : shapeRect;
    }
    return bounds;
  }

  return {
    camera,
    dispose() {
      unmountKeymap();
      keymap.dispose();
      wheel.dispose();
      pinch.dispose();
      drag.dispose();
      unsubscribeTools();
      unsubscribeModel();
      unsubscribeCamera();
      positioner.dispose();
      ledger.dispose();
      tools.dispose();
      camera.dispose();
      model.dispose();
      container.innerHTML = '';
    },
    // Frame the drawn content; with an empty board there is nothing to frame,
    // so fit just restores the initial view.
    fit() {
      const bounds = modelBounds();
      if (!bounds) {
        camera.animateTo({ x: -160, y: -120, zoom: 1 }, { duration: 180 });
        return;
      }
      camera.fitBounds(bounds, {
        padding: 80,
        size: { x: viewport.clientWidth, y: viewport.clientHeight },
      });
    },
  };
}
