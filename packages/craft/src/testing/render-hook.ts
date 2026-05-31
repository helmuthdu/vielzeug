/**
 * renderHook — test composable hooks (lifecycle, reactive state, etc.) in isolation
 * without rendering a full component template.
 */

import { onCleanup as _onCleanup, scope as _scope } from '@vielzeug/ripple';

import { withRuntimeContext } from '../runtime';
import { flush } from './flush';

export interface HookFixture<T> {
  /** The value returned by the setup function */
  result: T;
  /** Flush pending reactive updates */
  flush(): Promise<void>;
  /** Teardown the hook (runs cleanups) */
  destroy(): void;
}

/**
 * Run a setup function in a component-like context and return the result.
 *
 * @example
 * ```ts
 * const { result, flush } = await renderHook(() => {
 *   const count = signal(0);
 *   onMounted(() => { count.value = 1; });
 *   return count;
 * });
 * expect(result.value).toBe(1);
 * ```
 */
export async function renderHook<T>(setup: () => T): Promise<HookFixture<T>> {
  const hostScope = _scope();
  // Create a minimal host element so getCurrentElement() works inside setup
  const hostEl = document.createElement('div');

  document.body.appendChild(hostEl);

  const mountCallbacks: Array<() => void | (() => void)> = [];
  const ctx = { element: hostEl, mountCallbacks };

  let result!: T;

  hostScope.run(() => {
    result = withRuntimeContext(ctx, () => setup());
  });

  // Run mount callbacks (simulates connectedCallback → queueMicrotask)
  for (const cb of mountCallbacks) {
    try {
      hostScope.run(() => {
        withRuntimeContext(ctx, () => {
          const cleanup = cb();

          if (typeof cleanup === 'function') _onCleanup(cleanup);
        });
      });
    } catch {
      /* test will surface the error via result */
    }
  }

  await flush();

  return {
    destroy() {
      hostScope.dispose();
      hostEl.remove();
    },
    async flush() {
      await flush();
    },
    result,
  };
}
