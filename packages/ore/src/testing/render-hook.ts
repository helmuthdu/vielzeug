/**
 * renderHook — test composable hooks (lifecycle, reactive state, etc.) in isolation
 * without rendering a full component template.
 */

import { onCleanup as _onCleanup, scope as _scope } from '@vielzeug/ripple';

import { OreLifecycleError, reportRuntimeError } from '../errors';
import { createProps, type InferProps, type PropInputDefs } from '../props';
import { runWithContext } from '../runtime';
import { flush } from './flush';

export interface HookFixture<T> {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** Teardown the hook (runs cleanups). Idempotent. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Flush pending reactive updates */
  flush(): Promise<void>;
  /** The value returned by the setup function */
  result: T;
}

/**
 * Run a setup function in a component-like context and return the result.
 * `onMounted`/`onCleanup`/`bind`/... work exactly as they would inside a real
 * `setup()`, since they resolve the same implicit current-component context.
 *
 * @example No props
 * ```ts
 * const { result, flush } = await renderHook(() => {
 *   const count = signal(0);
 *   onMounted(() => { count.value = 1; });
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
export async function renderHook<T>(setup: (_props: Record<never, never>) => T): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  propDefs: D,
  setup: (props: InferProps<D>) => T,
): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  setupOrDefs: ((_props: Record<never, never>) => T) | D,
  maybeSetup?: (props: InferProps<D>) => T,
): Promise<HookFixture<T>> {
  const hasPropDefs = typeof setupOrDefs !== 'function';
  const propDefs = hasPropDefs ? (setupOrDefs as D) : undefined;
  const setup = hasPropDefs ? maybeSetup! : (setupOrDefs as (_props: Record<never, never>) => T);

  const hostScope = _scope();
  // Minimal host element so getHost() works inside setup
  const hostEl = document.createElement('div');

  document.body.appendChild(hostEl);

  const mountCallbacks: Array<() => void | (() => void)> = [];
  const formResetCallbacks: Array<() => void> = [];
  const ctx = { element: hostEl, formResetCallbacks, mountCallbacks };

  let result!: T;

  try {
    hostScope.run(() => {
      runWithContext(ctx, () => {
        const props = propDefs ? createProps(hostEl, propDefs as PropInputDefs) : ({} as Record<never, never>);

        result = setup(props as InferProps<D>);
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
      } catch (error) {
        // Mirror BaseElement's real onMounted error handling (see
        // base-element.ts's `_scheduleMountCallbacks`): report the error
        // (console + `ore:error` event on the host) and keep running the
        // remaining callbacks, instead of hiding the failure entirely.
        const err = error instanceof Error ? error : new Error(String(error));

        reportRuntimeError(
          new OreLifecycleError(`renderHook() mount callback failed`, {
            cause: err,
            component: 'renderHook',
            phase: 'mounted',
          }),
          hostEl,
        );
      }
    }
  } catch (err) {
    hostScope.dispose();
    hostEl.remove();
    throw err;
  }

  await flush();

  let isDisposed = false;

  function dispose() {
    if (isDisposed) return;

    isDisposed = true;
    hostScope.dispose();
    hostEl.remove();
  }

  return {
    dispose,

    get disposed(): boolean {
      return isDisposed;
    },

    async flush() {
      await flush();
    },

    result,

    [Symbol.dispose]() {
      dispose();
    },
  };
}
