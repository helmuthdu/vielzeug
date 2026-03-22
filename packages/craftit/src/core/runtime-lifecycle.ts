import {
  effect as _effect,
  onCleanup as _onCleanup,
  watch as _watch,
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Subscription,
  untrack,
  type WatchOptions,
} from '@vielzeug/stateit';

import { type CSSResult } from './utilities';

// ─── Component runtime ────────────────────────────────────────────────────────
export type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  errorHandlers: ((err: unknown) => void)[];
  onMount: (() => CleanupFn | undefined | void)[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

export const runtimeStack: ComponentRuntime[] = [];

export const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit:E1] lifecycle outside setup');

  return rt;
};

// ─── Lifecycle hooks ──────────────────────────────────────────────────────────
export const onMount = (fn: () => CleanupFn | undefined | void): void => {
  currentRuntime().onMount.push(fn);
};

/**
 * Registers a cleanup function.
 * - Inside a component setup or `onMount` callback: runs when the component
 *   unmounts. Prefer {@link onCleanup} for explicit lifecycle cleanup.
 * - Outside a component context (e.g. inside a plain `effect()`): delegates to
 *   stateit's `onCleanup`, which runs before each effect re-run.
 */
export const onCleanup = (fn: CleanupFn): void => {
  if (runtimeStack.length > 0) {
    currentRuntime().cleanups.push(fn);
  } else {
    _onCleanup(fn);
  }
};

/**
 * Registers a scoped error handler for this component.
 * Called when an unhandled error is thrown during setup, `onMount` callbacks,
 * or rendering. If no handler is registered, errors are logged to the console.
 *
 * @example
 * defineComponent({
 *   setup() {
 *     onError((err) => console.error('Component error:', err));
 *     // ... rest of setup
 *     return html``;
 *   },
 *   tag: 'my-component',
 * });
 */
export const onError = (fn: (err: unknown) => void): void => {
  currentRuntime().errorHandlers.push(fn);
};

/** @internal — Cleanup only when inside a component context. */
export const autoCleanup = (dispose: Subscription | CleanupFn): void => {
  if (runtimeStack.length > 0) onCleanup(dispose);
};

/**
 * Creates a reactive effect that re-runs whenever its signal dependencies change.
 * When called inside a component setup function or `onMount` callback, the effect is
 * automatically cleaned up when the component unmounts — no manual `onCleanup` needed.
 * Outside a component context, behaves identically to stateit's `effect`.
 *
 * @example
 * // Inside setup — auto-cleaned on unmount:
 * effect(() => { document.title = props.title.value; });
 *
 * // Inside onMount — also auto-cleaned:
 * onMount(() => { effect(() => syncExternal(data.value)); });
 */
export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = _effect(fn, options);

  autoCleanup(dispose);

  return dispose;
};

// ─── Watch ────────────────────────────────────────────────────────────────────
/**
 * Watch a signal or array of signals for changes and call a callback.
 * Auto-cleaned on unmount when called during setup.
 *
 * Single signal: callback receives (next, prev) values.
 * Multiple signals: callback receives no args, fires when any signal changes.
 */
export function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
export function watch(
  sources: ReadonlyArray<ReadonlySignal<unknown>>,
  cb: () => void,
  options?: WatchOptions<unknown>,
): Subscription;
export function watch(
  source: ReadonlySignal<unknown> | ReadonlyArray<ReadonlySignal<unknown>>,
  cb: ((value: unknown, prev: unknown) => void) | (() => void),
  options?: WatchOptions<unknown>,
): Subscription {
  if (Array.isArray(source)) {
    const opts = options;
    let initialized = false;
    let pendingDispose = false;
    const dispose = _effect(() => {
      for (const s of source) void s.value; // register all listed deps

      if (!initialized) {
        initialized = true;

        if (opts?.immediate) {
          untrack(cb as () => void);

          if (opts.once) {
            pendingDispose = true;

            return;
          }
        }
      } else {
        untrack(cb as () => void);

        if (opts?.once) dispose();
      }
    });

    autoCleanup(dispose);

    if (pendingDispose) dispose();

    return dispose;
  }

  const stop = _watch(source as ReadonlySignal<unknown>, cb as (value: unknown, prev: unknown) => void, options);

  autoCleanup(stop);

  return stop;
}

// ─── Event helpers ────────────────────────────────────────────────────────────
/**
 * Register an event listener with automatic cleanup on unmount.
 * Use inside onMount() for auto-cleanup, or handle() return value manually.
 *
 * @example
 * onMount(() => {
 *   handle(host, 'click', onClick);
 *   handle(window, 'resize', onResize);
 *   // auto-cleanup
 * });
 */
