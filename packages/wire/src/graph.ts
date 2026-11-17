import { WireGraphError } from './errors.js';
import type { Edge } from './types.js';

/** Maps each node id to its input-order index; rejects duplicates so ordering contracts stay well-defined. */
function buildNodeIndex(nodeIds: readonly string[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const id of nodeIds) {
    if (index.has(id)) {
      throw new WireGraphError(`Duplicate node id "${id}" in the node list.`);
    }
    index.set(id, index.size);
  }
  return index;
}

function validateEdgeEndpoints(index: ReadonlyMap<string, number>, edges: readonly Edge[]): void {
  for (const edge of edges) {
    if (!index.has(edge.from)) {
      throw new WireGraphError(`Edge from "${edge.from}" to "${edge.to}" references unknown node id "${edge.from}".`);
    }
    if (!index.has(edge.to)) {
      throw new WireGraphError(`Edge from "${edge.from}" to "${edge.to}" references unknown node id "${edge.to}".`);
    }
  }
}

/**
 * Returns the node ids in topological order using Kahn's algorithm.
 *
 * Ties between ready nodes break by position in `nodeIds`, so the result is fully
 * deterministic for the same inputs. Parallel edges are tolerated; self-loops and
 * larger cycles make ordering impossible and throw `WireGraphError`.
 */
export function topologicalOrder(nodeIds: readonly string[], edges: readonly Edge[]): string[] {
  const index = buildNodeIndex(nodeIds);
  validateEdgeEndpoints(index, edges);

  const count = nodeIds.length;
  const outgoing: number[][] = Array.from({ length: count }, () => []);
  const indegree = new Array<number>(count).fill(0);
  for (const edge of edges) {
    const from = index.get(edge.from) as number;
    const to = index.get(edge.to) as number;
    outgoing[from]?.push(to);
    indegree[to] = (indegree[to] ?? 0) + 1;
  }

  // Ready nodes are always consumed in input order, never an arbitrary FIFO.
  const ready: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (indegree[i] === 0) ready.push(i);
  }

  const order: string[] = [];
  while (ready.length > 0) {
    let bestSlot = 0;
    for (let slot = 1; slot < ready.length; slot += 1) {
      if ((ready[slot] ?? 0) < (ready[bestSlot] ?? 0)) bestSlot = slot;
    }
    const node = ready.splice(bestSlot, 1)[0] as number;
    order.push(nodeIds[node] as string);
    for (const next of outgoing[node] ?? []) {
      const remaining = (indegree[next] ?? 0) - 1;
      indegree[next] = remaining;
      if (remaining === 0) ready.push(next);
    }
  }

  if (order.length !== count) {
    throw new WireGraphError('Graph contains a cycle; no topological order exists. Use findCycles() to locate it.');
  }
  return order;
}

/**
 * Returns the cyclic parts of the graph as strongly connected components (Tarjan).
 *
 * Each returned cycle is an SCC with more than one node, or a single node carrying a
 * self-loop — never an exponential enumeration of elementary cycles. Cycles are ordered
 * by the input position of their first member, and members within a cycle are sorted by
 * input position, so results are deterministic.
 */
export function findCycles(nodeIds: readonly string[], edges: readonly Edge[]): string[][] {
  const index = buildNodeIndex(nodeIds);
  validateEdgeEndpoints(index, edges);

  const count = nodeIds.length;
  const outgoing: number[][] = Array.from({ length: count }, () => []);
  const selfLoop = new Array<boolean>(count).fill(false);
  for (const edge of edges) {
    const from = index.get(edge.from) as number;
    const to = index.get(edge.to) as number;
    if (from === to) selfLoop[from] = true;
    outgoing[from]?.push(to);
  }

  const lowLink = new Array<number>(count).fill(-1);
  const discovery = new Array<number>(count).fill(-1);
  const onStack = new Array<boolean>(count).fill(false);
  const stack: number[] = [];
  const cycles: string[][] = [];
  let time = 0;

  const strongConnect = (root: number): void => {
    // Iterative Tarjan: node editors can hold thousands of nodes, and recursion depth
    // must not scale with the longest dependency chain.
    const work: { node: number; child: number }[] = [{ child: 0, node: root }];
    const enter = (node: number): void => {
      discovery[node] = time;
      lowLink[node] = time;
      time += 1;
      stack.push(node);
      onStack[node] = true;
    };
    enter(root);

    while (work.length > 0) {
      const frame = work[work.length - 1] as { node: number; child: number };
      const children = outgoing[frame.node] ?? [];
      if (frame.child < children.length) {
        const child = children[frame.child] as number;
        frame.child += 1;
        if (discovery[child] === -1) {
          enter(child);
          work.push({ child: 0, node: child });
        } else if (onStack[child]) {
          lowLink[frame.node] = Math.min(lowLink[frame.node] as number, discovery[child] as number);
        }
        continue;
      }

      work.pop();
      const parent = work[work.length - 1];
      if (parent) {
        lowLink[parent.node] = Math.min(lowLink[parent.node] as number, lowLink[frame.node] as number);
      }
      if ((lowLink[frame.node] as number) === (discovery[frame.node] as number)) {
        const component: number[] = [];
        let member = -1;
        do {
          member = stack.pop() as number;
          onStack[member] = false;
          component.push(member);
        } while (member !== frame.node);

        const isCyclic = component.length > 1 || (component.length === 1 && selfLoop[component[0] as number]);
        if (isCyclic) {
          component.sort((a, b) => a - b);
          cycles.push(component.map((member) => nodeIds[member] as string));
        }
      }
    }
  };

  for (let i = 0; i < count; i += 1) {
    if (discovery[i] === -1) strongConnect(i);
  }

  cycles.sort((a, b) => (index.get(a[0] as string) as number) - (index.get(b[0] as string) as number));
  return cycles;
}
