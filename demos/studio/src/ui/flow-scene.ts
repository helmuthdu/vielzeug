import { type Camera, createCamera, type Point, type Rect, toCssMatrix, unionRect } from '@vielzeug/atlas';
import { createDragGesture } from '@vielzeug/gesture';
import { createKeymap, formatShortcut } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import {
  bezierRoute,
  bezierToSvgPath,
  findCyclicGroups,
  orthogonalRoute,
  polylineToSvgPath,
  topologicalOrder,
} from '@vielzeug/wire';
import { trackDockHeight } from './dock-badge.ts';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/dock';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/tooltip';
import {
  addEdgeCommand,
  addNodeCommand,
  createFlowModel,
  type FlowEdge,
  type FlowModel,
  type FlowNode,
  flowEdges,
  moveNodeCommand,
  nodeRect,
  removeEdgeCommand,
  removeNodeCommand,
} from '../core/flow.ts';
import { advanceIdCounter, createFlowPersistence, studioStore } from '../core/persist.ts';
import { createCameraGestures } from './camera-gestures.ts';
import type { SceneHandle } from './shell.ts';
import './flow.css';

let nextNodeId = 1;
let nextEdgeId = 1;

/** Tooltip label with a platform-correct shortcut, e.g. "Undo (Ctrl+Z)". */
function toolTip(label: string, shortcut: string): string {
  return `${label} (${formatShortcut(shortcut)})`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function screenPoint(viewport: HTMLElement, clientX: number, clientY: number): Point {
  const box = viewport.getBoundingClientRect();
  return { x: clientX - box.left, y: clientY - box.top };
}

function makeNode(x: number, y: number, label: string): FlowNode {
  return {
    height: 64,
    id: `node-${String(nextNodeId++)}`,
    label,
    ports: [
      { id: 'in', offset: 0.5, side: 'left' },
      { id: 'out', offset: 0.5, side: 'right' },
    ],
    width: 160,
    x,
    y,
  };
}

/**
 * Mounts the flow scene: a node editor proving @vielzeug/wire edge routing
 * (bezier and orthogonal obstacle-avoiding A*), topological ordering, and
 * cycle detection over draggable DOM nodes.
 */
export function mountFlowScene(container: HTMLElement): SceneHandle {
  const model: FlowModel = createFlowModel();
  const persistence = createFlowPersistence(studioStore());
  const camera: Camera = createCamera({ initial: { x: -80, y: -60, zoom: 1 } });
  const ledger = createLedger();
  let orthogonal = false;
  let selectedNodeId: string | null = null;
  let selectedEdgeId: string | null = null;
  // Dock buttons live in the toolbar created later; the early syncEdges() run
  // tolerates them being null.
  let deleteButton: HTMLElement | null = null;
  let undoButton: HTMLElement | null = null;
  let redoButton: HTMLElement | null = null;

  container.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'studio-viewport flow-viewport';
  viewport.dataset.testid = 'flow-viewport';
  viewport.style.touchAction = 'none';

  const world = document.createElement('div');
  world.className = 'studio-world';
  world.dataset.testid = 'flow-world';

  const edgesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  edgesSvg.classList.add('flow-edges');
  edgesSvg.setAttribute('overflow', 'visible');
  edgesSvg.dataset.testid = 'flow-edges';
  world.append(edgesSvg);

  const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tempPath.classList.add('flow-edge', 'flow-edge-temp');
  tempPath.style.display = 'none';
  edgesSvg.append(tempPath);

  const nodesLayer = document.createElement('div');
  nodesLayer.className = 'flow-nodes';
  world.append(nodesLayer);

  viewport.append(world);
  container.append(viewport);

  // Shared info pill (see .studio-badge in app.css); the cycle alert swaps the
  // badge's own color rather than recoloring a hand-rolled pill.
  const statusEl = document.createElement('ore-badge');
  statusEl.setAttribute('variant', 'frost');
  statusEl.setAttribute('rounded', 'full');
  statusEl.className = 'studio-badge';
  statusEl.dataset.testid = 'flow-status';
  container.append(statusEl);

  // ── Seeded graph ──────────────────────────────────────────────────────────
  function seedFlow(): void {
    const seedA = makeNode(0, 0, 'Input');
    const seedB = makeNode(280, -80, 'Validate');
    const seedC = makeNode(280, 80, 'Transform');
    const seedD = makeNode(560, 0, 'Output');
    for (const node of [seedA, seedB, seedC, seedD]) model.addNode(node);
    model.addEdge({ from: { node: seedA.id, port: 'out' }, id: 'edge-1', to: { node: seedB.id, port: 'in' } });
    model.addEdge({ from: { node: seedA.id, port: 'out' }, id: 'edge-2', to: { node: seedC.id, port: 'in' } });
    model.addEdge({ from: { node: seedB.id, port: 'out' }, id: 'edge-3', to: { node: seedD.id, port: 'in' } });
    model.addEdge({ from: { node: seedC.id, port: 'out' }, id: 'edge-4', to: { node: seedD.id, port: 'in' } });
    nextEdgeId = 5;
  }

  // ── DOM sync ──────────────────────────────────────────────────────────────
  const nodeEls = new Map<string, HTMLElement>();

  function syncNodes(): void {
    const live = new Set(model.nodes.map((node) => node.id));
    for (const [id, el] of nodeEls) {
      if (!live.has(id)) {
        el.remove();
        nodeEls.delete(id);
      }
    }
    for (const node of model.nodes) {
      let el = nodeEls.get(node.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'flow-node';
        el.dataset.nodeId = node.id;
        el.innerHTML = `<span class="flow-node-label"></span>${node.ports
          .map(
            (port) =>
              `<span class="flow-port" data-port-id="${port.id}" data-port-side="${port.side}" title="${port.id}"></span>`,
          )
          .join('')}`;
        nodesLayer.append(el);
        nodeEls.set(node.id, el);
      }
      el.style.transform = `translate(${String(node.x)}px, ${String(node.y)}px)`;
      el.style.width = `${String(node.width)}px`;
      el.style.height = `${String(node.height)}px`;
      el.classList.toggle('is-selected', node.id === selectedNodeId);
      const label = el.querySelector('.flow-node-label');
      if (label && label.textContent !== node.label) label.textContent = node.label;
      for (const port of node.ports) {
        const portEl = el.querySelector<HTMLElement>(`[data-port-id="${port.id}"]`);
        if (portEl) portEl.dataset.portSide = port.side;
      }
    }
  }

  function edgePath(edge: FlowEdge): { d: string; fallback: boolean } {
    const from = model.portAnchor(edge.from.node, edge.from.port);
    const to = model.portAnchor(edge.to.node, edge.to.port);
    if (!from || !to) return { d: '', fallback: false };
    if (orthogonal) {
      // Every node rect is an obstacle; the router exempts each port's own node
      // for that port's straight exit segment.
      const points = orthogonalRoute(from, to, { obstacles: model.nodes.map(nodeRect) });
      if (points) return { d: polylineToSvgPath(points), fallback: false };
      // Unreachable during layout: dashed bezier fallback so the wire stays visible.
      return { d: bezierToSvgPath(bezierRoute(from, to)), fallback: true };
    }
    return { d: bezierToSvgPath(bezierRoute(from, to)), fallback: false };
  }

  const edgeEls = new Map<string, SVGPathElement>();
  const edgeHitEls = new Map<string, SVGPathElement>();

  function syncEdges(): void {
    const cycles = findCyclicGroups(
      model.nodes.map((node) => node.id),
      flowEdges(model.edges),
    );
    const cyclicNodes = new Set(cycles.flat());
    const live = new Set(model.edges.map((edge) => edge.id));
    for (const [id, el] of edgeEls) {
      if (!live.has(id)) {
        el.remove();
        edgeEls.delete(id);
      }
    }
    for (const [id, el] of edgeHitEls) {
      if (!live.has(id)) {
        el.remove();
        edgeHitEls.delete(id);
      }
    }
    for (const edge of model.edges) {
      let el = edgeEls.get(edge.id);
      if (!el) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.classList.add('flow-edge');
        el.dataset.edgeId = edge.id;
        edgesSvg.append(el);
        edgeEls.set(edge.id, el);
      }
      // Wide transparent twin under the visible wire: makes the edge clickable
      // (and touch-selectable) without widening the drawn stroke.
      let hit = edgeHitEls.get(edge.id);
      if (!hit) {
        hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.classList.add('flow-edge-hit');
        hit.dataset.edgeId = edge.id;
        edgesSvg.append(hit);
        edgeHitEls.set(edge.id, hit);
      }
      const { d, fallback } = edgePath(edge);
      el.setAttribute('d', d);
      hit.setAttribute('d', d);
      el.classList.toggle('flow-edge-fallback', fallback);
      el.classList.toggle('flow-edge-cyclic', cyclicNodes.has(edge.from.node) && cyclicNodes.has(edge.to.node));
      el.classList.toggle('flow-edge-selected', edge.id === selectedEdgeId);
      hit.classList.toggle('flow-edge-selected', edge.id === selectedEdgeId);
    }
    for (const node of model.nodes) {
      const el = nodeEls.get(node.id);
      if (el) el.classList.toggle('flow-node-cyclic', cyclicNodes.has(node.id));
    }
    syncStatus(cycles);
    syncDockState();
  }

  function syncStatus(cyclicGroups: string[][]): void {
    if (cyclicGroups.length > 0) {
      // A group is a set of mutually reachable nodes, not a path through them.
      // Labels keep the message readable; ids mean nothing to a viewer.
      const label = (id: string) => model.getNode(id)?.label ?? id;
      statusEl.textContent = `Cycle: ${cyclicGroups.map((group) => group.map(label).join(', ')).join(' · ')}`;
      statusEl.dataset.state = 'cycle';
      // The badge's own error theme, not a recolored pill.
      statusEl.setAttribute('color', 'error');
      return;
    }
    const order = topologicalOrder(
      model.nodes.map((node) => node.id),
      flowEdges(model.edges),
    );
    const labels = order.map((id) => model.getNode(id)?.label ?? id);
    statusEl.textContent = `Topological order: ${labels.join(' → ')}`;
    statusEl.title = statusEl.textContent;
    statusEl.dataset.state = 'ok';
    statusEl.removeAttribute('color');
  }

  function applyCamera(): void {
    world.style.transform = toCssMatrix(camera.matrix);
  }

  const unsubscribeCamera = camera.subscribe(applyCamera);
  const unsubscribeModel = model.subscribe(() => {
    syncNodes();
    syncEdges();
    // Persist on every model change, coalesced to one write per frame; the
    // adapter writes synchronously, so a reload right after an edit is safe.
    persistence.nodes.schedule(() => model.nodes);
    persistence.edges.schedule(() => model.edges);
  });
  applyCamera();
  syncNodes();
  syncEdges();

  // Frame whatever the graph currently holds, whatever the viewport size.
  function fitToContent(): void {
    camera.resize({ height: viewport.clientHeight, width: viewport.clientWidth });
    let bounds: Rect | null = null;
    for (const node of model.nodes) {
      const nodeBounds = nodeRect(node);
      bounds = bounds ? unionRect(bounds, nodeBounds) : nodeBounds;
    }
    if (bounds) camera.fitBounds(bounds, { padding: 40 });
  }
  // Restore the saved graph, or seed a fresh one when storage is empty. The
  // scene mounts synchronously, so content lands once storage resolves; ids
  // already in storage must not be reused, so the counters move past the
  // highest restored number before anything new is minted.
  void Promise.all([persistence.nodes.load(), persistence.edges.load()]).then(([nodes, edges]) => {
    if (nodes.length === 0) {
      seedFlow();
    } else {
      nextNodeId = Math.max(
        nextNodeId,
        advanceIdCounter(
          nodes.map((node) => node.id),
          'node-',
        ),
      );
      nextEdgeId = Math.max(
        nextEdgeId,
        advanceIdCounter(
          edges.map((edge) => edge.id),
          'edge-',
        ),
      );
      for (const node of nodes) model.addNode(node);
      for (const edge of edges) model.addEdge(edge);
    }
    fitToContent();
  });

  // ── Pointer interaction ───────────────────────────────────────────────────
  type Interaction =
    | { kind: 'pan'; lastX: number; lastY: number }
    | { kind: 'move'; from: Map<string, Point>; originWorld: Point }
    | { kind: 'wire'; fromNode: string; fromPort: string }
    | null;

  let interaction: Interaction = null;
  let spacePan = false;
  // A real drag (activation distance crossed) must not re-select on the click
  // that follows it.
  let dragActivated = false;
  let suppressClick = false;
  // The drag gesture's onStart fires after the activation distance is crossed,
  // by which point the event is a pointermove. Record the port under the
  // pointer at pointerdown so a wire drag can start from it.
  let pointerPort: { node: string; port: string } | null = null;
  let pointerNodeId: string | null = null;
  viewport.addEventListener('pointerdown', (event) => {
    pointerPort = portFromEvent(event);
    const nodeEl = nodeFromEvent(event);
    pointerNodeId = nodeEl ? (nodeEl.dataset.nodeId as string) : null;
  });

  function nodeFromEvent(event: PointerEvent | MouseEvent): HTMLElement | null {
    const atPoint = viewport.ownerDocument.elementFromPoint(event.clientX, event.clientY) ?? event.target;
    return atPoint instanceof Element ? atPoint.closest<HTMLElement>('[data-node-id]') : null;
  }

  function portFromEvent(event: PointerEvent | MouseEvent): { node: string; port: string } | null {
    // During a drag the viewport holds pointer capture, so hit-test the point
    // under the cursor rather than trusting event.target.
    const atPoint = viewport.ownerDocument.elementFromPoint(event.clientX, event.clientY) ?? event.target;
    const target = atPoint instanceof Element ? atPoint.closest('.flow-port') : null;
    const nodeEl = target?.closest<HTMLElement>('[data-node-id]');
    const portId = target?.getAttribute('data-port-id');
    if (!nodeEl || !portId) return null;
    return { node: nodeEl.dataset.nodeId as string, port: portId };
  }

  /**
   * A wire release anywhere over another node — its body, in-port, or even its
   * out-port dot (the only visible target on that side) — targets its in-port.
   * Missing the 12px port dot must never silently drop the wire.
   */
  function wireTarget(event: PointerEvent | MouseEvent): { node: string; port: string } | null {
    const nodeEl = nodeFromEvent(event);
    if (!nodeEl) return null;
    return { node: nodeEl.dataset.nodeId as string, port: 'in' };
  }

  const drag = createDragGesture(viewport, {
    activationDistance: 3,
    onEnd: (detail) => {
      suppressClick = dragActivated;
      dragActivated = false;
      const active = interaction;
      interaction = null;
      pointerNodeId = null;
      if (!active) return;
      if (active.kind === 'move') {
        for (const [id, from] of active.from) {
          const node = model.getNode(id);
          if (node) ledger.record(moveNodeCommand(model, id, from, { x: node.x, y: node.y }));
        }
      }
      if (active.kind === 'wire') {
        pointerPort = null;
        tempPath.style.display = 'none';
        tempPath.setAttribute('d', '');
        // Complete the connection when released anywhere over another node.
        // A wire pulled from an in-port runs backwards, so flip the direction
        // and keep the flow out → in.
        const target = wireTarget(detail.event);
        if (target && target.node !== active.fromNode) {
          const backward = active.fromPort === 'in';
          const edge: FlowEdge = {
            from: backward ? { node: target.node, port: 'out' } : { node: active.fromNode, port: active.fromPort },
            id: `edge-${String(nextEdgeId++)}`,
            to: backward ? { node: active.fromNode, port: 'in' } : { node: target.node, port: 'in' },
          };
          // record() only stores history; the mutation happens here (board-scene convention).
          model.addEdge(edge);
          ledger.record(addEdgeCommand(model, edge));
        }
      }
    },
    onMove: (detail) => {
      const point = screenPoint(viewport, detail.current.x, detail.current.y);
      const active = interaction;
      if (!active) return;
      if (active.kind === 'pan') {
        camera.panBy(detail.current.x - active.lastX, detail.current.y - active.lastY);
        active.lastX = detail.current.x;
        active.lastY = detail.current.y;
        return;
      }
      const worldPoint = camera.toWorld(point);
      if (active.kind === 'move') {
        const dx = worldPoint.x - active.originWorld.x;
        const dy = worldPoint.y - active.originWorld.y;
        for (const [id, from] of active.from) {
          model.setNodePosition(id, { x: from.x + dx, y: from.y + dy });
        }
        return;
      }
      if (active.kind === 'wire') {
        const from = model.portAnchor(active.fromNode, active.fromPort);
        if (from) {
          tempPath.style.display = '';
          tempPath.setAttribute('d', bezierToSvgPath(bezierRoute(from, { ...worldPoint, side: 'left' })));
        }
      }
    },
    onStart: (detail) => {
      dragActivated = true;
      const point = screenPoint(viewport, detail.start.x, detail.start.y);
      const worldPoint = camera.toWorld(point);
      if (pointerPort && !spacePan) {
        interaction = { fromNode: pointerPort.node, fromPort: pointerPort.port, kind: 'wire' };
        return;
      }
      if (spacePan) {
        interaction = { kind: 'pan', lastX: detail.start.x, lastY: detail.start.y };
        return;
      }
      // The onStart event is a pointermove on the capturing viewport, so use
      // the node recorded at pointerdown.
      const id = pointerNodeId;
      if (id) {
        selectedNodeId = id;
        selectedEdgeId = null;
        syncNodes();
        syncEdges();
        const node = model.getNode(id);
        if (node) {
          interaction = {
            from: new Map([[id, { x: node.x, y: node.y }]]),
            kind: 'move',
            originWorld: worldPoint,
          };
        }
        return;
      }
      selectedNodeId = null;
      selectedEdgeId = null;
      syncNodes();
      syncEdges();
      interaction = { kind: 'pan', lastX: detail.start.x, lastY: detail.start.y };
    },
    shouldStart: (event) => event.button === 0 || event.pointerType !== 'mouse',
  });

  // Plain click/tap (no drag) selects: an edge hit path first, then a node,
  // then clears. Drags select in the gesture's onStart and suppress this path.
  viewport.addEventListener('click', (event) => {
    if (suppressClick) return;
    const atPoint = viewport.ownerDocument.elementFromPoint(event.clientX, event.clientY) ?? event.target;
    const edgeEl = atPoint instanceof Element ? atPoint.closest<SVGPathElement>('.flow-edge-hit') : null;
    if (edgeEl) {
      selectedEdgeId = edgeEl.dataset.edgeId ?? null;
      selectedNodeId = null;
      syncEdges();
      return;
    }
    const nodeEl = nodeFromEvent(event);
    selectedEdgeId = null;
    selectedNodeId = nodeEl ? (nodeEl.dataset.nodeId as string) : null;
    syncNodes();
    syncEdges();
  });

  const cameraGestures = createCameraGestures(viewport, camera, () => drag.cancel());

  // ── Toolbar and keyboard ──────────────────────────────────────────────────
  function deleteSelection(): void {
    if (selectedEdgeId) {
      const edge = model.getEdge(selectedEdgeId);
      if (edge) {
        selectedEdgeId = null;
        model.removeEdge(edge.id);
        ledger.record(removeEdgeCommand(model, edge));
        syncEdges();
      }
      return;
    }
    if (!selectedNodeId) return;
    const node = model.getNode(selectedNodeId);
    if (!node) return;
    selectedNodeId = null;
    // Build the command first: it snapshots the node's edges before removal.
    const command = removeNodeCommand(model, node);
    model.removeNode(node.id);
    ledger.record(command);
  }

  function addNode(): void {
    const center = camera.toWorld({ x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 });
    const node = makeNode(center.x - 80, center.y - 32, `Step ${String(nextNodeId)}`);
    // Select before mutating: the model subscription re-renders synchronously.
    selectedNodeId = node.id;
    selectedEdgeId = null;
    model.addNode(node);
    ledger.record(addNodeCommand(model, node));
  }

  function setRouting(value: string): void {
    const next = value === 'orthogonal';
    if (next === orthogonal) return;
    orthogonal = next;
    // Keyboard toggles must move the segmented control too, so its checked
    // radio always matches how wires are drawn.
    routingGroup?.setAttribute('value', next ? 'orthogonal' : 'curved');
    syncEdges();
  }

  const toolbarParent = document.createElement('ore-dock');
  toolbarParent.setAttribute('floating', '');
  toolbarParent.setAttribute('label', 'Flow actions');
  toolbarParent.className = 'studio-dock';
  toolbarParent.dataset.testid = 'flow-toolbar';
  toolbarParent.innerHTML = `
    <ore-button-group label="Flow tools" size="sm">
      <ore-tooltip content="${toolTip('Add node', 'n')}" placement="top"><ore-button data-action="add-node" variant="ghost" icon-only label="Add node"><ore-icon name="plus"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Delete selection', 'delete')}" placement="top"><ore-button data-action="delete" variant="ghost" icon-only label="Delete selection" emphasis="destructive" disabled><ore-icon name="trash-2"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="Edge routing" size="sm" value="curved" data-testid="flow-routing">
      <ore-tooltip content="Smooth bezier wires" placement="top"><ore-button value="curved" variant="ghost" icon-only label="Curved routing"><ore-icon name="spline"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Right-angle wires that avoid nodes" placement="top"><ore-button value="orthogonal" variant="ghost" icon-only label="Orthogonal routing"><ore-icon name="corner-down-right"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="History" size="sm">
      <ore-tooltip content="${toolTip('Undo', 'mod+z')}" placement="top"><ore-button data-history="undo" variant="ghost" icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Redo', 'mod+shift+z')}" placement="top"><ore-button data-history="redo" variant="ghost" icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-tooltip content="Reset to the seeded graph and clear the saved copy" placement="top"><ore-button data-action="reset" variant="ghost" icon-only label="Reset flow"><ore-icon name="eraser"></ore-icon></ore-button></ore-tooltip>
    <ore-separator orientation="vertical"></ore-separator>`;
  container.append(toolbarParent);
  // The status pill sits above the dock; track the capsule's real height.
  const stopDockTrack = trackDockHeight(toolbarParent, container);

  const routingGroup = toolbarParent.querySelector<HTMLElement>('[data-testid="flow-routing"]');
  deleteButton = toolbarParent.querySelector<HTMLElement>('[data-action="delete"]');
  undoButton = toolbarParent.querySelector<HTMLElement>('[data-history="undo"]');
  redoButton = toolbarParent.querySelector<HTMLElement>('[data-history="redo"]');

  /** Dock enablement mirrors what the user can actually do right now. */
  function syncDockState(): void {
    deleteButton?.toggleAttribute('disabled', selectedNodeId === null && selectedEdgeId === null);
    if (!undoButton || !redoButton) return;
    const state = ledger.state.getSnapshot();
    undoButton.toggleAttribute('disabled', state.undo.length === 0);
    redoButton.toggleAttribute('disabled', state.redo.length === 0);
  }

  toolbarParent.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action],[data-history]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'add-node') addNode();
    if (action === 'delete') deleteSelection();
    if (action === 'reset') resetFlow();
    const history = target.getAttribute('data-history');
    if (history === 'undo') void ledger.undo();
    if (history === 'redo') void ledger.redo();
  });

  /** Restores the seeded graph and drops the saved copy with it. */
  function resetFlow(): void {
    for (const node of model.nodes) model.removeNode(node.id);
    selectedNodeId = null;
    selectedEdgeId = null;
    void ledger.clear();
    seedFlow();
    fitToContent();
    // Persist the reseed (and supersede any in-flight write) so the stored
    // scene always matches what is on screen.
    persistence.nodes.flush(model.nodes);
    persistence.edges.flush(model.edges);
  }

  routingGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value) setRouting(value);
  });

  // History depth changes without touching the model, so it needs its own
  // subscription to keep the undo/redo buttons honest.
  const unsubscribeLedger = ledger.state.subscribe(syncDockState);
  syncDockState();

  const keymap = createKeymap(
    [
      { handler: () => void ledger.undo(), id: 'undo', shortcut: 'mod+z' },
      { handler: () => void ledger.redo(), id: 'redo', shortcut: 'mod+shift+z' },
      // Mac keyboards label Backspace "delete"; both keys must delete.
      { handler: deleteSelection, id: 'delete', shortcut: 'delete' },
      { handler: deleteSelection, id: 'backspace', shortcut: 'backspace' },
      { handler: addNode, id: 'add-node', shortcut: 'n' },
      { handler: () => setRouting(orthogonal ? 'curved' : 'orthogonal'), id: 'toggle-route', shortcut: 'o' },
      {
        handler: () => {
          spacePan = true;
        },
        id: 'space-pan',
        shortcut: 'space',
        trigger: 'keydown',
        when: (event) => !event.repeat,
      },
      {
        handler: () => {
          spacePan = false;
        },
        id: 'space-pan-end',
        shortcut: 'space',
        trigger: 'keyup',
      },
    ],
    { when: (event) => !isEditableTarget(event.target) },
  );
  const unmountKeymap = keymap.mount(viewport.ownerDocument);

  return {
    camera,
    dispose() {
      stopDockTrack();
      persistence.nodes.stop();
      persistence.edges.stop();
      unmountKeymap();
      keymap.dispose();
      cameraGestures.dispose();
      drag.dispose();
      unsubscribeModel();
      unsubscribeLedger();
      unsubscribeCamera();
      ledger.dispose();
      camera.dispose();
      model.dispose();
      container.innerHTML = '';
    },
    dock: toolbarParent,
    // Same framing as the initial mount: frame the current graph for the viewport.
    fit: fitToContent,
  };
}
