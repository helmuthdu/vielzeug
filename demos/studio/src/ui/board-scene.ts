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
  snapRect,
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
  type ShapePosition,
} from '../core/board.ts';
import { createToolActor, type ToolEvent } from '../core/tools.ts';
import './board.css';

const ZOOM_STEP = 1.0015;
// Grid spacing matches the viewport's dot background (--size-8 = 32px at zoom 1).
const GRID_SPACING = 32;
const SNAP_THRESHOLD = 8;

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
 * Mounts the board scene: an infinite pan/zoom canvas with rect creation,
 * selection, movement, marquee selection, and ledger-backed undo/redo.
 */
export function mountBoardScene(container: HTMLElement): { dispose(): void } {
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
  toolbar.innerHTML = `
    <ore-button-group attached label="Selection actions" size="sm">
      <ore-button data-action="delete" variant="frost" effect="glass" emphasis="destructive" size="sm">Delete</ore-button>
    </ore-button-group>
    <ore-button-group attached label="Align and distribute" size="sm">
      <ore-button data-action="align-x" variant="frost" effect="glass" size="sm">Center X</ore-button>
      <ore-button data-action="align-y" variant="frost" effect="glass" size="sm">Center Y</ore-button>
      <ore-button data-action="distribute-x" variant="frost" effect="glass" size="sm">Space X</ore-button>
      <ore-button data-action="distribute-y" variant="frost" effect="glass" size="sm">Space Y</ore-button>
    </ore-button-group>`;

  const guidesEl = document.createElement('div');
  guidesEl.className = 'studio-guides';
  guidesEl.dataset.testid = 'board-guides';
  guidesEl.hidden = true;

  overlay.append(guidesEl, marqueeEl, toolbar);
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

  /** Draws world-space snap guides as screen-space lines in the overlay. */
  function renderGuides(guides: readonly SnapGuide[]): void {
    while (guideEls.length < guides.length) {
      const line = document.createElement('div');
      line.className = 'studio-guide';
      guidesEl.append(line);
      guideEls.push(line);
    }
    guides.forEach((guide, i) => {
      const el = guideEls[i];
      if (!el) return;
      const from = camera.toScreen(
        guide.axis === 'x' ? { x: guide.position, y: guide.from } : { x: guide.from, y: guide.position },
      );
      const to = camera.toScreen(
        guide.axis === 'x' ? { x: guide.position, y: guide.to } : { x: guide.to, y: guide.position },
      );
      const x = Math.min(from.x, to.x);
      const y = Math.min(from.y, to.y);
      el.style.transform = `translate(${String(x)}px, ${String(y)}px)`;
      el.style.width = `${String(Math.max(1, Math.abs(to.x - from.x)))}px`;
      el.style.height = `${String(Math.max(1, Math.abs(to.y - from.y)))}px`;
      el.hidden = false;
    });
    for (let i = guides.length; i < guideEls.length; i++) guideEls[i]?.remove();
    guideEls.length = guides.length;
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
          interaction.points.push({ pressure: detail.event.pressure, x: worldPoint.x, y: worldPoint.y });
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
        interaction = { kind: 'pen', points: [{ pressure: detail.event.pressure, x: worldPoint.x, y: worldPoint.y }] };
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
      // Pointerdown on floating UI (toolbars) must not start a canvas interaction.
      const target = event.target;
      return !(target instanceof Element && target.closest('.studio-toolbar, .studio-selection-toolbar'));
    },
  });

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

  const toolbarParent = document.createElement('div');
  toolbarParent.className = 'studio-toolbar';
  toolbarParent.dataset.testid = 'board-toolbar';
  toolbarParent.innerHTML = `
    <ore-button-group attached label="Board tools" size="sm">
      <ore-button data-tool="select" variant="frost" effect="glass" size="sm">Select</ore-button>
      <ore-button data-tool="draw" variant="frost" effect="glass" size="sm">Draw</ore-button>
      <ore-button data-tool="pen" variant="frost" effect="glass" size="sm">Pen</ore-button>
      <ore-button data-tool="pan" variant="frost" effect="glass" size="sm">Pan</ore-button>
    </ore-button-group>
    <ore-button-group attached label="History" size="sm">
      <ore-button data-history="undo" variant="frost" effect="glass" size="sm">Undo</ore-button>
      <ore-button data-history="redo" variant="frost" effect="glass" size="sm">Redo</ore-button>
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
  });
  setToolButton('select');
  viewport.dataset.tool = 'select';

  return {
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
  };
}
