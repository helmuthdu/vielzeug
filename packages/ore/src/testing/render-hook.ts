/**
 * renderHook: test composable hooks (lifecycle, reactive state, etc.) in isolation
 * without writing a component template.
 */

import type { InferProps, PropInputDefs } from '../props';
import { mount } from './mount';

export interface HookFixture<T> {
  /** Remove the host component; its cleanups run one microtask later, like `mount().dispose()`. Idempotent. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** The generated host component running the hook. */
  readonly element: HTMLElement;
  /** Flush pending reactive updates */
  flush(): Promise<void>;
  /** The value returned by the setup function */
  result: T;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

export interface RenderHookOptions {
  /** Register the host with `formAssociated: true`, for composables that call `useField()`. */
  formAssociated?: boolean;
}

/**
 * Run a setup function inside a real, generated host component and return its result.
 * Every lifecycle hook (`onMounted`, `onCleanup`, `onFormReset`, `useField`, ...) runs
 * exactly as it does in `define()`: the host is an ordinary Ore component.
 *
 * @example No props
 * ```ts
 * const { result } = await renderHook(() => {
 *   const count = signal(0);
 *   onMounted(() => { count.value = 1; });
 *   return count;
 * });
 * expect(result.value).toBe(1);
 * ```
 *
 * @example With props
 * ```ts
 * const { result } = await renderHook({ label: prop.string('hello') }, (props) => props.label);
 * expect(result.value).toBe('hello');
 * ```
 */
export async function renderHook<T>(
  setup: (_props: Record<never, never>) => T,
  options?: RenderHookOptions,
): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  propDefs: D,
  setup: (props: InferProps<D>) => T,
  options?: RenderHookOptions,
): Promise<HookFixture<T>>;
export async function renderHook<D extends PropInputDefs, T>(
  setupOrDefs: ((_props: Record<never, never>) => T) | D,
  setupOrOptions?: ((props: InferProps<D>) => T) | RenderHookOptions,
  maybeOptions?: RenderHookOptions,
): Promise<HookFixture<T>> {
  const hasPropDefs = typeof setupOrDefs !== 'function';
  const setup = (hasPropDefs ? setupOrOptions : setupOrDefs) as (props: unknown) => T;
  const options = (hasPropDefs ? maybeOptions : setupOrOptions) as RenderHookOptions | undefined;

  let result!: T;

  const fixture = await mount(
    (props) => {
      result = setup(props);

      return null;
    },
    {
      componentOptions: {
        formAssociated: options?.formAssociated,
        props: hasPropDefs ? (setupOrDefs as D) : undefined,
      },
    },
  );

  return {
    dispose: fixture.dispose,
    get disposed() {
      return fixture.disposed;
    },
    element: fixture.element,
    flush: () => fixture.flush(),
    result,
    [Symbol.dispose]: fixture.dispose,
  };
}
