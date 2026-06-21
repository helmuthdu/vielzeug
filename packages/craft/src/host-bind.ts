/**
 * Host element binding API — reactive attr, class, style, and event bindings
 * applied directly to the component's host element or any target element.
 */

import { isSignal, type Readable } from '@vielzeug/ripple';

import { effect, tryRegisterCleanup } from './runtime';
import { normalizeHostAttrKey } from './utils/aria';
import { listen, setAttr, toKebab } from './utils/dom';

/**
 * Describes a reactive or static host binding value.
 */
export type HostBindingValue =
  | (() => string | number | boolean | null | undefined)
  | Readable<string | number | boolean | null | undefined>
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Configuration for host attribute bindings.
 */
export type ReflectConfig = Record<string, HostBindingValue>;

type HostClassBindingValue = Readable<boolean> | (() => boolean) | boolean;
// Bivariant callback allows consumers to use narrower event types.
type HostEventListener = { bivarianceHack(event: Event): void }['bivarianceHack'];

export type HostBindConfig = {
  attr?: ReflectConfig;
  class?: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>;
  on?: Record<string, HostEventListener | undefined>;
  style?: Record<string, HostBindingValue>;
};

export type BindOptions = AddEventListenerOptions & {
  /**
   * Target element to bind to. Defaults to the host element when called
   * via `ctx.bind()`. Pass an explicit element to bind to any other element
   * (e.g. a slotted trigger or an internally-referenced child element).
   * When a target is provided, cleanup is always auto-registered with the
   * component scope if one is active.
   */
  target?: Element;
};

export type HostBindFn = (config: HostBindConfig, options?: BindOptions) => () => void;

export const createBind = (host: HTMLElement): HostBindFn => {
  const bind: HostBindFn = (config: HostBindConfig, options?: BindOptions): (() => void) => {
    const el = (options?.target as HTMLElement | undefined) ?? host;
    const disposers: Array<() => void> = [];

    if (config.attr) {
      for (const [key, value] of Object.entries(config.attr)) {
        const name = toHostAttr(key);
        const dispose = applyAttribute(el, name, value);

        if (dispose) disposers.push(dispose);
      }
    }

    if (config.class) {
      disposers.push(applyClassMap(el, config.class));
    }

    if (config.style) {
      for (const [key, value] of Object.entries(config.style)) {
        const dispose = applyStyle(el, key, value);

        if (dispose) disposers.push(dispose);
      }
    }

    if (config.on) {
      const { target: _t, ...listenerOptions } = options ?? {};

      for (const event of Object.keys(config.on) as Array<keyof typeof config.on>) {
        const listener = config.on[event];

        if (!listener) continue;

        disposers.push(listen(el, event as string, listener as EventListener, listenerOptions));
      }
    }

    const cleanup = (): void => {
      for (const dispose of disposers) dispose();
    };

    tryRegisterCleanup(cleanup);

    return cleanup;
  };

  return bind;
};

const toHostAttr = normalizeHostAttrKey;

const applyReactiveBinding = (
  value: HostBindingValue,
  updater: (next: string | number | boolean | null | undefined) => void,
): (() => void) | void => {
  if (typeof value === 'function') {
    return effect(() => updater(value()));
  }

  if (isSignal(value)) {
    return effect(() => updater(value.value));
  }

  updater(value);
};

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | void {
  return applyReactiveBinding(value, (next) => setAttr(host, name, next));
}

const UNSAFE_CSS_CHARS = /[;{}]/g;

function applyStyle(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | void {
  const cssName = (name.startsWith('--') ? name : toKebab(name)).replace(UNSAFE_CSS_CHARS, '');

  if (!cssName) return;

  let owned = false;
  const setStyle = (v: string | number | boolean | null | undefined): void => {
    if (v != null && v !== '') {
      owned = true;
      host.style.setProperty(cssName, String(v).replace(UNSAFE_CSS_CHARS, ''));
    } else if (owned) host.style.removeProperty(cssName);
  };

  return applyReactiveBinding(value, setStyle);
}

function applyClassMap(
  host: HTMLElement,
  value: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>,
): () => void {
  const getMap =
    typeof value === 'function'
      ? value
      : (): Record<string, boolean> => {
          const result: Record<string, boolean> = {};

          for (const [cls, entry] of Object.entries(value)) {
            result[cls] = typeof entry === 'function' ? entry() : isSignal(entry) ? entry.value : Boolean(entry);
          }

          return result;
        };

  let prev = new Set<string>();

  const sub = effect(() => {
    const next = new Set<string>();

    for (const [cls, active] of Object.entries(getMap())) {
      if (!active) continue;

      next.add(cls);

      if (!prev.has(cls)) host.classList.add(cls);
    }
    for (const cls of prev) {
      if (!next.has(cls)) host.classList.remove(cls);
    }
    prev = next;
  });

  return sub;
}