export function handle<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  if (!target) return;

  target.addEventListener(event, listener, options);
  onCleanup(() => target.removeEventListener(event, listener, options));
}

type FireDefaults = Pick<EventInit, 'bubbles' | 'cancelable' | 'composed'>;

export type FireApi = {
  basic(target: EventTarget, type: string, options?: EventInit): boolean;
  custom<Detail = unknown>(target: EventTarget, type: string, options?: CustomEventInit<Detail>): boolean;
  event(target: EventTarget, event: Event): boolean;
  focus(target: EventTarget, type: string, options?: FocusEventInit): boolean;
  keyboard(target: EventTarget, type: string, options?: KeyboardEventInit): boolean;
  mouse(target: EventTarget, type: string, options?: MouseEventInit): boolean;
  touch(target: EventTarget, type: string, options?: TouchEventInit): boolean;
};

const DEFAULT_FIRE_OPTIONS: FireDefaults = { bubbles: true, cancelable: true, composed: true };

const dispatchEvent = (target: EventTarget, event: Event): boolean => target.dispatchEvent(event);

/**
 * Dispatch DOM events explicitly without guessing constructors from the event name.
 *
 * @example
 * fire.mouse(el, 'click');
 * fire.keyboard(el, 'keydown', { key: 'Enter' });
 * fire.custom(el, 'change', { detail: { value: 42 } });
 * fire.event(el, new PointerEvent('pointerdown'));
 */
export const fire: FireApi = {
  basic(target, type, options = {}) {
    return dispatchEvent(target, new Event(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  custom<Detail = unknown>(target: EventTarget, type: string, options: CustomEventInit<Detail> = {}) {
    return dispatchEvent(target, new CustomEvent<Detail>(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  event(target, event) {
    return dispatchEvent(target, event);
  },
  focus(target, type, options = {}) {
    return dispatchEvent(target, new FocusEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  keyboard(target, type, options = {}) {
    return dispatchEvent(target, new KeyboardEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  mouse(target, type, options = {}) {
    return dispatchEvent(target, new MouseEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  touch(target, type, options = {}) {
    if (typeof TouchEvent !== 'undefined') {
      return dispatchEvent(target, new TouchEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
    }

    return dispatchEvent(target, new CustomEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
};

// ─── ARIA helpers ────────────────────────────────────────────────────────────
type AriaAttrValue =
  | (() => string | boolean | number | null | undefined)
  | string
  | boolean
  | number
  | null
  | undefined;

/**
 * Reactively set ARIA attributes on an element.
 *
 * - `aria(attrs)` — targets the component host (call during setup)
 * - `aria(target, attrs)` — targets any element; returns a cleanup function
 *
 * Pass getter functions for reactive values. Plain values are set once.
 * `null`, `undefined`, or `false` remove the attribute.
 *
 * @example
 * // Host (during setup):
 * aria({ role: 'checkbox', checked: () => checked.value });
 *
 * // Inner element (inside onMount):
 * onMount(() => {
 *   return aria(inputEl, { invalid: () => !!error.value });
 * });
 */
export function aria(attrs: Record<string, AriaAttrValue>): void;
export function aria(target: Element, attrs: Record<string, AriaAttrValue>): CleanupFn;
export function aria(
  targetOrAttrs: Element | Record<string, AriaAttrValue>,
  maybeAttrs?: Record<string, AriaAttrValue>,
): CleanupFn | undefined {
  const target = maybeAttrs !== undefined ? (targetOrAttrs as Element) : currentRuntime().el;
  const attrs = maybeAttrs !== undefined ? maybeAttrs : (targetOrAttrs as Record<string, AriaAttrValue>);

  const applyAttr = (name: string, val: AriaAttrValue) => {
    const attrName = `aria-${name}`;
    const value = typeof val === 'function' ? (val as () => AriaAttrValue)() : val;

    if (value === null || value === undefined || value === false) {
      target.removeAttribute(attrName);
    } else {
      target.setAttribute(attrName, String(value));
    }
  };

  // Each key gets its own effect so changes to one attr don't re-apply all others.
  const stops = Object.entries(attrs).map(([name, val]) => effect(() => applyAttr(name, val)));

  if (maybeAttrs !== undefined) {
    return () => {
      for (const stop of stops) stop();
    };
  }
}
