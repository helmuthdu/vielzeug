import type { ScoutIndex } from './scout-index';

const revisions = new WeakMap<object, () => number>();

export function getIndexRevision<T>(index: ScoutIndex<T>): number {
  return revisions.get(index)?.() ?? 0;
}

export function registerIndexRevision<T>(index: ScoutIndex<T>, getRevision: () => number): void {
  revisions.set(index, getRevision);
}
