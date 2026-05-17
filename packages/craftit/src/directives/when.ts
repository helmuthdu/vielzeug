import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../internal';

type MaybeReactive<T> = T | (() => T) | ReadonlySignal<T>;

type WhenRenderable = string | HTMLResult;

const resolve = <T>(value: MaybeReactive<T>): T => {
  if (typeof value === 'function') return (value as () => T)();

  if (isSignal(value)) return value.value;

  return value;
};

/**
 * Conditionally renders one of two branches.
 */
export function when(
  condition: MaybeReactive<boolean>,
  truthy: () => WhenRenderable,
  falsy?: () => WhenRenderable,
): ReadonlySignal<WhenRenderable> {
  return computed(() => {
    if (resolve(condition)) return truthy();

    return falsy ? falsy() : '';
  });
} // Note: when returns HtmlResult (not DirectiveResult)
