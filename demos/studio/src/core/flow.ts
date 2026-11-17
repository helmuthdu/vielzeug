import type { Point, Rect } from '@vielzeug/atlas';
import type { ReversibleCommand } from '@vielzeug/ledger';
import type { Edge, PortSide } from '@vielzeug/wire';

/** A connection point on a node edge. `offset` is the 0..1 fraction along the side. */
export type FlowPort = Readonly<{ id: string; offset: number; side: PortSide }>;

/** A draggable node with an in port on the left and an out port on the right. */
export type FlowNode = Readonly<{
  height: number;
  id: string;
  label: string;
  ports: readonly FlowPort[];
  width: number;
  x: number;
  y: number;
}>;

/** A directed connection between one port of a node and one port of another. */
export type FlowEdge = Readonly<{
  from: { node: string; port: string };
  id: string;
  to: { node: string; port: string };
}>;

/** Where a port sits in world space, with the side its wire leaves along. */
export type PortAnchor = Point & Readonly<{ side: PortSide }>;

export interface FlowModel {
  addEdge(edge: FlowEdge): boolean;
  addNode(node: FlowNode): boolean;
  dispose(): void;
  edgeIdsTouching(nodeId: string): string[];
  readonly edges: readonly FlowEdge[];
  getEdge(id: string): FlowEdge | undefined;
  getNode(id: string): FlowNode | undefined;
  readonly nodes: readonly FlowNode[];
  /** World-space anchor of a port, or undefined for unknown ids. */
  portAnchor(nodeId: string, portId: string): PortAnchor | undefined;
  removeEdge(id: string): boolean;
  removeNode(id: string): boolean;
  /** Moves a node; returns false when unknown. */
  setNodePosition(id: string, position: Point): boolean;
  subscribe(listener: () => void, options?: Readonly<{ signal?: AbortSignal }>): () => void;
  [Symbol.dispose](): void;
}

export function createFlowModel(): FlowModel {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  const order: string[] = [];
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const model: FlowModel = {
    addEdge(edge) {
      if (edges.has(edge.id)) return false;
      if (!nodes.has(edge.from.node) || !nodes.has(edge.to.node)) return false;
      edges.set(edge.id, edge);
      notify();
      return true;
    },
    addNode(node) {
      if (nodes.has(node.id)) return false;
      nodes.set(node.id, node);
      order.push(node.id);
      notify();
      return true;
    },
    dispose() {
      listeners.clear();
    },
    edgeIdsTouching(nodeId) {
      const ids: string[] = [];
      for (const edge of edges.values()) {
        if (edge.from.node === nodeId || edge.to.node === nodeId) ids.push(edge.id);
      }
      return ids;
    },
    get edges() {
      return [...edges.values()];
    },
    getEdge(id) {
      return edges.get(id);
    },
    getNode(id) {
      return nodes.get(id);
    },
    get nodes() {
      return order.map((id) => nodes.get(id) as FlowNode);
    },
    portAnchor(nodeId, portId) {
      const node = nodes.get(nodeId);
      const port = node?.ports.find((entry) => entry.id === portId);
      if (!node || !port) return undefined;
      return { side: port.side, ...portPoint(node, port) };
    },
    removeEdge(id) {
      const removed = edges.delete(id);
      if (removed) notify();
      return removed;
    },
    removeNode(id) {
      const removed = nodes.delete(id);
      if (!removed) return false;
      const at = order.indexOf(id);
      if (at !== -1) order.splice(at, 1);
      for (const edge of [...edges.values()]) {
        if (edge.from.node === id || edge.to.node === id) edges.delete(edge.id);
      }
      notify();
      return true;
    },
    setNodePosition(id, position) {
      const node = nodes.get(id);
      if (!node) return false;
      nodes.set(id, { ...node, x: position.x, y: position.y });
      notify();
      return true;
    },
    subscribe(listener, options) {
      listeners.add(listener);
      options?.signal?.addEventListener('abort', () => listeners.delete(listener), { once: true });
      return () => {
        listeners.delete(listener);
      };
    },
    [Symbol.dispose]() {
      this.dispose();
    },
  };

  return model;
}

/** World-space point of a port on its node's side. */
export function portPoint(node: FlowNode, port: FlowPort): Point {
  switch (port.side) {
    case 'bottom':
      return { x: node.x + node.width * port.offset, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height * port.offset };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height * port.offset };
    case 'top':
      return { x: node.x + node.width * port.offset, y: node.y };
    default:
      return { x: node.x, y: node.y };
  }
}

/** Node bounding box for obstacle routing. */
export function nodeRect(node: FlowNode): Rect {
  return { height: node.height, width: node.width, x: node.x, y: node.y };
}

/** Wire endpoints for graph algorithms. */
export function flowEdges(edges: readonly FlowEdge[]): Edge[] {
  return edges.map((edge) => ({ from: edge.from.node, to: edge.to.node }));
}

export function moveNodeCommand(model: FlowModel, id: string, from: Point, to: Point): ReversibleCommand {
  return {
    apply: () => {
      model.setNodePosition(id, to);
    },
    label: 'Move node',
    revert: () => {
      model.setNodePosition(id, from);
    },
  };
}

export function addEdgeCommand(model: FlowModel, edge: FlowEdge): ReversibleCommand {
  return {
    apply: () => {
      model.addEdge(edge);
    },
    label: 'Connect ports',
    revert: () => {
      model.removeEdge(edge.id);
    },
  };
}

export function addNodeCommand(model: FlowModel, node: FlowNode): ReversibleCommand {
  return {
    apply: () => {
      model.addNode(node);
    },
    label: 'Add node',
    revert: () => {
      model.removeNode(node.id);
    },
  };
}

export function removeNodeCommand(model: FlowModel, node: FlowNode): ReversibleCommand {
  const edges = model.edgeIdsTouching(node.id);
  const snapshot = edges.map((id) => model.getEdge(id) as FlowEdge);
  return {
    apply: () => {
      model.removeNode(node.id);
    },
    label: 'Delete node',
    revert: () => {
      model.addNode(node);
      for (const edge of snapshot) model.addEdge(edge);
    },
  };
}
