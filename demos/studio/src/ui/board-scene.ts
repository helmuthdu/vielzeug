import {
  type AlignEdge,
  alignRects,
  type Camera,
  createCamera,
  distributeRects,
  type Point,
  type Rect,
  rectFromPoints,
  resizeRect,
  type SnapGuide,
  scaleOf,
  snapRect,
  unionRect,
} from '@vielzeug/atlas';
import { createDragGesture } from '@vielzeug/gesture';
import {
  polylineToSvgPath,
  type StrokePoint,
  simplifyStroke,
  stabilizeStroke,
  strokeOutline,
  strokeWidths,
} from '@vielzeug/ink';
import { createKeymap, formatShortcut } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import { createPositioner } from '@vielzeug/orbit';
import { eventFieldValue } from '@vielzeug/refine';
import { trackDockHeight } from './dock-badge.ts';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/dock';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/slider';
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
import { advanceIdCounter, createBoardPersistence, studioStore } from '../core/persist.ts';
import { createToolActor, type ToolEvent } from '../core/tools.ts';
import { createCameraGestures } from './camera-gestures.ts';
import type { SceneHandle } from './shell.ts';
import './board.css';

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
    path: polylineToSvgPath(outline, { close: true }),
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

function rectBetween(a: Point, b: Point): Rect {
  return rectFromPoints([a, b]);
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

/** Default base ink width in world units; the dock slider lets the user change it. */
const DEFAULT_STROKE_WIDTH = 4;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 24;

/** Tooltip label with a platform-correct shortcut, e.g. "Undo (Ctrl+Z)". */
function toolTip(label: string, shortcut: string): string {
  return `${label} (${formatShortcut(shortcut)})`;
}

/**
 * Mounts the board scene: an infinite pan/zoom canvas with rect creation,
 * selection, movement, marquee selection, and ledger-backed undo/redo.
 */
export function mountBoardScene(container: HTMLElement): SceneHandle {
  const model: BoardModel = createBoardModel();
  const persistence = createBoardPersistence(studioStore());
  const camera: Camera = createCamera({ initial: { x: -160, y: -120, zoom: 1 } });
  const ledger = createLedger();
  const tools = createToolActor();
  // Base ink width for new pen strokes; the dock slider writes it, the pen reads it.
  let penWidth = DEFAULT_STROKE_WIDTH;

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

  // Live preview runs the same causal pipeline as commitStroke, so the stroke
  // does not jump from a thin polyline to the filled outline on pen-up.
  function updateStrokePreview(points: readonly StrokePoint[]): void {
    const stabilized = stabilizeStroke(points);
    const widths = strokeWidths(stabilized, { width: penWidth });
    previewPath.setAttribute('d', polylineToSvgPath(strokeOutline(stabilized, widths), { close: true }));
  }

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

  overlay.append(guidesEl, marqueeEl, frameEl, handlesEl, toolbar);
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
      } else {
        // Resize rewrites a stroke's path; the element must follow every model replace.
        el.setAttribute('d', shape.path);
      }
      el.classList.toggle('is-selected', model.selection.includes(shape.id));
    }
    syncToolbar();
  }

  const guideEls: HTMLElement[] = [];

  /**
   * Draws world-space snap guides as screen-space lines: grid and spacing
   * snaps render dashed, object snaps solid, and object/spacing guides get an
   * × marker at each aligned edge or gap center.
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
      line.classList.toggle('is-spacing', guide.kind === 'spacing');
      line.classList.toggle('is-vertical', guide.axis === 'x');
      line.style.transform = `translate(${String(Math.min(from.x, to.x))}px, ${String(Math.min(from.y, to.y))}px)`;
      line.style.width = `${String(Math.max(1, Math.abs(to.x - from.x)))}px`;
      line.style.height = `${String(Math.max(1, Math.abs(to.y - from.y)))}px`;
      line.hidden = false;
      // Object guides mark the aligned span ends; spacing guides mark the gap centers.
      const ends: readonly [number, number] = guide.marks ?? [guide.from, guide.to];
      for (const [el, end] of [
        [capA, ends[0]],
        [capB, ends[1]],
      ] as const) {
        const at = along(end);
        el.style.transform = `translate(${String(at.x)}px, ${String(at.y)}px)`;
        el.classList.toggle('is-spacing', guide.kind === 'spacing');
        el.hidden = guide.kind === 'grid';
      }
    });
    for (let i = guides.length * 3; i < guideEls.length; i++) guideEls[i]?.remove();
    guideEls.length = guides.length * 3;
    guidesEl.hidden = guides.length === 0;
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
  // The floating navbar overlaps the canvas top (and wraps taller on mobile),
  // so the toolbar never lands under it: clamp its top below the bar.
  function chromeInset(): number {
    const navbar = document.querySelector<HTMLElement>('.shell-navbar');
    if (!navbar) return 0;
    return navbar.getBoundingClientRect().bottom - viewport.getBoundingClientRect().top + 8;
  }

  const positioner = createPositioner({ getBoundingClientRect: () => virtualRect() }, toolbar, {
    apply(result) {
      toolbar.style.position = 'absolute';
      toolbar.style.left = `${result.x}px`;
      toolbar.style.top = `${String(Math.max(result.y, chromeInset()))}px`;
    },
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
    // Align needs 2+ shapes, Distribute needs 3+; offer only what works.
    const count = model.selection.length;
    for (const button of toolbar.querySelectorAll<HTMLElement>('[data-action]')) {
      const action = button.getAttribute('data-action');
      const min = action?.startsWith('align') ? 2 : action?.startsWith('distribute') ? 3 : 1;
      button.toggleAttribute('disabled', count < min);
    }
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

  // The camera state is the world point at the viewport centre; the observer's
  // initial callback gives the camera its size as soon as the scene is mounted.
  const resizeObserver = new ResizeObserver(() => {
    camera.resize({ height: viewport.clientHeight, width: viewport.clientWidth });
  });
  resizeObserver.observe(viewport);

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
    const smoothed = simplifyStroke(stabilizeStroke(points), 0.6);
    if (smoothed.length < 2) return;
    // Widths come from timestamps, so computing them after simplification is correct.
    const widths = strokeWidths(smoothed, { width: penWidth });
    const outline = strokeOutline(smoothed, widths);
    const bounds = rectFromPoints(outline) ?? { height: 0, width: 0, x: 0, y: 0 };
    const local = outline.map((pt) => ({ x: pt.x - bounds.x, y: pt.y - bounds.y }));
    const shape: BoardShape = {
      height: bounds.height,
      id: `stroke-${String(nextShapeId++)}`,
      kind: 'stroke',
      outline: local,
      path: polylineToSvgPath(local, { close: true }),
      points: smoothed.map((pt) => ({ pressure: pt.pressure, x: pt.x - bounds.x, y: pt.y - bounds.y })),
      width: bounds.width,
      x: bounds.x,
      y: bounds.y,
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
          // Minimum is 4 SCREEN px converted to world units, so a quick drag
          // still creates a shape when the camera is zoomed in.
          const min = MIN_SHAPE_SIZE / scaleOf(camera.matrix);
          if (rect.width >= min && rect.height >= min) {
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
          interaction.points.push({
            pressure: strokePressure(detail.event),
            time: detail.event.timeStamp,
            x: worldPoint.x,
            y: worldPoint.y,
          });
          updateStrokePreview(interaction.points);
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
          spacing: true,
          threshold: SNAP_THRESHOLD,
        });
        for (const [id, from] of move.from) {
          model.moveTo(id, { x: from.x + dx + snap.delta.x, y: from.y + dy + snap.delta.y });
        }
        renderGuides(snap.guides);
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
          points: [
            {
              pressure: strokePressure(detail.event),
              time: detail.event.timeStamp,
              x: worldPoint.x,
              y: worldPoint.y,
            },
          ],
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
      return !(target instanceof Element && target.closest('ore-dock, .studio-selection-toolbar, .studio-handles'));
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
    // Shift locks the selection's current aspect ratio while dragging.
    const aspect =
      event.shiftKey && interaction.bounds.width > 0 && interaction.bounds.height > 0
        ? interaction.bounds.width / interaction.bounds.height
        : undefined;
    const rect = resizeRect(interaction.bounds, interaction.dir, worldPoint, { aspect, min: MIN_SHAPE_SIZE });
    // Scale every selected shape by the same factor, anchored at the bounds
    // edges the drag does NOT move, so dragging the west handle keeps the
    // east edge (and likewise for the other sides) fixed.
    const bounds = interaction.bounds;
    const dir = interaction.dir;
    const sx = bounds.width === 0 ? 1 : rect.width / bounds.width;
    const sy = bounds.height === 0 ? 1 : rect.height / bounds.height;
    // Which point stays put on each axis: the edge opposite the dragged one;
    // the centre when the drag moves both edges (aspect-locked edge handles).
    const anchorX = dir.includes('w')
      ? bounds.x + bounds.width
      : dir.includes('e')
        ? bounds.x
        : bounds.x + bounds.width / 2;
    const anchorY = dir.includes('n')
      ? bounds.y + bounds.height
      : dir.includes('s')
        ? bounds.y
        : bounds.y + bounds.height / 2;
    for (const shape of interaction.from.values()) {
      const target: Rect = {
        height: shape.height * sy,
        width: shape.width * sx,
        x: anchorX + (shape.x - anchorX) * sx,
        y: anchorY + (shape.y - anchorY) * sy,
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

  const cameraGestures = createCameraGestures(viewport, camera, () => drag.cancel());

  // ── Keyboard ──────────────────────────────────────────────────────────────
  // Floating bottom tool dock: `ore-dock floating` gives the detached, content-hugging
  // capsule, so the scene only supplies the tools. The tools are a segmented control
  // (`value` on the group), so the active tool is announced as a checked radio instead of
  // only shown by colour. Tooltips wrap each button, which breaks the dock's `attached`
  // fusion (::slotted only matches the ore-button itself), so the groups keep their own
  // capsule shape instead.
  const toolbarParent = document.createElement('ore-dock');
  toolbarParent.setAttribute('floating', '');
  toolbarParent.setAttribute('label', 'Board actions');
  toolbarParent.className = 'studio-dock';
  toolbarParent.dataset.testid = 'board-toolbar';
  toolbarParent.innerHTML = `
    <ore-button-group label="Board tools" size="sm" value="select" data-testid="board-tools">
      <ore-tooltip content="${toolTip('Select', 'v')}" placement="top"><ore-button data-tool="select" value="select" variant="ghost" icon-only label="Select"><ore-icon name="mouse-pointer-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Rectangle', 'r')}" placement="top"><ore-button data-tool="draw" value="draw" variant="ghost" icon-only label="Rectangle"><ore-icon name="square"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Pan', 'h')}" placement="top"><ore-button data-tool="pan" value="pan" variant="ghost" icon-only label="Pan"><ore-icon name="hand"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Pen', 'p')}" placement="top"><ore-button data-tool="pen" value="pen" variant="ghost" icon-only label="Pen"><ore-icon name="pen-line"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <!-- Ink-width control fused to the pen button: while the pen is active
         this capsule butts flush against the (now last) pen segment and shares
         its active backdrop, so button + slider read as one expanding control.
         It sits outside the group because the group is a radiogroup. -->
    <span class="studio-pen-pill" data-testid="pen-pill" hidden>
      <ore-tooltip content="Ink width" placement="top"><ore-slider class="studio-pen-width" data-testid="pen-width" min="${String(MIN_STROKE_WIDTH)}" max="${String(MAX_STROKE_WIDTH)}" step="1" value="${String(DEFAULT_STROKE_WIDTH)}" size="sm" color="secondary">Ink width</ore-slider></ore-tooltip>
    </span>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="History" size="sm">
      <ore-tooltip content="${toolTip('Undo', 'mod+z')}" placement="top"><ore-button data-history="undo" variant="ghost" icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Redo', 'mod+shift+z')}" placement="top"><ore-button data-history="redo" variant="ghost" icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-tooltip content="Clear the board and its saved copy" placement="top"><ore-button data-action="reset" variant="ghost" icon-only label="Reset board"><ore-icon name="eraser"></ore-icon></ore-button></ore-tooltip>
    <ore-separator orientation="vertical"></ore-separator>`;
  container.append(toolbarParent);

  // One-line guidance while the board is empty; hides once there is content.
  const hintEl = document.createElement('ore-badge');
  hintEl.setAttribute('variant', 'frost');
  hintEl.setAttribute('rounded', 'full');
  hintEl.className = 'studio-badge';
  hintEl.dataset.testid = 'board-hint';
  hintEl.textContent = `Pick a tool: Rectangle (${formatShortcut('r')}), Pen (${formatShortcut('p')}). Hold Space to pan.`;
  container.append(hintEl);
  // The hint sits above the dock; track the capsule's real height so it never
  // overlaps when the dock wraps on narrow viewports.
  const stopDockTrack = trackDockHeight(toolbarParent, container);

  const toolGroup = toolbarParent.querySelector<HTMLElement>('[data-testid="board-tools"]');
  const penWidthSlider = toolbarParent.querySelector<HTMLElement>('[data-testid="pen-width"]');
  const penPill = toolbarParent.querySelector<HTMLElement>('[data-testid="pen-pill"]');
  // The slider is a native-style field: `value` arrives as a string on input/change.
  penWidthSlider?.addEventListener('input', (event) => {
    const value = Number(eventFieldValue(event));
    if (Number.isFinite(value)) penWidth = Math.min(MAX_STROKE_WIDTH, Math.max(MIN_STROKE_WIDTH, value));
  });
  const undoButton = toolbarParent.querySelector<HTMLElement>('[data-history="undo"]');
  const redoButton = toolbarParent.querySelector<HTMLElement>('[data-history="redo"]');

  // The segmented group emits change on click and arrow-key selection alike,
  // so it is the single path from the tool strip into the tool actor.
  toolGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value) toolEvent(`${value.toUpperCase()}_TOOL` as ToolEvent['type']);
  });

  toolbarParent.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-history],[data-action]') : null;
    if (!target) return;
    const history = target.getAttribute('data-history');
    if (history === 'undo') void ledger.undo();
    if (history === 'redo') void ledger.redo();
    if (target.getAttribute('data-action') === 'reset') resetBoard();
  });

  /** Empties the board, its undo history, and the saved copy together. */
  function resetBoard(): void {
    for (const shape of model.shapes) model.remove(shape.id);
    model.select([]);
    void ledger.clear();
    // Wipe after the removals so it cancels their scheduled save, not the other way round.
    void persistence.wipe();
  }

  const keymap = createKeymap(
    [
      { handler: () => void ledger.undo(), id: 'undo', shortcut: 'mod+z' },
      { handler: () => void ledger.redo(), id: 'redo', shortcut: 'mod+shift+z' },
      // Mac keyboards label Backspace "delete"; both keys must clear a selection.
      { handler: deleteSelection, id: 'delete', shortcut: 'delete' },
      { handler: deleteSelection, id: 'backspace', shortcut: 'backspace' },
      { handler: () => toolEvent('SELECT_TOOL'), id: 'tool-select', shortcut: 'v' },
      { handler: () => toolEvent('DRAW_TOOL'), id: 'tool-draw', shortcut: 'r' },
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
    if (target instanceof Element && target.closest('ore-dock, .studio-selection-toolbar')) return;
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
    // The segmented group owns the active-tool announcement (checked radio).
    if (toolGroup && toolGroup.getAttribute('value') !== tool) toolGroup.setAttribute('value', tool);
    // The ink pill is pen-only chrome: fused to the tool strip, shown only while the pen is active.
    penPill?.toggleAttribute('hidden', tool !== 'pen');
    viewport.style.cursor = tool === 'pan' ? 'grab' : tool === 'draw' || tool === 'pen' ? 'crosshair' : 'default';
    // The selection frame and handles only show for the select tool.
    syncSelectionChrome(selectionBounds());
  });
  viewport.dataset.tool = 'select';

  // Undo/redo read as available only when their stack has something; the empty
  // hint steps aside once the board has content.
  const unsubscribeLedger = ledger.state.subscribe(() => {
    const state = ledger.state.getSnapshot();
    undoButton?.toggleAttribute('disabled', state.undo.length === 0);
    redoButton?.toggleAttribute('disabled', state.redo.length === 0);
  });
  const syncHint = (): void => {
    hintEl.hidden = model.shapes.length > 0;
  };
  const unsubscribeModelHint = model.subscribe(syncHint);
  syncHint();

  // Persist on every model change, coalesced to one write per frame; the
  // adapter writes synchronously, so a reload right after an edit is safe.
  const unsubscribeModelSave = model.subscribe(() => persistence.schedule(() => model.shapes));

  // Restore the last session. The scene mounts synchronously, so shapes land
  // once storage resolves; the id counter moves past the restored ids so new
  // shapes cannot collide with them.
  void persistence.load().then((shapes) => {
    if (shapes.length === 0) return;
    for (const prefix of ['shape-', 'stroke-']) {
      nextShapeId = Math.max(
        nextShapeId,
        advanceIdCounter(
          shapes.map((shape) => shape.id),
          prefix,
        ),
      );
    }
    for (const shape of shapes) model.add(shape);
    fitToContent();
  });

  // Frame the drawn content; with an empty board there is nothing to frame,
  // so fit just restores the initial view.
  function fitToContent(): void {
    const bounds = modelBounds();
    if (!bounds) {
      camera.animateTo({ x: -160, y: -120, zoom: 1 }, { duration: 180 });
      return;
    }
    camera.resize({ height: viewport.clientHeight, width: viewport.clientWidth });
    camera.fitBounds(bounds, { padding: 80 });
  }

  function modelBounds(): Rect | null {
    let bounds: Rect | null = null;
    for (const shape of model.shapes) {
      const shapeRect = shapeBounds(shape);
      bounds = bounds ? unionRect(bounds, shapeRect) : shapeRect;
    }
    return bounds;
  }

  const handle: SceneHandle = {
    camera,
    dispose() {
      persistence.stop();
      resizeObserver.disconnect();
      stopDockTrack();
      unmountKeymap();
      keymap.dispose();
      cameraGestures.dispose();
      drag.dispose();
      unsubscribeTools();
      unsubscribeModel();
      unsubscribeModelHint();
      unsubscribeModelSave();
      unsubscribeLedger();
      unsubscribeCamera();
      positioner.dispose();
      ledger.dispose();
      tools.dispose();
      camera.dispose();
      model.dispose();
      container.innerHTML = '';
    },
    dock: toolbarParent,
    fit: fitToContent,
  };
  return handle;
}
