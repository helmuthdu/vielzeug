import { type Camera, createCamera, type Point } from '@vielzeug/atlas';
import { createDragGesture, createPinchGesture, createWheelGesture } from '@vielzeug/gesture';
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import { bezierRoute, findCycles, orthogonalRoute, polylineToSvgPath, topologicalOrder } from '@vielzeug/wire';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
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
  removeNodeCommand,
} from '../core/flow.ts';
import type { SceneHandle } from './shell.ts';
import './flow.css';

const ZOOM_STEP = 1.0015;

let nextNodeId = 1;
let nextEdgeId = 1;

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
  const camera: Camera = createCamera({ initial: { x: -80, y: -60, zoom: 1 } });
  const ledger = createLedger();
  let orthogonal = false;
  let selectedNodeId: string | null = null;

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

  const statusEl = document.createElement('div');
  statusEl.className = 'flow-status';
  statusEl.dataset.testid = 'flow-status';
  container.append(statusEl);

  // ── Seeded graph ──────────────────────────────────────────────────────────
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
      const obstacles = model.nodes
        .filter((node) => node.id !== edge.from.node && node.id !== edge.to.node)
        .map(nodeRect);
      const points = orthogonalRoute(from, to, { obstacles });
      if (points) return { d: polylineToSvgPath(points), fallback: false };
      // Unreachable during layout: dashed bezier fallback so the wire stays visible.
      return { d: bezierRoute(from, to), fallback: true };
    }
    return { d: bezierRoute(from, to), fallback: false };
  }

  const edgeEls = new Map<string, SVGPathElement>();

  function syncEdges(): void {
    const cycles = findCycles(
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
    for (const edge of model.edges) {
      let el = edgeEls.get(edge.id);
      if (!el) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.classList.add('flow-edge');
        el.dataset.edgeId = edge.id;
        edgesSvg.append(el);
        edgeEls.set(edge.id, el);
      }
      const { d, fallback } = edgePath(edge);
      el.setAttribute('d', d);
      el.classList.toggle('flow-edge-fallback', fallback);
      el.classList.toggle('flow-edge-cyclic', cyclicNodes.has(edge.from.node) && cyclicNodes.has(edge.to.node));
    }
    for (const node of model.nodes) {
      const el = nodeEls.get(node.id);
      if (el) el.classList.toggle('flow-node-cyclic', cyclicNodes.has(node.id));
    }
    syncStatus(cycles);
  }

  function syncStatus(cycles: string[][]): void {
    if (cycles.length > 0) {
      statusEl.textContent = `Cycle: ${cycles.map((cycle) => cycle.join(' → ')).join(' · ')}`;
      statusEl.dataset.state = 'cycle';
      return;
    }
    try {
      const order = topologicalOrder(
        model.nodes.map((node) => node.id),
        flowEdges(model.edges),
      );
      const labels = order.map((id) => model.getNode(id)?.label ?? id);
      statusEl.textContent = `Topological order: ${labels.join(' → ')}`;
      statusEl.dataset.state = 'ok';
    } catch {
      statusEl.textContent = 'Cycle detected';
      statusEl.dataset.state = 'cycle';
    }
  }

  function applyCamera(): void {
    const [a, b, c, d, e, f] = camera.matrix;
    world.style.transform = `matrix(${String(a)}, ${String(b)}, ${String(c)}, ${String(d)}, ${String(e)}, ${String(f)})`;
  }

  const unsubscribeCamera = camera.subscribe(applyCamera);
  const unsubscribeModel = model.subscribe(() => {
    syncNodes();
    syncEdges();
  });
  applyCamera();
  syncNodes();
  syncEdges();

  // Frame the seeded graph whatever the viewport size (mobile included).
  camera.fitBounds(
    { height: 224, width: 800, x: -80, y: -160 },
    { padding: 40, size: { x: viewport.clientWidth, y: viewport.clientHeight } },
  );

  // ── Pointer interaction ───────────────────────────────────────────────────
  type Interaction =
    | { kind: 'pan'; lastX: number; lastY: number }
    | { kind: 'move'; from: Map<string, Point>; originWorld: Point }
    | { kind: 'wire'; fromNode: string; fromPort: string }
    | null;

  let interaction: Interaction = null;
  let spacePan = false;
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

  const drag = createDragGesture(viewport, {
    onEnd: (detail) => {
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
        // Complete the connection when released over another node's in-port.
        const target = portFromEvent(detail.event);
        if (target && target.node !== active.fromNode && target.port !== 'out') {
          const edge: FlowEdge = {
            from: { node: active.fromNode, port: active.fromPort },
            id: `edge-${String(nextEdgeId++)}`,
            to: { node: target.node, port: target.port },
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
          tempPath.setAttribute('d', bezierRoute(from, { ...worldPoint, side: 'left' }));
        }
      }
    },
    onStart: (detail) => {
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
      interaction = { kind: 'pan', lastX: detail.start.x, lastY: detail.start.y };
    },
    shouldStart: (event) => event.button === 0 || event.pointerType !== 'mouse',
  });

  let pinchScale = 1;
  const pinch = createPinchGesture(viewport, {
    onMove: (detail) => {
      const box = viewport.getBoundingClientRect();
      const centroid = { x: detail.centroid.x - box.left, y: detail.centroid.y - box.top };
      const ratio = pinchScale === 0 ? 1 : detail.scale / pinchScale;
      pinchScale = detail.scale;
      if (ratio !== 1) camera.zoomAt(centroid, ratio);
      if (detail.deltaCentroid.x !== 0 || detail.deltaCentroid.y !== 0) {
        camera.panBy(detail.deltaCentroid.x, detail.deltaCentroid.y);
      }
    },
    onStart: (detail) => {
      drag.cancel();
      pinchScale = detail.scale;
    },
  });

  const wheel = createWheelGesture(viewport, {
    onWheel: (detail) => {
      const box = viewport.getBoundingClientRect();
      const point = { x: detail.event.clientX - box.left, y: detail.event.clientY - box.top };
      camera.zoomAt(point, ZOOM_STEP ** -detail.deltaY);
    },
    preventDefault: true,
  });

  // ── Toolbar and keyboard ──────────────────────────────────────────────────
  function deleteSelection(): void {
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
    model.addNode(node);
    ledger.record(addNodeCommand(model, node));
  }

  function toggleRouting(): void {
    orthogonal = !orthogonal;
    const routeButton = toolbarParent.querySelector<HTMLElement>('[data-action="route"]');
    if (routeButton) routeButton.textContent = orthogonal ? 'Orthogonal' : 'Bezier';
    syncEdges();
  }

  const toolbarParent = document.createElement('div');
  toolbarParent.className = 'studio-toolbar';
  toolbarParent.dataset.testid = 'flow-toolbar';
  toolbarParent.innerHTML = `
    <ore-button-group attached label="Flow tools" size="sm">
      <ore-button data-action="add-node" variant="frost" effect="glass" size="sm">Add node</ore-button>
      <ore-button data-action="route" variant="frost" effect="glass" size="sm">Bezier</ore-button>
    </ore-button-group>
    <ore-button-group attached label="History" size="sm">
      <ore-button data-history="undo" variant="frost" effect="glass" size="sm">Undo</ore-button>
      <ore-button data-history="redo" variant="frost" effect="glass" size="sm">Redo</ore-button>
    </ore-button-group>`;
  container.append(toolbarParent);

  toolbarParent.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action],[data-history]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'add-node') addNode();
    if (action === 'route') toggleRouting();
    const history = target.getAttribute('data-history');
    if (history === 'undo') void ledger.undo();
    if (history === 'redo') void ledger.redo();
  });

  const keymap = createKeymap(
    [
      { handler: () => void ledger.undo(), id: 'undo', shortcut: 'mod+z' },
      { handler: () => void ledger.redo(), id: 'redo', shortcut: 'mod+shift+z' },
      { handler: deleteSelection, id: 'delete', shortcut: 'delete' },
      { handler: addNode, id: 'add-node', shortcut: 'n' },
      { handler: toggleRouting, id: 'toggle-route', shortcut: 'o' },
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
      unmountKeymap();
      keymap.dispose();
      wheel.dispose();
      pinch.dispose();
      drag.dispose();
      unsubscribeModel();
      unsubscribeCamera();
      ledger.dispose();
      camera.dispose();
      model.dispose();
      container.innerHTML = '';
    },
    // Same framing as the initial mount: frame the seeded graph for the viewport.
    fit() {
      camera.fitBounds(
        { height: 224, width: 800, x: -80, y: -160 },
        { padding: 40, size: { x: viewport.clientWidth, y: viewport.clientHeight } },
      );
    },
  };
}
