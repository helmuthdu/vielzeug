import { describe, expect, it } from 'vitest';

import { describeCoupling, isIndependent, readDependencyGraph, ROOT } from '../worktree.mjs';

describe('readDependencyGraph()', () => {
  const graph = readDependencyGraph(ROOT);

  it('finds every package under packages/', () => {
    expect(graph.has('ripple')).toBe(true);
    expect(graph.has('sandbox')).toBe(true);
    expect(graph.size).toBeGreaterThan(20);
  });

  it('records real @vielzeug/* dependency edges, matching package.json', () => {
    expect(graph.get('ore')).toContain('ripple');
    expect(graph.get('refine')).toContain('arsenal');
  });

  it('does not record non-@vielzeug dependencies', () => {
    for (const deps of graph.values()) {
      for (const dep of deps) {
        expect(dep.startsWith('@')).toBe(false); // stored bare, e.g. "ripple" not "@vielzeug/ripple"
      }
    }
  });
});

describe('describeCoupling() / isIndependent()', () => {
  it('reports both directions of coupling', () => {
    const graph = new Map([
      ['a', new Set()],
      ['b', new Set(['a'])],
    ]);
    expect(describeCoupling('a', graph)).toEqual({ dependedOnBy: ['b'], dependsOn: [] });
    expect(describeCoupling('b', graph)).toEqual({ dependedOnBy: [], dependsOn: ['a'] });
  });

  it('a package with no incoming or outgoing edges is independent', () => {
    const graph = new Map([
      ['a', new Set()],
      ['b', new Set()],
    ]);
    expect(isIndependent('a', graph)).toBe(true);
  });

  it('a package with an outgoing edge is not independent', () => {
    const graph = new Map([
      ['a', new Set()],
      ['b', new Set(['a'])],
    ]);
    expect(isIndependent('b', graph)).toBe(false);
  });

  it('a package with only incoming edges is not independent', () => {
    const graph = new Map([
      ['a', new Set()],
      ['b', new Set(['a'])],
    ]);
    expect(isIndependent('a', graph)).toBe(false);
  });

  it('matches the real graph: ripple has dependents, is not independent', () => {
    const graph = readDependencyGraph(ROOT);
    expect(isIndependent('ripple', graph)).toBe(false);
    expect(describeCoupling('ripple', graph).dependedOnBy.length).toBeGreaterThan(0);
  });

  it('matches the real graph: a leaf package with no known dependents is independent', () => {
    const graph = readDependencyGraph(ROOT);
    // wayfinder has no @vielzeug deps and (per catalogue.md) nothing depends on it
    expect(isIndependent('wayfinder', graph)).toBe(true);
  });
});
