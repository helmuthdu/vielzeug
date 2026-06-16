/**
 * renderHook — test composable hooks (lifecycle, reactive state, etc.) in isolation
 * without rendering a full component template.
 */

import { onCleanup as _onCleanup, scope as _scope } from '@vielzeug/ripple';

import type { SetupContextBag } from '../component-types';

import { createContextBag } from '../context-bag';
import { createProps, type InferProps, type PropInputDefs } from '../props';
import { runWithContext } from '../runtime';
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
 * The callback receives the same `SetupContextBag` as a real `setup()` function.
 *
 * @example No props
 * ```ts
 * const { result, flush } = await renderHook((_props, ctx) => {
 *   const count = signal(0);
 *   ctx.onMounted(() => { count.value = 1; });
 *   return count;
 * });
 * expect(result.value).toBe(1);
 * ```
 *
 * @example With props
 * ```ts
 * const { result } = await renderHook(
 *   { label: prop.string('hello') },
 *   (props) => props.label,
 * );
 * expect(result.value).toBe('hello');
 * ```
 */
export async function renderHook<T>(
  setup: (_props: Record<never, never>, ctx: SetupContextBag) => T,
): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  propDefs: D,
  setup: (props: InferProps<D>, ctx: SetupContextBag) => T,
): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  setupOrDefs: ((_props: Record<never, never>, ctx: SetupContextBag) => T) | D,
  maybeSetup?: (props: InferProps<D>, ctx: SetupContextBag) => T,
): Promise<HookFixture<T>> {
  const hasPropDefs = typeof setupOrDefs !== 'function';
  const propDefs = hasPropDefs ? (setupOrDefs as D) : undefined;
  const setup = hasPropDefs ? maybeSetup! : (setupOrDefs as (_props: Record<never, never>, ctx: SetupContextBag) => T);

  const hostScope = _scope();
  // Minimal host element so getCurrentElement() works inside setup
  const hostEl = document.createElement('div');

  document.body.appendChild(hostEl);

  const mountCallbacks: Array<() => void | (() => void)> = [];
  const ctx = { element: hostEl, mountCallbacks };

  let result!: T;

  try {
    hostScope.run(() => {
      runWithContext(ctx, () => {
        const contextBag = createContextBag(hostEl);
        const props = propDefs ? createProps(hostEl, propDefs as PropInputDefs) : ({} as Record<never, never>);

        result = setup(props as InferProps<D>, contextBag);
      });
    });

    // Run mount callbacks (simulates connectedCallback → queueMicrotask)
    for (const cb of mountCallbacks) {
      try {
        hostScope.run(() => {
          runWithContext(ctx, () => {
            const cleanup = cb();

            if (typeof cleanup === 'function') _onCleanup(cleanup);
          });
        });
      } catch {
        /* test will surface the error via result */
      }
    }
  } catch (err) {
    hostScope.dispose();
    hostEl.remove();
    throw err;
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
