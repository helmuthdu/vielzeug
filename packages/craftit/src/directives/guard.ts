import { computed, isSignal, type ReadonlySignal, untrack } from '@vielzeug/stateit';

import type { HTMLResult } from '../internal';

type GuardDep = unknown | (() => unknown) | ReadonlySignal<unknown>;

type GuardRenderable = string | HTMLResult;

const resolve = (value: GuardDep): unknown => {
  if (typeof value === 'function') return (value as () => unknown)();

  if (isSignal(value)) return value.value;

  return value;
};

const depsEqual = (prev: unknown[], next: unknown[]): boolean => {
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index++) {
    if (!Object.is(prev[index], next[index])) return false;
  }

  return true;
};

/**
 * Memoizes rendering until the provided dependency tuple changes.
 */
export function guard(deps: GuardDep | GuardDep[], render: () => GuardRenderable): ReadonlySignal<GuardRenderable> {
  let initialized = false;
  let previousDeps: unknown[] = [];
  let cached: GuardRenderable = '';

  return computed(() => {
    const resolvedDeps = (Array.isArray(deps) ? deps : [deps]).map((dep) => resolve(dep));

    if (!initialized || !depsEqual(previousDeps, resolvedDeps)) {
      // untrack() prevents signals read inside render() from invalidating this
      // computed — only changes to the explicit dep array trigger re-renders.
      cached = untrack(render);
      previousDeps = resolvedDeps;
      initialized = true;
    }

    return cached;
  });
}
