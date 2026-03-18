import { onCleanup as _onCleanup, effect as _effect, watch as _watch } from '@vielzeug/stateit';
import {
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Subscription,
  untrack,
  type WatchOptions,
} from '@vielzeug/stateit';

import { type CSSResult } from './css';

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
 * define('my-component', () => {
 *   onError((err) => console.error('Component error:', err));
 *   // ... rest of setup
 * });
 */
export const onError = (fn: (err: unknown) => void): void => {
  currentRuntime().errorHandlers.push(fn);
};

/** @internal — Registers a cleanup only when currently inside a component setup context. */
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

// ─── Watch (component-context-aware wrapper) ─────────────────────────────────
/**
 * Watches a Signal and calls cb with (next, prev) whenever its value changes.
 * Watches an array of Signals and calls cb (no args) whenever any of them changes.
 * When called inside a component setup function, the watcher is automatically
 * cleaned up when the component unmounts — no manual cleanup needed.
 *
 * **Implementation note — array overload asymmetry:**
 * The single-signal overload delegates to `stateit.watch`, which delivers `(next, prev)` pairs
 * via a subscription. The array overload uses an `effect()` with an initialisation flag because
 * `stateit.watch` does not accept multiple sources. The two mechanisms are intentionally
 * different — do not attempt to unify them, as the array form cannot useProvide prev values.
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
    const dispose = effect(() => {
      for (const s of source) void s.value; // register all listed deps

      if (!initialized) {
        initialized = true;

        if (opts?.immediate) {
          untrack(cb as () => void);

          if (opts.once) {
            dispose();

            return;
          }
        }
      } else {
        untrack(cb as () => void);

        if (opts?.once) dispose();
      }
    });

    return dispose;
  }

  const stop = _watch(source as ReadonlySignal<unknown>, cb as (value: unknown, prev: unknown) => void, options);

  autoCleanup(stop);

  return stop;
}

// ─── DOM event helper ─────────────────────────────────────────────────────────
/**
 * Registers an event listener on `target` and automatically removes it via {@link onCleanup} on unmount.
 * Must be called within an active lifecycle context — typically inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   handle(host, 'click', onClick);
 *   handle(host, 'keydown', onKeydown);
 *   // no return/cleanup needed
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

/**
 * Dispatches a DOM event from the target element.
 *
 * Automatically selects the appropriate event constructor (MouseEvent, KeyboardEvent, etc.)
 * based on the event name for common events.
 *
 * @example
 * fire(el, 'click');
 * fire(el, 'keydown', { key: 'Enter' });
 * fire(el, 'custom-event', { detail: { ok: true } });
 */
export function fire(target: EventTarget, type: string, options: EventInit | CustomEventInit = {}): boolean {
  const isCustom = 'detail' in options;
  let event: Event;

  if (isCustom) {
    event = new CustomEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else if (/^(click|dblclick|mouse|pointer|contextmenu|drag|drop)/.test(type)) {
    event = new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else if (/^key/.test(type)) {
    event = new KeyboardEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else if (/^(focus|blur)/.test(type)) {
    event = new FocusEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else if (/^touch/.test(type)) {
    event = new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else if (/^(input|change|submit|reset|invalid)/.test(type)) {
    event = new Event(type, { bubbles: true, cancelable: true, composed: true, ...options });
  } else {
    event = new CustomEvent(type, { bubbles: true, cancelable: true, composed: true, ...options });
  }

  return target.dispatchEvent(event);
}

// ─── aria() ───────────────────────────────────────────────────────────────
/** Value type accepted per ARIA attribute key: a getter function (for reactive tracking), a plain value, or null/undefined to remove. */
type AriaAttrValue =
  | (() => string | boolean | number | null | undefined)
  | string
  | boolean
  | number
  | null
  | undefined;

/**
 * Reactively sets ARIA attributes on an element.
 *
 * **Two call signatures:**
 * - `aria(attrs)` — targets the component host. Must be called during setup.
 * - `aria(target, attrs)` — targets any element; returns a cleanup function.
 *   When called inside {@link onMount}, returning the result is sufficient for auto-cleanup.
 *
 * Pass getter functions to make attributes reactive. Plain primitives are set once.
 * `null` / `undefined` / `false` remove the attribute.
 *
 * @example
 * // Host (during setup):
 * aria({ role: 'checkbox', checked: () => checked.value });
 *
 * // Inner element (inside onMount):
 * onMount(() => {
 *   return aria(inputRef.value!, {
 *     invalid: () => !!props.error.value,
 *     describedby: () => props.error.value ? errorId : helperId,
 *   });
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

    if (value === null || value === undefined) {
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
