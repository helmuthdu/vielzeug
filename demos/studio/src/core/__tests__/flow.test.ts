import { portAnchor } from '@vielzeug/wire';
import { describe, expect, it } from 'vitest';

import {
  addEdgeCommand,
  createFlowModel,
  type FlowNode,
  nodeRect,
  removeEdgeCommand,
  removeNodeCommand,
} from '../flow.ts';

function node(id: string, x = 0, y = 0): FlowNode {
  return {
    height: 64,
    id,
    label: id,
    ports: [
      { id: 'in', offset: 0.5, side: 'left' },
      { id: 'out', offset: 0.5, side: 'right' },
    ],
    width: 160,
    x,
    y,
  };
}

function seed() {
  const model = createFlowModel();
  model.addNode(node('a', 0, 0));
  model.addNode(node('b', 280, 0));
  model.addNode(node('c', 560, 0));
  model.addEdge({ from: { node: 'a', port: 'out' }, id: 'e1', to: { node: 'b', port: 'in' } });
  model.addEdge({ from: { node: 'b', port: 'out' }, id: 'e2', to: { node: 'c', port: 'in' } });
  return model;
}

describe('flow model', () => {
  it('keeps nodes in insertion order', () => {
    expect(seed().nodes.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('places ports on the node edge by side and offset', () => {
    const model = seed();
    expect(model.portAnchor('a', 'out')).toEqual({ side: 'right', x: 160, y: 32 });
    expect(model.portAnchor('b', 'in')).toEqual({ side: 'left', x: 280, y: 32 });
    expect(model.portAnchor('a', 'ghost')).toBeUndefined();
  });

  it('portAnchor follows the node position', () => {
    const n = node('n', 100, 50);
    expect(portAnchor(nodeRect(n), 'top', 0.25)).toEqual({ side: 'top', x: 140, y: 50 });
    expect(portAnchor(nodeRect(n), 'bottom', 1)).toEqual({ side: 'bottom', x: 260, y: 114 });
  });

  it('rejects duplicate ids and edges to unknown nodes', () => {
    const model = seed();
    expect(model.addNode(node('a'))).toBe(false);
    expect(model.addEdge({ from: { node: 'a', port: 'out' }, id: 'e9', to: { node: 'ghost', port: 'in' } })).toBe(
      false,
    );
  });

  it('removing a node removes its edges', () => {
    const model = seed();
    expect(model.removeNode('b')).toBe(true);
    expect(model.edges.map((edge) => edge.id)).toEqual([]);
    expect(model.getNode('b')).toBeUndefined();
  });

  it('notifies subscribers on mutation', () => {
    const model = seed();
    let notifications = 0;
    model.subscribe(() => {
      notifications += 1;
    });
    model.setNodePosition('a', { x: 1, y: 1 });
    model.removeEdge('e1');
    expect(notifications).toBe(2);
  });

  it('edge commands round-trip', () => {
    const model = seed();
    const edge = { from: { node: 'a', port: 'out' }, id: 'e3', to: { node: 'c', port: 'in' } } as const;
    const command = addEdgeCommand(model, edge);
    command.apply({ signal: new AbortController().signal });
    expect(model.getEdge('e3')).toBeDefined();
    command.revert({ signal: new AbortController().signal });
    expect(model.getEdge('e3')).toBeUndefined();
  });

  it('removing an edge round-trips', () => {
    const model = seed();
    const edge = model.getEdge('e1');
    if (!edge) throw new Error('seed missing e1');
    const command = removeEdgeCommand(model, edge);
    command.apply({ signal: new AbortController().signal });
    expect(model.getEdge('e1')).toBeUndefined();
    command.revert({ signal: new AbortController().signal });
    expect(model.getEdge('e1')).toBeDefined();
  });

  it('removing a node snapshots and restores its edges', () => {
    const model = seed();
    const b = model.getNode('b');
    if (!b) throw new Error('seed missing b');
    const command = removeNodeCommand(model, b);
    command.apply({ signal: new AbortController().signal });
    expect(model.edges).toHaveLength(0);
    command.revert({ signal: new AbortController().signal });
    expect(model.getNode('b')).toBeDefined();
    expect(model.edges.map((edge) => edge.id)).toEqual(['e1', 'e2']);
  });
});
